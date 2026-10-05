---
test-requirement: unit
coverage-exclusions:
  - "commitlint.config.ts"
  - "eslint.config.ts"
  - "knip.ts"
  - "orval.config.ts"
  - "playwright*.config.ts"
  - "vitest.config.ts"
  - "vitest.scripts.config.ts"
  - "architecture.ts"
  - "*.d.ts"
---

# nextjs-boilerplate

**A presentation-layer application base for Next.js / React.** The backend (DB / authentication /
business logic) is owned by a separate repository or service; this repository takes on the
presentation layer only and deploys to a PaaS or a static CDN (no Docker —
[ADR 0011](docs/adr/0011-no-docker.md)).

The toolchain, lint / format, git hooks, security scanning and documentation operations are already
wired, and every convention is written down as an ADR rather than left as tacit knowledge.

It runs on **Next.js 16 / React 19**. APIs, conventions and file layout differ from slightly older
Next.js, and the rendering model in particular turns stale assumptions straight into mistakes
(`"use client"` is a bundle boundary, not "render this on the client"). The terms, and the mistakes
they lead to, are listed in [docs/design/rendering.md](docs/design/rendering.md).

> This README is intentionally minimal. The source of truth sits next to what it governs, and each
> topic is delegated to a link to the document that owns it (see the
> [Documentation Map](#documentation-map)). This page is only the entry point.

## Capabilities

Each item is a seam you extend. The decision and its conventions are behind the link.

- **pnpm only** (the lockfile must be committed) — [ADR 0001](docs/adr/0001-package-manager.md)
- **mise as the SSOT for tool versions** ([`mise.toml`](mise.toml)) — [ADR 0003](docs/adr/0003-version-manager.md)
- **biome-first lint / format** (ESLint only for checks biome cannot express) — [ADR 0002](docs/adr/0002-formatter-linter.md)
- **git hooks via lefthook** (pre-commit / commit-msg / pre-push) — [ADR 0151](docs/adr/0151-git-hooks.md)
- **Local security scanning** (gitleaks / Trivy) and the suppression policy — [ADR 0110](docs/adr/0110-security-operations.md)
- **Lint for GitHub Actions definitions** (actionlint + shellcheck) — [ADR 0153](docs/adr/0153-ci-configuration.md)
- **Per-story visual regression** (captured in a digest-pinned Playwright container) — [ADR 0091](docs/adr/0091-test-verification-methods.md) / [`vrt/README.md`](vrt/README.md) / [mechanism](docs/design/vrt.md)
- **Branch / commit / release operations** — [ADR 0150](docs/adr/0150-git-workflow.md)
- **make targets for repository operations** — [`.makefiles/README.md`](.makefiles/README.md)

## Scope & Non-goals

Which team and which system this repository is designed for, and the uses it does not anticipate,
are stated in [docs/project/scope.md](docs/project/scope.md).

What it **deliberately leaves out** is listed in
[docs/project/out-of-scope.md](docs/project/out-of-scope.md): what belongs to another domain (the
backend or infrastructure), non-functional tool choices it does not hold, and what depends on the use
case and is not decided here. Each is a deliberate boundary, not a gap.

## Prerequisites

- [mise](https://mise.jdx.dev) — tool / runtime version manager (**required**; activate it in your shell. The `make` targets resolve tools through mise)
- GitHub CLI (`gh`) — needed by the repository-operation targets (`make setup-repo`, the release targets)

## Quick Start

```bash
git clone https://github.com/Tomy-ch/nextjs-boilerplate.git
cd nextjs-boilerplate

# 1. Install mise (https://mise.jdx.dev/getting-started.html) and activate it in your shell.
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc   # for bash, append `mise activate bash` to ~/.bashrc
# Open a new terminal so the mise shims are on PATH.

# 2. Install the pinned toolchain, the dependencies and the git hooks.
make install-tools
pnpm install
pnpm exec lefthook install   # not installed automatically; run it once after cloning

# 3. (Optional) Install the assets for AI coding assistants. Not on the required path for development or build.
pnpm exec tsx scripts/bootstrap-plugins           # official plugins
pnpm exec tsx scripts/bootstrap-external-skills   # external skills (graphify)

# 4. Start the development server.
pnpm dev
```

Open <http://localhost:3000> to see it. Editing `src/app/page.tsx` is reflected automatically.

<!-- boilerplate-only:begin -->
## Using This as a Template

When creating a new project with **Use this template**, follow
[`docs/get-started/setup-repository.md`](docs/get-started/setup-repository.md) from the top. It holds
only the order and the places that need a person; the content of each step is owned by the document
it points to.

The statements that hold only while this is the upstream template, and the markers that let a script
remove them, are in
[`docs/get-started/boilerplate-only-conventions.md`](docs/get-started/boilerplate-only-conventions.md).

<!-- boilerplate-only:end -->
## Defaults to Review When Adopting

An index of the defaults supplied here that **are bound to be false for a different backend, a
different organization or a different visual design**. The default values and how to change them are
held by the document that owns each. The order of setup and the places that need a person are held by
[`docs/get-started/setup-repository.md`](docs/get-started/setup-repository.md).

| Category | What | Where |
| --- | --- | --- |
| Contract | The coordinates for fetching the backend contract, and the inputs and outputs of generation | [openapi](openapi/README.md#what-to-change-when-adopting) |
| Contract | Value ranges the contract cannot express, and the wiring of references that cross endpoints | [mocks](mocks/README.md#what-to-change-when-adopting) |
| Environment | Endpoints for the API, IdP, image delivery and telemetry, secrets, and limits along the path | [env](env/README.md#what-to-change-when-adopting) |
| External connections | The IdP replacement points | [adapters/server/auth](src/adapters/server/auth/README.md#replacement-points) |
| External connections | The time, attempt count and circuit-breaking conditions allowed for an outbound round trip | [adapters/server/http](src/adapters/server/http/README.md#what-to-change-when-adopting) |
| External connections | The third-party origins the delivery headers allow | [config](src/config/README.md#what-to-change-when-adopting) |
| External connections | The shape of the extra information a backend error carries | [errors](src/errors/README.md#what-to-change-when-adopting) |
| Operations | The set of required checks, the protected branches, notification destinations, scheduled runs, and which credential-bearing checks to keep | [.github/workflows](.github/workflows/README.md#what-to-change-when-adopting) |
| Operations | The store for VRT baseline images, and the credential CI uses to write to it | [vrt](vrt/README.md#what-to-change-when-adopting) |
| Visual design | Color, spacing, shape and typeface, and the color-scheme and family axes | [tokens](tokens/README.md#what-to-change-when-adopting) |
| Visual design | The site's identity (name, description, icon mark) | [app](src/app/README.md#what-to-change-when-adopting) |
| Visual design | UI components. They are a reference implementation and may be replaced | [components](src/components/README.md#what-is-here-is-a-reference-implementation) |
| Authorization | The protected routes, and the roles allowed into them | [model](src/model/README.md#what-to-change-when-adopting) |
| Bundled sample | What disappears from the cross-screen tests when the sample is discarded | [e2e](e2e/README.md#what-disappears-when-the-bundled-sample-is-purged) <!-- sample:line --> |

**This table holds no default values.** A value placed in two locations lets one of them fall behind,
so the source of truth is always the linked document
([ADR 0140](docs/adr/0140-documentation-operations.md)).

## Non-obvious Operations

Most of it is what it looks like, but in a few places **you get stuck unless you know the procedure**.
Only names and links are given here.

- **CI's toolchain is verified by digest** — mise's own version cannot be written in `mise.toml`, so
  [`.github/actions/setup-mise`](.github/actions/setup-mise/action.yaml) holds the version and SHA256
  and verifies them before running. How to upgrade it:
  [`.github/workflows/README.md`](.github/workflows/README.md#installing-mise)
- **VRT baseline images live in a separate repository** — `baseline/images` is a submodule, and its
  content sits in a store that holds images only. Retakes do not go through until you prepare your
  own store (see above). The reason and the operation are in [`vrt/README.md`](vrt/README.md)

When you get stuck, look in [`.claude/skills/repo-ops`](.claude/skills/repo-ops/SKILL.md).

## Development Workflow

Application-side commands run the `package.json` scripts through pnpm. Repository operations and
toolchain maintenance are handled by `make` targets.

```bash
pnpm dev / build / start        # dev / build / production start (build and start take APP_ENV)
pnpm lint / lint:ci / fix       # biome — editor-equivalent / full / auto-fix
pnpm typecheck                  # tsc --noEmit
pnpm lint:md                    # markdownlint + mermaid syntax check

make help                       # every make target and its description
```

`make help` is the source of the list. It enumerates every target in `.makefiles/**` and warns about
any without a description comment. What each target does is in
[`.makefiles/README.md`](.makefiles/README.md).

## Documentation Map

Start here and follow the link that owns your topic.

### Core

- [docs/get-started/](docs/get-started/) — the steps from creating a repository from the template to getting it running (the order, and the places that need a person)
- [AGENTS.md](AGENTS.md) — operating rules for AI coding agents. It holds no conventions itself; it points to which document owns what
- [docs/README.md](docs/README.md) — the routing that decides which document a piece of design knowledge goes to
- [docs/adr/README.md](docs/adr/README.md) — the log of architecture decision records (ADRs). The full list with one-line summaries lives only here
- [docs/rules.md](docs/rules.md) — the implementation rules that bind every change (layer boundaries / data classification / forms / comments / how work is run)
- [docs/testing-conventions.md](docs/testing-conventions.md) — testing conventions
- [docs/spec/README.md](docs/spec/README.md) — specifications: what the implementation promises
- [docs/project/README.md](docs/project/README.md) — what this repository is and is not: scope, non-goals, policy, versions, direction
- [docs/reference/README.md](docs/reference/README.md) — inventories that change in step with the code

### Design

- [docs/design/](docs/design/README.md) — the criteria for deciding an individual case (rendering / data fetching / authentication / observability and more)
- [docs/playbook.md](docs/playbook.md) — look up, from what you want to implement, where it goes and how to verify it
- [docs/tutorial/](docs/tutorial/README.md) — one path that assembles something working, climbing the layers in order

### Layer READMEs

- [app](src/app/README.md) · [features](src/features/README.md) · [components](src/components/README.md) · [model](src/model/README.md) · [adapters](src/adapters/README.md)
- [capabilities](src/capabilities/README.md) · [stores](src/stores/README.md) · [config](src/config/README.md) · [errors](src/errors/README.md) · [logging](src/logging/README.md) · [observability](src/observability/README.md)

### Contracts, data & tooling

- [openapi/README.md](openapi/README.md) — importing the backend's API contract
- [mocks/README.md](mocks/README.md) — contract-driven mocks generated from the contract
- [env/README.md](env/README.md) — per-environment variables
- [tokens/README.md](tokens/README.md) — the SSOT for design tokens
- [e2e/README.md](e2e/README.md) — verification through screens, in a real browser
- [vrt/README.md](vrt/README.md) — per-story visual regression against baseline images
- [scripts/README.md](scripts/README.md) — tools that check, generate and operate on the repository
- [.makefiles/README.md](.makefiles/README.md) — every `make` target
- [.github/workflows/README.md](.github/workflows/README.md) — the CI / CD workflow definitions
- [docs-viewer/README.md](docs-viewer/README.md) — the viewer for the documentation portal
- [.claude/README.md](.claude/README.md) — configuration assets for Claude Code (skills / agents / permission boundaries / external skills)

## Stack

The direct dependencies, grouped by the single responsibility each one carries, are inventoried in
[docs/reference/dependencies.md](docs/reference/dependencies.md); `package.json` is authoritative for
versions. The criteria for adopting a dependency are [ADR 0004](docs/adr/0004-library-management.md).

## Branch Strategy

The project follows Semantic Versioning. A version is named by its release branch `release/v<X.Y.Z>`,
and tags are placed on the `production` HEAD — [docs/project/versioning.md](docs/project/versioning.md).
Branch, commit and release operations: [ADR 0150](docs/adr/0150-git-workflow.md).

## Security

**Reporting a vulnerability** — do not open a public issue. Use GitHub's Private Vulnerability
Reporting as described in [SECURITY.md](SECURITY.md), which also states the response process.

## License

Released under the **MIT License** — see [LICENSE](LICENSE).
