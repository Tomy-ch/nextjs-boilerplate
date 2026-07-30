---
name: repo-ops
description: Operational runbook for this repository's recurring, easy-to-trip-on gotchas around the mise-managed toolchain, the pnpm lockfile, the Makefile setup targets, the scratch directories, and the lefthook git hooks. Read-only knowledge skill — it tells you the exact command to run; it does not silently mutate state. This is deliberately a SPARSE STARTER for the Next.js boilerplate: it carries only the gotchas that genuinely exist today (mise / pnpm / make DRY_RUN / scratch paths / lefthook hooks), and grows as new operational traps are discovered (in contrast to the go-boilerplate original, whose items were mostly Docker / sqlc / DB-runner specific and do not apply here — ADR 0011 no-docker). Triggers: "make install-tools が mise not found で落ちる", "DRY_RUN はどのターゲットで効くのか", "setup-repo を試しに実行したい", "pnpm install --frozen-lockfile が落ちる", "mise.toml を変えた後の反映", "pnpm のスクリプトが ERR_PNPM_IGNORED_BUILDS で落ちる", "pnpm-workspace.yaml に覚えのない allowBuilds が付いている", "スクラッチ出力をどこに置くか", "commit が commitlint に弾かれる", "hook が command not found で落ちる".
---

# Repo Ops Runbook

Concrete recovery + procedure steps for the operational gotchas that recur in this repo. This is a
**lookup table, not a workflow**: find the symptom, run the fix. When a step is destructive or touches a
root file, say so to the user first per `CLAUDE.md`.

> **Scope note.** This runbook is intentionally sparse. The go-boilerplate `repo-ops` it was adapted
> from centred on Docker tool-runners, `sqlc` / `schema.gen.sql`, root-owned generated dirs, and a
> live DB — **none of which exist here** ([0011](../../../docs/adr/0011-no-docker.md); no DB;
> presentation layer only). Only the
> genuinely-present traps are listed below. Add an item when a new one bites — do not port the
> Go-specific ones back in.

## 1. `make install-tools` fails with `mise not found`

`make install-tools` runs `mise install`, which reads `[tools]` from `mise.toml` (ADR 0003). It first
checks that `mise` itself is on `PATH` and exits with a message if not.

