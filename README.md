This is a [Next.js](https://nextjs.org) presentation-layer boilerplate. See [AGENTS.md](AGENTS.md) and [docs/adr/](docs/adr/) for repository rules and architectural decisions.

## Getting Started

This repository uses **pnpm only** (npm / yarn are forbidden — [ADR 0001](docs/adr/0001-package-manager.md)). Tool versions are managed by mise ([ADR 0003](docs/adr/0003-version-manager.md)).

```bash
make install-tools        # install node / pnpm via mise
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
| pre-push | `pnpm typecheck` | `tsc --noEmit` |

Do not habitually bypass hooks with `--no-verify` (see the ADR for the exception policy).

## Commands

```bash
pnpm lint      # biome check (light profile / editor equivalent)
pnpm lint:ci   # biome check, full profile (CI / pre-commit)
pnpm fix       # biome check --fix
pnpm format    # biome format --write
pnpm typecheck # tsc --noEmit
pnpm build     # production build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy

This boilerplate targets PaaS / static CDN deployment (Vercel / Netlify / AWS Amplify / Cloudflare Pages — no Docker, see [ADR 0011](docs/adr/0011-no-docker.md)).
