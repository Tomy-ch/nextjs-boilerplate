<!-- BEGIN:nextjs-agent-rules -->
# Agents Documentation

Repository rules for **AI coding agents** (Claude Code / Codex / Copilot / Gemini, etc.) working in this repo.

## Project Overview

This repository is a **Next.js / React presentation-layer boilerplate**.

- **Role**: Frontend presentation layer
- **Target deployment**: PaaS (Vercel / Netlify / AWS Amplify / Cloudflare Pages) or static CDN
- **Backend** (DB / authentication / business logic) is operated as a separate repository / service

See [docs/adr/0004-no-docker.md](docs/adr/0004-no-docker.md) for details.

### This is NOT the Next.js you know

This project adopts Next.js 16 / React 19, so APIs, conventions, and file structure may differ from your training data. Before writing any code, read the relevant guide under `node_modules/next/dist/docs/` and heed deprecation notices.

## Instruction Priority

Follow instructions in this order. If conflicts occur, the higher-priority document wins.

1. **AGENTS.md** (this file) — Repository-wide operational rules
2. **`docs/adr/000?-*.md`** — Accepted architectural decisions (ADRs)
3. **`docs/adr/BACKLOG.md`** — Pending decision areas + de facto state
4. **`.github/copilot-instructions.md`** and other agent-specific configs
5. User instructions

## Accepted Rules (ADRs)

ADRs under `docs/adr/` are the authoritative source. This file only summarizes them.

| ADR | Area | Summary |
| --- | --- | --- |
| [0001](docs/adr/0001-package-manager.md) | Package manager | Adopt pnpm / lockfile must be committed / npm and yarn forbidden |
| [0002](docs/adr/0002-formatter-linter.md) | Formatter / Linter | Unify on biome / ESLint and Prettier not adopted |
| [0003](docs/adr/0003-version-manager.md) | Version manager | `mise.toml` as SSOT / mise must not extend into delivery layers |
| [0004](docs/adr/0004-no-docker.md) | Delivery / Role | Next.js as presentation layer / no Docker for app delivery |
| [0005](docs/adr/0005-library-management.md) | Library policy | Core deps exact-pinned / major updates in separate PRs / `pnpm audit` required |
| [0006](docs/adr/0006-git-workflow.md) | Git workflow | Branch strategy / commit convention / PR operations / release process |
| [0007](docs/adr/0007-git-hooks.md) | Git hooks | pre-commit / pre-push via lefthook |

## Pending Decisions

A large set of decisions (overall architecture / responsibility separation / directory structure / state management / error handling / testing strategy / CI configuration, etc.) is **not yet settled**. See [`docs/adr/BACKLOG.md`](docs/adr/BACKLOG.md).

For areas where implementation cannot proceed without a decision, this file holds **`## [TODO]` sections** as provisional placeholders. Each TODO section specifies (1) **what must be decided** and (2) **provisional behavior until decided**.

When a change forces you to enter a pending area:

1. Check the relevant `[TODO]` section's "provisional behavior" and stay within it
2. **Do not introduce new conventions, patterns, or libraries on your own**. Defer the ADR decision to the user
3. If a provisional implementation is unavoidable, explicitly tell the user it is a "provisional implementation" before starting work

---

## [TODO] Overall Architecture Pattern

> **Pending** — BACKLOG A1

**Must be decided**:

- Overall pattern (feature-sliced design / layered / vertical slice / custom pattern, etc.)
- Patterns that will not be adopted, and why
- Overall dependency direction (which layer may import from which)

**Provisional behavior until decided**:

- Do not create pattern-specific directory names (`domain/` / `usecase/` / `presentation/` from DDD / Onion / Hexagonal, etc.) on your own
- Do not enforce pattern-specific dependency constraints (e.g., "`domain` may not import anything external") in code on your own
- Do not introduce helpers or abstractions that presuppose a new architecture pattern

---

## [TODO] Backend Role Separation

> **Pending** — BACKLOG A2 (concretization of [ADR 0004](docs/adr/0004-no-docker.md))

**Must be decided**:

