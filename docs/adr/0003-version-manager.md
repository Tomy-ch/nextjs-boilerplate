# Tool and Language Version Management Policy

This project adopts `mise.toml` as the **single source of truth (SSOT) for version declarations** of tools and language runtimes (Node.js / pnpm, etc.).

[mise](https://mise.jdx.dev/) is used on the host and on CI as the default install backend that reads this SSOT, and on CI it is confined to one place, the composite action `.github/actions/setup-mise`. It is not brought into Docker. This avoids excessive dependence on mise while aligning the developer experience and CI versions on the single `mise.toml`.

## Status

Accepted

## Rationale

### 1. Consolidating Version Declarations into an SSOT

The single `mise.toml` file declares "the target tools and their pinned versions" together.
Declarations split per tool or per purpose, such as the following, are not kept.

- `.node-version` / `.nvmrc`
- A YAML tool list plus a custom script that syncs it into `.makefiles/*.mk`
- Embedding the pnpm version via corepack (`packageManager` in `package.json`)

Because the declaration is one file, a review can see "which tool is at which version" in one place.

`packageManager` + Corepack is not merely redundant. Corepack becomes a second supply route putting the same `pnpm` on PATH alongside mise, the pin splits into two places, and the SSOT breaks. If the non-activated `pnpm` runs, the repository itself opens the accident route in which a bare pnpm rewrites `pnpm-workspace.yaml` on its own (the `repo-ops` skill). It could be added only once mise has a mechanism that reads `packageManager` and reconciles it with its own pin so nothing is managed twice. An accident caused by invoking a bare pnpm is not a reason — that is a mistake in the execution path, not a missing declaration.

### 2. Vendor Lock-in Resistance — a File That Reads as a Specification

`mise.toml` is a plain TOML declaration file, and even without using mise's features it reads directly as the specification "install Node.js 24.14.1 / pnpm 10.33.0".

Even if mise declines or is discontinued in the future, the following hold.

- `mise.toml` can remain as a specification file (readable by humans and tools)
- The scope of a switch is limited to the **delivery layer** (the implementation of `make install-tools` and CI's `setup-mise`)
- `mise` is not scattered into Docker or developers' everyday commands, and CI calls are confined to `setup-mise`, so the cost of withdrawal is confined to the contract layer and one CI entry point

mise's current share is on par with asdf / nodenv / nvm / volta and the like, so lock-in is limited to keep the repository reusable.

### 3. Realistic as the Default Backend for Host Installs

Start-up cost is low when handling many kinds of tools. Even for just Node.js / pnpm, shell activation automates PATH switching, so there is less friction than with an operation such as `.node-version` plus a manual `nodenv install`.

## Structure — the Three-Layer Model

```text
┌──────────────────────────────────────────────────────────────────┐
│ SSOT layer      :  mise.toml                                     │
│   └ declares tool and language versions (single source of truth) │
├──────────────────────────────────────────────────────────────────┤
│ Contract layer  :  Makefile                                      │
│   └ make install-tools / make actions-pin-check, etc.            │
│     the I/F developers call; implementation swaps converge here  │
├──────────────────────────────────────────────────────────────────┤
│ Delivery layer  :  a separate implementation per layer           │
│   ├ host    : mise install                                       │
│   ├ Docker  : peripheral services only (digest-pinned, no mise)  │
│   └ CI      : setup-mise (composite) → mise install              │
└──────────────────────────────────────────────────────────────────┘
```

Responsibilities of each layer:

| Layer | Responsibility | How often it changes |
| --- | --- | --- |
| SSOT (`mise.toml`) | Declares versions | Only on tool updates |
| Contract (Makefile) | Provides a stable I/F to developers | Almost never |
| Delivery (mise / Docker / CI) | Obtains the binaries and puts them on PATH | When an environment is added or when moving away from mise |

Dependence on mise is confined to **the host part of the delivery layer and CI's `setup-mise`**. mise commands are not scattered into the SSOT, the contract, or other delivery routes.

## mise.toml as the SSOT

```toml
[tools]
"core:node" = "24.14.1"
"aqua:pnpm/pnpm" = "10.33.0"
"aqua:rhysd/actionlint" = "1.7.12"
"aqua:gitleaks/gitleaks" = "8.30.1"
```

- Versions are specified down to the patch (for reproducibility)
- **Every entry states its backend (`core:` / `aqua:`, etc.) explicitly.** mise's registry maps one short name to several backends, and which one is the default can change at the registry's convenience. Written as a short name, such a swap **does not show up as a change of source; a different distribution gets installed while neither the version nor the lockfile moves**. Stating it explicitly makes the SSOT declare "what, and from where"
  - **Apply it uniformly.** If it is required only for some tools, readers cannot tell "a deliberate line" from "an omission", and it stops working as a convention
  - A decision to stop stating it can come only from the premises — either mise starts guaranteeing the registry mapping outside the declaration, or a case appears of an environment where the explicit backend cannot be resolved. Verbosity is not a reason
  - What this protects against is only a swap of the registry mapping. Tampering with the distribution itself is handled by mise's default checksum / cosign verification. The two are different layers, and neither substitutes for the other
- Additional features that presuppose mise's functionality (task definitions `[tasks]` / environment variables `[env]`, etc.) are not placed here. To keep the SSOT pure, mise-specific extras are handled in a separate file / the Makefile
- **There is no sync check for version declarations. Reversal condition: a version declaration appears in a second place outside `mise.toml`.** This repository has no Docker ([0011](0011-no-docker.md)), so there is only one declaration, and CI tools are read from `mise.toml` by `setup-mise`, so there is no copy. mise's own version, which cannot be written in `mise.toml`, is held by `setup-mise`, and `make actions-mise-pin-lint` checks its consistency with the digest / cache key in the same action. A version that a workflow pins on its own for a tool outside `mise.toml` has no sync counterpart and is out of scope. **"Something else holds it" is not the condition** — a sync check only means something once a second thing that must be synced exists

## Handling the Delivery Layer

### host (Developer Workstations)

- mise is recommended as the default backend. `make install-tools` is the entry point
- If you prefer not to use mise, for example in personal development, it is enough to swap the `install-tools` target in `.makefiles/tools/setup.mk` for a different implementation (nodenv / volta, etc.). The SSOT (`mise.toml`) stays readable as is

### Docker

- **No `Dockerfile` that runs the application itself is bundled** ([0011](0011-no-docker.md)). So the problem of reconciling the tag of a delivered image with `mise.toml` does not arise
- **Only the peripheral services that support development** (the observability stack / a development IdP, etc.) run in containers. mise is not brought into them — to avoid spreading the mise dependency into the delivery layer
- Images for peripheral services are **pinned by digest, not tag**, and the pinned values are held by a lockfile (`make images-pin-check` fails on a diff). No step has a human copying them

### CI

- **CI's entry point is the single composite action `.github/actions/setup-mise`.** It installs a digest-verified mise binary and runs `mise install` for only the tools the job names, at the versions in `mise.toml`. A job passes only tool names, and versions come only from `mise.toml`, so no copy of a version arises on the CI side
- Confining the entry point to one exists so that obtaining, verifying and caching the mise binary is held in one place ([0153](0153-ci-configuration.md) explains how the runtime is supplied to CI, including why `actions/setup-node` is not adopted). mise is not called directly from a workflow's `run:`
- Jobs may **read** `mise.toml`, but `mise.toml` itself and `make install-tools` are not rewritten on CI

## Basic Commands

| Operation | Command |
| --- | --- |
| Set up the tool set (recommended entry point) | `make install-tools` |
| Install directly as mise.toml says | `mise install` |
| The currently resolved versions | `mise current` |
| List installed | `mise ls` |
| Check for updates | `mise outdated` |

## Version Update Flow

1. Edit `mise.toml` and rewrite the version
2. Obtain the binaries with `mise install` (or `make install-tools`)
3. After verifying it works, include the change in a PR

## Prohibitions

- ❌ Managing `mise.toml` twice with another version manager (it breaks the SSOT) (Enforcement: Prose — **mechanizable** (a gate checks for the presence of `.nvmrc` / `.node-version` / `.tool-versions` and for `packageManager` / `volta` in `package.json`. No rule exists))
- ❌ Scattering mise commands into the delivery layer (`RUN mise install ...` in a Dockerfile, calling `mise` in a CI job without going through `setup-mise`, etc.). Docker is completed with each environment's native means, and CI is confined to the single `setup-mise` (Enforcement: Prose — **mechanizable** (detect `mise` calls in workflow `run:` and in `docker/**/Dockerfile`, excluding `.github/actions/setup-mise`. No rule exists))
- ❌ Putting mise-specific task / environment variable definitions into `mise.toml` (to keep the SSOT pure) (Enforcement: Prose — **mechanizable** (a gate reads `mise.toml` as TOML and checks that it has no `[tasks]` / `[env]` tables. No rule exists))
- ❌ Obtaining npm packages through the `npm:` backend. npm packages via mise appear neither in the lockfile nor in `pnpm audit`, and become a second npm supply route that bypasses [0001](0001-package-manager.md)'s single route and the cooldown quarantine. Anything that runs on Node is obtained with `pnpm add -DE` ([0156](0156-browser-observation-tooling.md) sets out how such tools are obtained). This is revisited only when pnpm stops providing the cooldown, the lockfile, and the rejection of registries that do not return a publish time; "consolidating into mise gives one SSOT" is not a reason — binaries and npm packages differ in both their distribution route and their means of quarantine (Enforcement: Prose — **mechanizable** (a gate checks that no `[tools]` key in `mise.toml` starts with `npm:`. No rule exists))
- ❌ **Wrapping commands in `mise exec -- <command>` (banned outright).** It is used nowhere: not in commands typed by hand, `.lefthook.yaml` hooks, `.makefiles/` recipes or scripts. It creates two ways to write one command, and which one is right becomes unreadable. Moreover, wrapping hides a PATH defect only inside that one call, so the same failure passes to the next caller that forgets to wrap (Enforcement: Prose — **partly mechanizable**. `mise exec` in `.lefthook.yaml` / `.makefiles/` / scripts / workflows could be caught by spelling, but no rule exists. Commands typed by hand never appear in code)
- ❌ Major-only or minor-only version specifications (reproducibility degrades) (Enforcement: Prose — **mechanizable** (a gate checks that each value in `mise.toml`'s `[tools]` is a three-part version down to the patch. No rule exists))

## Notes

- **Commands are invoked bare, assuming activation.** After `make install-tools`, finish shell activation and run `node` / `pnpm` / mise-managed tools directly. The same holds when typing by hand and inside `.lefthook.yaml` hooks or `.makefiles/` recipes ([0151](0151-git-hooks.md))
- If a tool invoked bare disagrees with mise's pin or is missing from PATH, **the environment is broken**. Fix activation and PATH. The `repo-ops` skill holds real examples of the breakage and the recovery steps
- **Execution environments that do not go through `mise activate` (git hooks launched from GUI clients / agent shells / CI) align by putting the shims directory (`~/.local/share/mise/shims`) on PATH** (`mise activate --shims`). As with interactive shells, resolution is fixed on the PATH side and is never reduced to per-call wrapping
- Entry points that call tools (hooks / make recipes / scripts) check `command -v <tool>` up front, and if it is missing, fail with a prompt to run `make install-tools` and activate. Rather than wrapping to make it run, they name the missing environment on the spot
- Developers who do not use mise may also refer to the declarations in `mise.toml` and align the same versions with their own version manager (reading the SSOT as a specification)
- If the project moves away from mise in the future, the scope of impact is two things: the `install-tools` target in `.makefiles/tools/setup.mk` and CI's `.github/actions/setup-mise`

## Related ADRs

- [0001-package-manager.md](0001-package-manager.md) — the pnpm policy (refers to `mise.toml` as the medium for version declarations)