Fix: install `mise` (see <https://mise.jdx.dev/>), then re-run.

```bash
make install-tools     # installs Node.js + pnpm per mise.toml, then prints both versions
```

Rule of thumb: **mise is the SSOT for Node.js / pnpm versions.** After anyone changes `mise.toml`
(e.g. a `node-upgrade`), run `make install-tools` to bring the local toolchain in line, then confirm
with a bare `node --version` / `pnpm --version` from an activated shell. If either disagrees with
`mise.toml`, `PATH` is answering for something else — §2.

## 2. A bare `pnpm` is a different pnpm — scripts fail, `pnpm-workspace.yaml` changes on its own

`mise.toml` pins pnpm (ADR 0003), but a bare `pnpm` resolves through `PATH`, so a system-wide install
(Homebrew, a global npm install, Corepack) shadows the pinned one. A pnpm one major ahead of the pin
then behaves in two ways that both point the blame somewhere else:

- **The script never runs.** pnpm 11 checks dependency freshness before a script and shells out to
  `pnpm install`, which stops on the repo's unapproved build scripts — `ERR_PNPM_IGNORED_BUILDS`
  naming `esbuild` / `lefthook` / `sharp`, or, in the non-interactive shell an agent or CI has,
  `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` because it wants to purge a `node_modules` the other
  major wrote. The stack ends in `runDepsStatusCheck`, which is the tell: the gate failed, not
  `lint:ci` / `typecheck` / `md-lint`.
- **It edits a tracked root config.** pnpm 11 prepends a placeholder block to `pnpm-workspace.yaml`:

  ```yaml
  allowBuilds:
    esbuild: set this to true or false
    lefthook: set this to true or false
    sharp: set this to true or false
  ```

  Nothing announces this, so it rides along into `git status` and can reach a PR. `pnpm-workspace.yaml`
  is a root config outside the default AI Modification Scope — it is not yours to change in passing.

Compare the two resolutions; they should agree:

```bash
pnpm --version     # what PATH found
mise which pnpm    # the binary mise.toml pins
which -a pnpm      # who is shadowing whom
```

Recover by fixing `PATH`, not by wrapping the command:

```bash
git restore pnpm-workspace.yaml     # drop the allowBuilds block if it landed
eval "$(mise activate zsh)"         # put the pinned toolchain first (bash: mise activate bash)
pnpm lint:ci                        # then run it bare, as AGENTS.md prescribes
```

If the wrong pnpm already reinstalled `node_modules`, the pinned pnpm refuses to take it back with the
same `..._NO_TTY` abort. `CI=true` answers the purge prompt for it:

```bash
CI=true pnpm install --frozen-lockfile
```

`mise activate` in the shell is the whole fix — it is what makes a bare command resolve to the pin.
`mise exec -- <command>` is **forbidden** as a way around this (ADR 0003): it would repair one call while
leaving the `PATH` that broke it in place, and every caller that forgets the wrapper hits the same
failure. There is no wrapped spelling anywhere in this repository — not in `.lefthook.yaml`, not in
`.makefiles/`.

Hooks resolve through the same `PATH` you do, so a shell holding the wrong pnpm hands it to the hooks as
well (§7) — **a commit failing in `lint:ci` can be this, not your diff**. The `runDepsStatusCheck` frame
in the stack is what separates the two.

Moving the pin to the newer pnpm is `tools-upgrade`'s decision, not a workaround for this; it also
requires filling `allowBuilds` with real values rather than the placeholders.

## 3. `DRY_RUN` does nothing on `make setup-repo`

`DRY_RUN=1` gates only the two replacement helpers. `make setup-repo` never reads it, so there is **no
way to preview** what it will do.

```bash
DRY_RUN=1 make setup-replace-license-copyright COPYRIGHT_HOLDER='Example Inc.'  # preview
DRY_RUN=1 make setup-replace-repository-reference REPOSITORY=org/app           # preview
DRY_RUN=1 make setup-repo                                                      # ⚠️ runs for real
```

`1` is the only value that enables the dry run; anything else (including `DRY_RUN=0`) writes.

`make setup-repo` is a one-time repository-initialization target and is **destructive**: it deletes
every existing tag locally and on `origin`, deletes every release note except `v0.0.0.md`, removes the
`upstream` remote, and creates + pushes `v0.0.0` and the three protected branches. Confirm with the
user before running it, and never run it against an already-initialized repo (it aborts if `v0.0.0`
exists).

## 4. `pnpm install --frozen-lockfile` fails — lockfile out of sync

Per ADR 0001, `pnpm-lock.yaml` **must be committed** and kept in sync with `package.json`. A CI-style
`--frozen-lockfile` install fails when they diverge (e.g. a dependency was edited without re-locking).

Fix: re-lock and commit the lockfile in the same change as the `package.json` edit.

```bash
pnpm install                 # updates pnpm-lock.yaml to match package.json
git add package.json pnpm-lock.yaml
```

Rule of thumb: **any change to `package.json` dependencies requires committing the regenerated
`pnpm-lock.yaml` alongside it.** (`package.json` is a protected root config — dependency edits need an
explicit user instruction; per [0004](../../../docs/adr/0004-library-management.md), a dependency
*major* goes in its own PR.)

## 5. biome: `pnpm lint` vs `pnpm fix` (ADR 0002)

biome is the single formatter/linter (ESLint / Prettier are not used — ADR 0002). Two entry points:

```bash
pnpm fix       # biome check --fix : auto-fix what can be fixed
pnpm lint      # biome check       : report remaining errors (fix these by hand)
pnpm format    # biome format --write : formatting only
```

`noConsole` is `warn` by default — **do not leave `console.log` in commits** (AGENTS.md / ADR 0002).
Fix items the auto-fixer cannot handle by hand; do not sprinkle `// biome-ignore` (prefer a scoped
`overrides` in `biome.json`, which is a protected root config = user instruction).

## 6. Scratch output belongs under `tmp/`, and stays out of git

`/tmp` is ignored by `.gitignore`, so the following never reach `git status`:

- `tmp/reviews/` — `full-verify` / `full-apply` finding sets
- `tmp/<name>.md` — symlinks to work-plan documents whose real files live outside the repo

These are scratch output, not source: do not force them in with `git add -f`. A scratch file that
must survive belongs outside the repo, referenced through a symlink under `tmp/`.

**Worktrees belong outside the repository**, in a sibling directory (`<repo>.worktrees/<name>/`) —
`git worktree add ../<repo>.worktrees/<name>`. A checkout placed inside the tree lands in the scan
surface of every tool that walks it (markdownlint / mermaid-lint / skill-lint / trivy) and has to be
excluded from each one; a sibling directory needs no exclusion anywhere, and none is written.

## 7. A commit or push is rejected by a hook (lefthook)

Hooks are declared in `.lefthook.yaml` (ADR 0151) and are **not** registered by `pnpm install` —
`pnpm exec lefthook install` must be run once after cloning. Hooks live in the common git dir, so a
worktree inherits them; what a worktree does **not** inherit is `node_modules`, so run `pnpm install`
in it or every hook fails with `command not found`.

| Stage | Entry point | What it checks |
| --- | --- | --- |
| pre-commit | `pnpm lint:ci`; `pnpm md-lint` when `*.md` is staged; `make actionlint` when a workflow is staged | biome full profile; markdownlint + mermaid syntax + `.claude/**` semantics (`skill-lint`); workflow syntax + `run:` shell |
| commit-msg | `make commitlint` | the subject against ADR 0150 |
| pre-push | `pnpm typecheck`; `make secret-scan` | `tsc --noEmit`; secrets in the range being pushed (**fail-closed**) |

`make trivy-fs` is deliberately **not** wired into any hook (on demand only). A dependency vulnerability
cannot be resolved by the pusher on the spot and its status changes independently of the diff, so it does
not hold as a gate — reporting goes to the PR comment and blocking to the promotion gate (ADR 0110 3.1).

Reproduce a stage by running its entry point by hand — bare, from an activated shell. The exact
argument lists live in `.lefthook.yaml` — read them there rather than from a copy.

```bash
make secret-scan
```

Every command in `.lefthook.yaml` is written bare — `mise exec --` is forbidden there like everywhere
else (ADR 0003 / 0151). A hook dying with `❌ <tool> が PATH にありません` while `mise ls` shows the tool
installed is therefore an environment report, not a hook bug: the shell that launched `git` does not have
the activated `PATH`. Fix it at the source — `make install-tools`, then activate mise in that shell. For
a launcher that never sources a profile (a GUI git client, an agent shell, CI), put mise's **shims**
directory on `PATH` instead (`mise activate --shims`, i.e. `~/.local/share/mise/shims`); the shims
resolve the same pins without a per-call wrapper. Do not wrap the entry to make this one caller pass.

A `secret-scan` failure is not retryable: the secret is inside the commit range being pushed, so it has
to come out of the history.

A commit-msg failure means the subject is not `<Prefix>: <subject>` with one of the 11 prefixes of
ADR 0150, the subject is empty, or it ends with `。`. `commitlint.config.ts` deliberately omits
`type-case` — the prefixes mix `Feat` and `CI`, so no single case rule fits. Merge and revert commits
are skipped by commitlint's default ignores.

To check a message without committing:

```bash
echo "Feat: 説明" | pnpm exec commitlint
```

## Constraints

- ✅ Read-only knowledge: surface the exact command; run it only when the user asked you to perform the
  operation.
- ✅ Warn before destructive steps (tag/branch deletion in §3) per `CLAUDE.md`.
- ✅ Confirm with the user before editing root files (`biome.json` in §5, `package.json` in §4) —
  they are outside the default AI Modification Scope. §2's `git restore pnpm-workspace.yaml` is the
  exception: it discards an unrequested machine edit rather than making one.
- ❌ Do not port the go-boilerplate Docker / sqlc / DB items here — they do not apply
  ([0011](../../../docs/adr/0011-no-docker.md)).