- Responsibilities Next.js holds (UI / auth token exchange / BFF / aggregation, etc. — up to which line)
- Contract with the backend (REST / GraphQL / RPC) and where the API spec SSOT lives
- Where domain logic resides (presumed backend, but the concrete boundary is undefined)

**Provisional behavior until decided**:

- Do not write business logic in `/api/*` routes (only thin proxy / token exchange is allowed)
- Do not add DB connection code or ORM libraries under `src/` (consistent with ADR 0004)
- Do not duplicate the backend API spec as hand-written types in `src/`

---

## [TODO] Frontend Responsibility Separation

> **Pending** — BACKLOG A3

**Must be decided**:

- Whether layer concepts (`components` / `hooks` / `features` / `lib`, etc.) exist and their responsibilities
- Dependency direction between layers (which may import from which)
- Boundary-violation prohibitions (e.g., "components do not fetch directly", "side effects are concentrated in hooks")

**Provisional behavior until decided**:

- Before adding a new directory directly under `src/`, **confirm with the user**
- Do not add layer-presuming helpers on your own (e.g., importing from `src/components/` inside `src/features/`)

---

## [TODO] Routing & Rendering Strategy

> **Pending** — BACKLOG A4 (de facto: App Router adopted / `src/app/` structure)

**Must be decided**:

- Default and boundary of Server Components vs Client Components (where to place `"use client"`)
- CSR / SSR / SSG / ISR usage policy
- Whether to adopt Server Actions
- Use of dynamic / static / catch-all routes
- Placement of `loading.tsx` / `error.tsx`

**Provisional behavior until decided**:

- Default to Next.js App Router behavior (Server Components)
- Keep `"use client"` additions minimal and document the reason in the commit message
- Do not add Pages Router (App Router only)

---

## [TODO] Directory Structure

> **Pending** — BACKLOG A5 (de facto: `src/` + tsconfig `@/*` alias)

**Must be decided**:

- Physical layout under `src/` (`components/` / `hooks/` / `features/` / `lib/` / `utils/`, etc.)
- Co-location policy (whether tests / Storybook / styles sit alongside their target files)
- Granularity of shared modules (per-file vs per-folder)

**Provisional behavior until decided**:

- Keep new directory creation minimal; **confirm with the user** when needed
- Stay within structures that fit on top of the existing `src/app/`
- Use the tsconfig `@/*` alias for import paths

---

## [TODO] Naming Convention

> **Pending** — BACKLOG A6

**Must be decided**:

- File names (kebab-case vs PascalCase usage)
- Naming for React components / hooks / types / constants
- App Router route segment names (dynamic `[slug]` / catch-all `[...slug]`, etc.)
- Test file extensions (consistent with the test ADR (B8))

**Provisional behavior until decided**:

