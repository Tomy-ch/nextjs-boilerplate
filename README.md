# nextjs-boilerplate

A **Next.js / React presentation-layer boilerplate**. The backend (DB / authentication / business
logic) is a separate repository or service; this repo owns the presentation layer only and deploys to
a PaaS or a static CDN — no Docker ([ADR 0011](docs/adr/0011-no-docker.md)).

The toolchain, lint / format, git hooks, security scans and documentation operation are already
wired, and every convention is written down as an ADR rather than left implicit.

> This README is intentionally minimal. Each topic links out to the document that owns it — see the
> [Documentation Map](#documentation-map). Those documents are the source of truth; this page is only
> the entry point.

## What is wired

Each item is a seam you extend; follow the link for the decision and its rules.

- **pnpm only**, lockfile committed — [ADR 0001](docs/adr/0001-package-manager.md)
- **mise as the single source of truth for tool versions** ([`mise.toml`](mise.toml)) — [ADR 0003](docs/adr/0003-version-manager.md)
- **biome-first lint / format**, ESLint only for what biome cannot express — [ADR 0002](docs/adr/0002-formatter-linter.md)
- **Git hooks via lefthook** (pre-commit / commit-msg / pre-push) — [ADR 0151](docs/adr/0151-git-hooks.md)
- **Local security scans** (gitleaks / Trivy) and their suppression policy — [ADR 0110](docs/adr/0110-security-operations.md)
- **GitHub Actions definition lint** (actionlint + shellcheck) — [ADR 0153](docs/adr/0153-ci-configuration.md)
- **Branch / commit / release workflow** — [ADR 0150](docs/adr/0150-git-workflow.md)
- **Repository operations as `make` targets** — [`.makefiles/README.md`](.makefiles/README.md)

## Prerequisites

- [mise](https://mise.jdx.dev) — tool / runtime version manager (**required**, and it must be activated in your shell; the `make` targets resolve tools through it)
- GitHub CLI (`gh`) — required by the repository-operation targets (`make setup-repo`, release targets)

## Quick Start

```bash
git clone https://github.com/Tomy-ch/nextjs-boilerplate.git
cd nextjs-boilerplate

# 1. Install mise (https://mise.jdx.dev/getting-started.html), then activate it in your shell.
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc   # bash: append `mise activate bash` to ~/.bashrc
# Open a new terminal so the mise shims are on PATH.

# 2. Install the pinned toolchain, the dependencies, and the git hooks.
make install-tools
pnpm install
pnpm exec lefthook install   # not automatic — run it once after cloning

# 3. Start the dev server.
pnpm dev
```

Open <http://localhost:3000>; editing `src/app/page.tsx` hot-reloads the page.

Forking this boilerplate into a new project needs a few more steps (repository initialization, name
and copyright replacement) — see [`.makefiles/README.md`](.makefiles/README.md).

## Commands

Application commands are `package.json` scripts run through pnpm; repository operations and toolchain
setup are `make` targets.

```bash
pnpm dev / build / start        # develop, build, serve
pnpm lint / lint:ci / fix       # biome — editor profile, full profile, autofix
pnpm typecheck                  # tsc --noEmit
pnpm md-lint                    # markdownlint + mermaid syntax check

make help                       # every make target, with its description
```

`make help` is the inventory — it lists every target from `.makefiles/**` and warns about any that is
undocumented. [`.makefiles/README.md`](.makefiles/README.md) explains what each one does.

## Documentation Map

The source of truth lives next to what it governs. Start here and follow the link that owns your
topic.

- [AGENTS.md](AGENTS.md) — the operating rules for AI coding agents, and the repository-wide rule summary
- [docs/adr/](docs/adr/) — architecture decision records; every convention in this repo is one of these
- [docs/adr/BACKLOG.md](docs/adr/BACKLOG.md) — decision areas that are still open
- [.makefiles/README.md](.makefiles/README.md) — every `make` target
- [.claude/skills/](.claude/skills/) — the repeatable operations packaged as Claude Code skills
