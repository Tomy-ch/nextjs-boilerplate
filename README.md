This is a [Next.js](https://nextjs.org) presentation-layer boilerplate. See [AGENTS.md](AGENTS.md) and [docs/adr/](docs/adr/) for repository rules and architectural decisions.

## Getting Started

This repository uses **pnpm only** (npm / yarn are forbidden — [ADR 0001](docs/adr/0001-package-manager.md)). Tool versions are managed by mise ([ADR 0003](docs/adr/0003-version-manager.md)).

```bash
make install-tools        # install node / pnpm / gitleaks / trivy via mise
pnpm install              # install dependencies
pnpm exec lefthook install  # register git hooks (required — see below)
```

Then run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Git Hooks (lefthook)

Git hooks are managed by [lefthook](https://github.com/evilmartians/lefthook) ([0151](docs/adr/0151-git-hooks.md)). They are **not** registered automatically by `pnpm install` — run `pnpm exec lefthook install` once after cloning.

| Hook | Command | Purpose |
| --- | --- | --- |
| pre-commit | `pnpm lint:ci` | biome full profile (`biome.ci.jsonc`, warnings block) |
| pre-commit | `pnpm md-lint` | markdownlint + mermaid syntax check (`*.md` only) |
| commit-msg | `make commitlint` | commit subject prefix check (`commitlint.config.ts`, [0150](docs/adr/0150-git-workflow.md)) |
| pre-push | `pnpm typecheck` | `tsc --noEmit` |
| pre-push | `make secret-scan` | gitleaks over the commits about to be pushed — blocks the push on detection |
| pre-push | `make trivy-fs` | Trivy — reports vulnerable dependencies, does not block |

Commit subjects must be `<Prefix>: <subject>`, where `<Prefix>` is one of `Feat` / `Fix` / `Refactor` / `Perf` / `Docs` / `Test` / `Build` / `CI` / `Chore` / `Style` / `Revert` — e.g. `Feat: ログインフォームを追加`. The subject must not end with `。`. Any other prefix, an empty subject, or a trailing `。` fails the `commit-msg` hook.

Do not habitually bypass hooks with `--no-verify` (see the ADR for the exception policy).

## Security Scans

Secret and dependency scanning run locally through mise-managed binaries ([ADR 0110](docs/adr/0110-security-operations.md)).

```bash
make secret-scan          # gitleaks — scan the commits about to be pushed (exits non-zero on detection)
make secret-scan-history  # gitleaks — scan the entire commit history (too slow for a hook)
make trivy-fs             # Trivy — report fixable CRITICAL/HIGH/MEDIUM vulnerabilities in dependencies
```

`secret-scan` scans a **commit range** (commits reachable from `HEAD` but absent from every remote), not the working tree. A working-tree snapshot would both miss a secret that was committed and later deleted from the tree, and falsely flag gitignored local files such as `env/.env.local` that are never pushed.

Findings are suppressed only through the dedicated policy files, never by disabling a rule wholesale:

| File | Suppression unit |
| --- | --- |
| `.gitleaks.toml` | detection ruleset and path-level allowlist |
| `.gitleaksignore` | a single finding, by fingerprint (`<path>:<rule-id>:<line>`) |
| `.trivyignore.yaml` | a single vulnerability ID, scoped to explicit paths |

Every entry must carry the reason it is acceptable, and must be removed once that reason no longer holds. Each file states the policy in its header. Note that these files do not cover everything that is excluded: gitleaks' bundled default ruleset carries its own global allowlist (lockfiles, `node_modules`, `.svg`) which cannot be overridden from `.gitleaks.toml` — see [ADR 0110](docs/adr/0110-security-operations.md).

## Commands

```bash
pnpm lint      # biome check (light profile / editor equivalent)
pnpm lint:ci   # biome check, full profile (CI / pre-commit)
pnpm fix       # biome check --fix
pnpm format    # biome format --write
pnpm typecheck # tsc --noEmit
pnpm md-lint   # markdownlint + mermaid syntax check
pnpm build     # production build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy

This boilerplate targets PaaS / static CDN deployment (Vercel / Netlify / AWS Amplify / Cloudflare Pages — no Docker, see [ADR 0011](docs/adr/0011-no-docker.md)).