- Follow the naming of existing files (`src/app/layout.tsx` / `src/app/page.tsx`)
- Do not mix cases (follow App Router's convention = lowercase)
- Do not introduce new patterns on your own

---

## [TODO] Environment Variable Management

> **Pending** — BACKLOG A7

**Must be decided**:

- Structure of the `env/` directory (`env/.env.{local,ci,dev,stg,prd}` etc.)
- Whether to have a typed Config loader and its design (`src/config/`, etc.)
- `NEXT_PUBLIC_` boundary (which variables are allowed to leak to the browser)
- Secret management boundary (mapping to Vercel / Amplify secret stores)

**Provisional behavior until decided**:

- Adding an environment variable requires **user confirmation**
- Do not read `.env*` files directly; stay with Next.js's standard `process.env`
- Do not expose secret variables under a `NEXT_PUBLIC_` prefix

---

## [TODO] Styling Strategy

> **Pending** — BACKLOG B1 (de facto: Tailwind v4 + `postcss.config.mjs` + `src/app/globals.css`)

**Must be decided**:

- Design token management (Tailwind config / CSS variables, etc.)
- Adoption and placement of `clsx` / `cn()` helpers
- Boundary between global and local styles
- Explicit non-adoption policy for alternatives (CSS Modules / styled-components, etc.)

**Provisional behavior until decided**:

- Default to Tailwind utility classes for styling
- **Do not introduce** CSS Modules / styled-components / emotion, etc. on your own
- Avoid piling rules into `globals.css`; first check whether utilities cover it

---

## [TODO] BFF / API Integration

> **Pending** — BACKLOG B3 (start after A1 / A2 / A4 / A5 are settled)

**Must be decided**:

- Responsibility scope of `/api/*` (thin proxy / token exchange / session management / aggregation, etc.)
- Location of external API clients (e.g., `src/lib/api/`)
- fetch wrapper layer (retry / timeout / error transformation / logging)
- Use of Server Actions

**Provisional behavior until decided**:

- Do not scatter ad-hoc fetch code inside components
- Do not duplicate external API schemas in multiple places under `src/`
- Do not introduce custom retry / timeout implementations on your own (use the standard `fetch` as is)

---

## [TODO] Type Generation (API Schema)

> **Pending** — BACKLOG B4

**Must be decided**:

- Whether API types are **generated** from OpenAPI / GraphQL schema or hand-written
- Generator choice (openapi-typescript / oapi-codegen / graphql-codegen, etc.)
- Location of generated artifacts and the "do not edit" rules

**Provisional behavior until decided**:

- Do not duplicate API types in multiple places under `src/`
- Do not hand-write files that should be treated as generated (minimize hand-written types before the generator is introduced)

---

## [TODO] State Management

> **Pending** — BACKLOG B5

**Must be decided**:

- Whether to adopt Server state (TanStack Query, etc.) and where to place it
- Whether to adopt Client state (Zustand / Jotai / Context API) and where to place it
- Whether to adopt Form state (react-hook-form, etc.)
- URL state (search params / route params) usage policy

**Provisional behavior until decided**:

- Do not introduce global state libraries (Redux / Zustand / Jotai, etc.) on your own
- Avoid Context overuse; start with local state (`useState` / `useReducer`)
- Default Server state to `fetch` inside a Server Component

---

## [TODO] Error Handling

> **Pending** — BACKLOG B6

**Must be decided**:

- Responsibilities of App Router's `error.tsx` / `not-found.tsx` / `global-error.tsx`
- Error Boundary hierarchy and granularity
- Normalization policy for backend errors (HTTP status → user-facing message)
- Timing of logging emission

**Provisional behavior until decided**:

- Do not add `error.tsx` and similar special files on your own; let App Router's defaults run
- Confirm with the user before placing custom Error types under `src/lib/`

---

## [TODO] Observability / Logging

> **Pending** — BACKLOG B7

**Must be decided**:

- Structured log schema and destination (browser → BFF relay vs direct external SaaS)
- Adoption of Sentry / Datadog / Honeycomb, etc.
- Adoption of OpenTelemetry
- Trace ID propagation policy

**Provisional behavior until decided**:

- Do not add observability SaaS SDKs (Sentry / Datadog, etc.) on your own
- Do not leave `console.log` calls in commits (biome's `noConsole: warn` is enabled by default / ADR 0002)

---

## [TODO] Testing Strategy

> **Pending** — BACKLOG B8

**Must be decided**:

- Test framework selection (Vitest / Jest / Playwright)
- Per-layer responsibilities (unit / component / integration / e2e)
- Coverage targets and their scope
- Placement and naming convention (co-location / `__tests__` / extension)
- Server Components testing policy

**Provisional behavior until decided**:

- Do not add a test framework to `package.json` on your own
- When tests become necessary, **propose ADR formalization to the user**
- If existing skills (`.claude/skills/`) cover testing, follow their instructions

---

## [TODO] CI Configuration

> **Pending** — BACKLOG B9

**Must be decided**:

- GitHub Actions job partitioning (lint / typecheck / test / build / e2e units)
- Required check specification
- Caching strategy (pnpm store / Next.js build cache)
- Matrix (Node.js versions / OS)
- Overlap boundary with hooks ([ADR 0007](docs/adr/0007-git-hooks.md))

**Provisional behavior until decided**:

- Do not add new workflows under `.github/workflows/` on your own
- Prioritize **running lint / typecheck / build locally**

---

## [TODO] Security Operations

> **Pending** — BACKLOG B10 (extension of [ADR 0005](docs/adr/0005-library-management.md))

**Must be decided**:

- `pnpm audit` threshold (response SLA for high / critical)
- Adoption and configuration of Dependabot or Renovate
- Whether to maintain `SECURITY.md` and reporting channels
- Adoption of secret scanning (gitleaks, etc.)

**Provisional behavior until decided**:

- Always run `pnpm audit` when adding new dependencies (ADR 0005)
- Do not embed security tools (Dependabot / Renovate / gitleaks, etc.) into CI / pre-commit on your own

## AI Modification Scope

By default, AI agents may modify code only in the following scope. All other paths require an explicit user instruction.

### Allowed

- Under `src/`
- `public/` (asset additions)
- `docs/adr/BACKLOG.md` (progress tracking / adding new slots; ADR file creation requires a prior user instruction)

### Do not touch without user instruction

- Repository-root config files: `package.json` / `tsconfig.json` / `next.config.ts` / `mise.toml` / `biome.json` / `postcss.config.mjs` / `Makefile`, etc.
- `.makefiles/` (release / branch operation make targets)
- `.github/` (workflows / settings / issue and PR templates)
- `LICENSE`
- Accepted ADR bodies (`docs/adr/0001-*.md` through `docs/adr/0007-*.md`)

### Agent configuration file protection

Each agent's configuration must not be touched even by that agent itself. Modification requires an explicit user instruction:

- Claude Code: `.claude/` (`.claude/skills/` / `.claude/settings.json` / `.claude/settings.local.json`, etc.)
- OpenAI Codex CLI: `.agents/skills/`
- Cursor: `.cursor/` (including `.cursor/rules/*.mdc`) / `.cursorrules`
- GitHub Copilot: `.github/copilot-instructions.md` / `.github/instructions/` / `.github/prompts/`
- Gemini CLI / Code Assist: `.gemini/` / `GEMINI.md`

This file (`AGENTS.md`) is shared **Protected Documentation** across all agents (see the later "Protected Documentation" section).

### Exception: Skill Execution

When the user invokes a skill (e.g., Claude Code's `/<skill-name>`), the invocation itself counts as an **explicit instruction**. While the skill runs, AI Modification Scope is relaxed strictly within the scope the skill's `SKILL.md` declares.

Conditions:

- The relaxation applies **only for the duration of the skill execution**, only within the scope the skill declares
- The skill's `SKILL.md` user-confirmation instructions (e.g., confirm before editing specific paths) must still be honored
- The following remain protected **even during skill execution**:
  - `AGENTS.md` (this file)
  - Accepted ADR bodies
  - `LICENSE`
  - Paths listed under `.claude/settings.json`'s `permissions.deny`

Bypassing the spirit of these rules through a skill is forbidden. If a skill's procedure touches sensitive areas (e.g., `.github/workflows/`), the skill's `SKILL.md` must declare this so the user is aware when invoking it.

## Recommended Commands

### pnpm (ADR 0001)

```bash
pnpm install               # Install dependencies
pnpm add <pkg>             # Add a runtime dependency
pnpm add -D <pkg>          # Add a dev dependency
pnpm add -E <pkg>          # Add with exact pin (for core deps / main dev tools, ADR 0005)

pnpm dev                   # Start the dev server
pnpm build                 # Production build
pnpm start                 # Start the production server

pnpm lint                  # biome check (ADR 0002)
pnpm fix                   # biome check --fix
pnpm format                # biome format --write
```

### make (Tool setup / release / branch operations)

```bash
make install-tools         # Install tools via mise (ADR 0003)
make branch-patch          # Create a release/v<patch> branch
make branch-minor          # Create a release/v<minor> branch
make branch-major          # Create a release/v<major> branch
make hotfix-patch          # Create a hotfix/v<patch> branch
make tag-patch             # Tag production HEAD and create a GitHub Release
make tag-minor             # Same (minor)
make tag-major             # Same (major)
```

See [`.makefiles/README.ja.md`](.makefiles/README.ja.md) for details.

## Git Rules

[ADR 0006](docs/adr/0006-git-workflow.md) is authoritative. Key points only.

### Critical Rules

1. **No direct push** to protected branches (`production` / `staging` / `develop` / `release/**` / `hotfix/**`)
2. **No force push / rebase / squash** unless the user explicitly instructs it
3. After amending commits on an existing PR branch, **confirm with the user before pushing**. Use this exact confirmation message: 「変更はローカルにコミット済みです。これらの変更をプルリクエストにプッシュしますか？」
4. History rewrites (`git commit --amend` + force push / `git rebase`) are forbidden. Stack fixes as **new commits**.

### Branch Naming

```text
feature/<issue-no>-<kebab-description>     e.g., feature/1234-add-login-form
bugfix/<issue-no>-<kebab-description>      e.g., bugfix/5678-fix-route-handler
hotfix/<issue-no>-<kebab-description>      e.g., hotfix/9012-cache-invalidation
release/v<X.Y.Z>                            e.g., release/v0.1.0
```

If no issue number exists, use only `<kebab-description>`.

### Commit Convention

All commit subjects start with one of the following prefixes:

```text
Feat | Fix | Refactor | Perf | Docs | Test | Build | CI | Chore | Style | Revert
```

Format: `<Prefix>: <Japanese subject>` (no trailing period `。` on the subject).

Examples:

```text
Docs: ADR 0004 を Type A / Type B 区別で補強
Build: Dockerfile を削除し pnpm 採用方針と整合させる
Fix: route handler の query 取得を Next.js 16 API に合わせる
```

### Pull Request

- Fill in `概要` / `変更内容` / `動作確認方法` of the template (`.github/pull_request_template.md`)
- Titles are in Japanese
- Default merge strategy is **merge commit** (`squash` is exceptional)
- A push to an existing PR auto-dismisses prior approvals — request re-review after pushing

## Language Rules

AI agents may perform internal processing (code analysis / reasoning / tool calls, etc.) in English.

However, visible outputs written to the repository and responses to the user follow the language rules below.

### Output Language

Unless the user explicitly directs otherwise, all visible outputs must be written in **Japanese**.

Targets:

- Responses to the user
- Code comments
- PR titles and bodies
- Commit messages
- Documentation (canonical EN / translated JA pair operation will be defined by BACKLOG D1)
- Test `describe` / `it` strings (details follow once the test ADR (BACKLOG B8) is settled)
- Inline documentation generated by the AI

Technical terms (HTTP status code names / API names / command names, etc.) may stay in English.

## Internal Processing

AI agents may perform internal processing in English as needed.

Targets:

- Code analysis
- Architectural reasoning
- Tool invocation
- Intermediate processing steps

However, the final output presented to the user and content written to the repository must follow the "Output Language" Japanese rule above (unless the user explicitly directs English).

## Exception

If the user explicitly directs English output, the AI may respond in English.

## Code Style

[ADR 0002](docs/adr/0002-formatter-linter.md) (biome) is authoritative. Run before committing:

```bash
pnpm fix     # Auto-fix
pnpm lint    # Check remaining errors
```

Fix items the auto-fixer could not handle by hand.

### Disallowed

- Using ESLint / Prettier alongside biome (contradicts ADR 0002)
- Locally disabling biome's formatter / linter for case-specific reasons (require ADR revision and consensus instead)
- Heavy use of `biome-ignore` comments (consider scoped `overrides` first)

## Protected Documentation

The following files require deliberate human review before modification:

- `AGENTS.md` (this file)
- Accepted ADR bodies (`docs/adr/0001-*.md` and onward, with Status: Accepted)
- `LICENSE`

When a change to one of these appears necessary:

1. Do not edit directly; present the proposed change to the user
2. Edit only after the user explicitly approves

Even when a new file appears necessary, **prefer modifying an existing file** if it suffices.
<!-- END:nextjs-agent-rules -->
