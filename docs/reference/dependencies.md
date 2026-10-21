# Inventory of Direct Dependencies

A living inventory that groups the direct dependencies in `package.json`'s `dependencies` / `devDependencies` by **the single
responsibility each one carries**. Unlike an ADR, this list is a reference that presumes it is rewritten every time `package.json` moves,
not an immutable record.

- **The criteria for adopting a dependency** (single responsibility × single upstream / second screen / exact pin / update cycle) are
  a decision, held by [0004](../adr/0004-library-management.md)
- **Bridges / instrumentation that stand between two upstreams** go through the exception path of
  [0004](../adr/0004-library-management.md) as a bounded exception to those criteria. This document lists them in a separate section
- **Why this library** for each individual area is held by that area's ADR. The ADR number in the "Responsibility" column of the table
  is the entry point to it

> This inventory stays in sync with `package.json`. **Versions are not written** — the moment they are, it becomes a snapshot,
> and `package.json` is always authoritative. What is read here is how responsibilities are grouped, and which ADR owns each area.

## Depth — How Deeply Each Is Integrated

Libraries are read not by "whether they are installed" but by **how deeply they are built into the app**.
There are three tiers.

| Tier | Meaning |
| --- | --- |
| **Full** | Used every day. Deeply integrated, with a reference implementation bundled in the app |
| **Medium** | Integrated, but placed modestly by default. Whoever needs it starts using it |
| **Thin** | Holds only a seam, wiring and a minimal demo. Whether it is actually used depends on the use case |

**Tiers attach to capabilities, not packages.** Observability has one tier across 16 packages, and rich text has one tier
across 20. Conversely, dev-side tools have no tier — they either run or do not. So this document does not hold
the tier as a column. A column that cannot be filled becomes a lie. Each capability's tier is stated by that area's ADR
as the shape of its seam.

## Runtime Dependencies (`dependencies`)

| Area | Package | Responsibility |
| --- | --- | --- |
| Runtime foundation | `next` | The framework itself. App Router / build / server runtime ([0040](../adr/0040-routing-rendering-strategy.md)) |
| Runtime foundation | `react` / `react-dom` | The UI runtime and DOM / server rendering ([0042](../adr/0042-react19-rendering-api.md)) |
| Runtime foundation | `server-only` | The guard that fails the build when a server-only module enters the client bundle. Placed as the first import of `*.server.ts`, and its presence is checked by `scripts/lib/server-only.ts` |
| State, forms, validation | `zod` | Parsing and schemas at boundaries ([0029](../adr/0029-type-design-discipline.md) / [0030](../adr/0030-environment-variable-management.md) / [0062](../adr/0062-form-input-validation.md)) |
| State, forms, validation | `react-hook-form` | Form state ([0060](../adr/0060-state-management.md) / [0062](../adr/0062-form-input-validation.md)) |
| State, forms, validation | `zustand` | Store for client state ([0023](../adr/0023-stores-kernel.md) / [0060](../adr/0060-state-management.md)) |
| Styling | `tailwind-merge` | Resolving Tailwind class conflicts. The inside of `cn()` ([0050](../adr/0050-styling-strategy.md)) |
| Styling | `clsx` | Conditional class concatenation. The inside of `cn()` |
| Styling | `class-variance-authority` | Mapping variants to classes ([0050](../adr/0050-styling-strategy.md) / [0052](../adr/0052-ui-component-policy.md)) |
| UI component foundations | `radix-ui` | Headless UI primitives. The foundation shadcn/ui's copy-in requires ([0052](../adr/0052-ui-component-policy.md)) |
| UI component foundations | `cmdk` | Foundation for the command palette |
| UI component foundations | `vaul` | Foundation for the drawer |
| UI component foundations | `input-otp` | Foundation for segmented input |
| UI component foundations | `react-resizable-panels` | Foundation for split panes |
| UI component foundations | `react-day-picker` | Foundation for the calendar |
| UI component foundations | `recharts` | Foundation for charts |
| UI component foundations | `@tabler/icons-react` | The icon supplier. Confined to `src/components/icon.ts` ([0052](../adr/0052-ui-component-policy.md)) |
| Rich text | `@tiptap/core` / `@tiptap/react` / `@tiptap/pm` | The editor itself, React binding, bundled ProseMirror ([0052](../adr/0052-ui-component-policy.md) / [0053](../adr/0053-ui-component-interaction-seam.md)) |
| Rich text | `@tiptap/extensions` / `@tiptap/extension-*` (13) | Extensions that enable the formats in use one by one. document / paragraph / text / heading / bold / italic / strike / code / link / list / blockquote / hard-break / horizontal-rule |
| Rich text | `hast-util-from-html` | The parser that turns HTML into a hast tree ([0053](../adr/0053-ui-component-interaction-seam.md)) |
| Rich text | `hast-util-sanitize` | Checks the hast tree against an allowlist |
| Rich text | `hast-util-to-jsx-runtime` | Builds React elements directly from the checked tree. Rendering that does not go through an HTML string |
| Dates | `date-fns` | Date arithmetic ([0120](../adr/0120-locale-aware-formatting.md)). Formatting is done by `Intl` |
| Configuration | `dotenv` | Loading `env/.env.*` ([0030](../adr/0030-environment-variable-management.md)) |
| Auth seam | `jose` | Signing and verifying session tokens ([0079](../adr/0079-auth-frontend-seam.md)) |
| Observability (server) | `@opentelemetry/api` / `@opentelemetry/api-logs` | The trace / metric / log API ([0081](../adr/0081-observability-logging.md)) |
| Observability (server) | `@opentelemetry/sdk-node` | The Node SDK. Assembles exporters and instrumentation |
| Observability (server) | `@opentelemetry/sdk-logs` / `@opentelemetry/sdk-metrics` | The log / metric SDKs |
| Observability (server) | `@opentelemetry/exporter-{trace,metrics,logs}-otlp-http` | OTLP/HTTP exporters |
| Observability (server) | `@opentelemetry/core` / `@opentelemetry/resources` | Shared pieces for context propagation and Resource attributes |
| Observability (server) | `@opentelemetry/semantic-conventions` | Standard definitions of attribute names |
| Observability (server) | `pino` | Structured logging ([0081](../adr/0081-observability-logging.md)) |
| Observability (browser) | `@opentelemetry/sdk-trace-web` | The browser-side tracer ([0082](../adr/0082-client-observability.md)) |
| Observability (browser) | `@opentelemetry/otlp-transformer` | Converts browser spans into OTLP shape and hands them to the BFF relay |
| Third-party scripts | `@next/third-parties` | Embedding the tag manager. Placed behind the consent gate ([0131](../adr/0131-cookie-consent.md) / [0082](../adr/0082-client-observability.md)) |

The two observability groups span two version lines, stable (`2.x`) and experimental (`0.x`),
but both are a **single** upstream (OpenTelemetry itself), not two. They are not treated as an exception.

## Development Dependencies (`devDependencies`)

| Area | Package | Responsibility |
| --- | --- | --- |
| Language, types | `typescript` | Type checking (`pnpm typecheck`), and the compiler API `scripts/` uses to read syntax trees |
| Language, types | `@types/node` / `@types/react` / `@types/react-dom` / `@types/hast` | Type definitions |
| Language, types | `tsx` | Runs `scripts/**` as TypeScript ([0159](../adr/0159-script-structure.md)) |
| Language, types | `jiti` | The loader ESLint uses to read `eslint.config.ts` |
| lint / format | `@biomejs/biome` | The formatter and linter itself ([0002](../adr/0002-formatter-linter.md)) |
| lint / format | `eslint` | Carries only the checks biome cannot express ([0002](../adr/0002-formatter-linter.md)) |
| lint / format | `eslint-plugin-boundaries` | Import checks on layer boundaries ([0021](../adr/0021-frontend-responsibility.md)) |
| lint / format | `eslint-plugin-react-hooks` | Hooks rules (writing a ref during render, setState inside an effect, etc.) |
| lint / format | `eslint-plugin-security` | Edit-time SAST ([0110](../adr/0110-security-operations.md)) |
| lint / format | `knip` | Detecting unused files / exports / dependencies |
| lint / format | `markdownlint-cli2` | Markdown lint ([0153](../adr/0153-ci-configuration.md)) |
| Styling build | `tailwindcss` | Tailwind v4 itself ([0050](../adr/0050-styling-strategy.md)) |
| Styling build | `postcss` | The CSS transformation pipeline. Required by Next's CSS handling |
| React Compiler | `babel-plugin-react-compiler` | The implementation of `reactCompiler` (annotation mode) ([0042](../adr/0042-react19-rendering-api.md)) |
| Bringing in UI components | `shadcn` | shadcn/ui's copy-in CLI (`pnpm add:ui`. [0052](../adr/0052-ui-component-policy.md)) |
| Unit tests | `vitest` | The test runner ([0090](../adr/0090-testing-strategy.md)) |
| Unit tests | `vite` | The base bundler for Vitest and Storybook. The portal's preview |
| Unit tests | `@vitejs/plugin-react` | Transforms tsx in Vitest |
| Unit tests | `jsdom` | The environment for tests that need a DOM |
| Unit tests | `@testing-library/react` / `@testing-library/dom` | Rendering and queries |
| Unit tests | `@testing-library/user-event` | Reproducing user interaction |
| Unit tests | `@testing-library/jest-dom` | DOM matchers |
| Mocks / contracts | `msw` | HTTP mocks. Shared across test / Storybook / dev ([0090](../adr/0090-testing-strategy.md)) |
| Mocks / contracts | `orval` | Generates types, clients, zod and mocks from OpenAPI ([0072](../adr/0072-api-type-generation.md)) |
| Mocks / contracts | `@faker-js/faker` | Supplies the values generated mocks return. Stabilized with a fixed seed |
| a11y checks | `axe-core` | The a11y rule engine ([0091](../adr/0091-test-verification-methods.md) / [0100](../adr/0100-accessibility-target.md)) |
| UI catalog | `storybook` / `@storybook/addon-docs` | Storybook itself and docs ([0054](../adr/0054-ui-catalog-storybook.md)) |
| E2E / VRT | `@playwright/test` | Browser-driven journeys and screen comparison ([0090](../adr/0090-testing-strategy.md) / [0091](../adr/0091-test-verification-methods.md)) |
| Browser measurement | `lighthouse` | Lab measurement. Started as a child process ([0101](../adr/0101-performance-budget.md) / [0156](../adr/0156-browser-observation-tooling.md)) |
| Browser measurement | `chrome-devtools-mcp` | The CLI for the "dig" lane ([0156](../adr/0156-browser-observation-tooling.md)) |
| git hooks / commit | `lefthook` | pre-commit / pre-push ([0151](../adr/0151-git-hooks.md)) |
| git hooks / commit | `@commitlint/cli` / `@commitlint/types` | Convention checks on commit subjects ([0150](../adr/0150-git-workflow.md)) |
| Script I/O | `yaml` | Reading and writing YAML configuration (manifest / budget / portal) |
| Script I/O | `smol-toml` | Reading the TOML suppression file (`scripts/suppression-expiry`. [0157](../adr/0157-inspection-declaration-discipline.md)) |
| Script I/O | `linkedom` | The DOM needed for mermaid syntax checks (`scripts/mermaid-lint`) |
| Script I/O | `mermaid` | Syntax checks of mermaid diagrams in Markdown |

## Bridge / Instrumentation Exceptions

The following stand between **two independently versioned upstreams**, so they cannot structurally satisfy "single responsibility × single upstream",
and are accepted through the exception path of [0004](../adr/0004-library-management.md). How upstreams are
counted (`react` / `next` are the runtime foundation and are not counted) also follows that ADR.

Runtime bridges ship in the production bundle, so the bar for an exception is high.

| Package | Joins | Responsibility |
| --- | --- | --- |
| `@hookform/resolvers` | react-hook-form × zod | Connects a schema as the resolver for form validation |
| `@opentelemetry/instrumentation-http` | OpenTelemetry × Node `http` | Attaches spans to server-side inbound and outbound HTTP |
| `@opentelemetry/instrumentation-undici` | OpenTelemetry × undici (Node's `fetch`) | Attaches spans to server-side `fetch` |
| `@opentelemetry/instrumentation-fetch` | OpenTelemetry × the browser's `fetch` | Attaches spans to browser-side `fetch` and propagates context |

Build-time and dev-time bridges do not ship in the production bundle, so recording only the fork-cost ceiling is enough.

| Package | Joins | Responsibility |
| --- | --- | --- |
| `typescript-eslint` | ESLint × TypeScript | Type-aware ESLint rules and the parser |
| `eslint-import-resolver-typescript` | ESLint's import resolver × TypeScript | Lets the boundary checks resolve import targets down to real files |
| `@tailwindcss/postcss` | Tailwind × PostCSS | Puts Tailwind onto the PostCSS pipeline |
| `@storybook/nextjs-vite` | Storybook × Vite | Storybook's framework integration |
| `@storybook/addon-a11y` | Storybook × axe | Per-story a11y checks |
| `@axe-core/playwright` | axe × Playwright | a11y checks on E2E / VRT screens |
| `vitest-axe` | axe × Vitest | a11y checks in unit tests |
| `@vitest/coverage-istanbul` | Vitest × istanbul | Coverage measurement ([0090](../adr/0090-testing-strategy.md)) |

## Ties Between Dependencies

Some dependencies cannot be upgraded alone and **move in the same change as their partner**. The rule of cutting major updates into separate PRs
([0004](../adr/0004-library-management.md)) is kept by carrying such a tie together in one PR.

| Set | Tie |
| --- | --- |
| `tailwindcss` ↔ `tailwind-merge` | `tailwind-merge` follows Tailwind's major (v3 → 2.x / v4 → 3.x). A Tailwind major update carries both in one PR |
| `@opentelemetry/*` | The two lines, stable (`2.x`) and experimental (`0.x`), presume each other's versions. Do not upgrade only one |
| `@tiptap/*` | Keep on the same version. If the extensions and the editor itself drift in version, the schemas disagree |
| `storybook` / `@storybook/*` | Keep on the same version |
| `vitest` / `@vitest/coverage-istanbul` | Keep on the same version |
| `react` / `react-dom` / `@types/react` / `@types/react-dom` | Keep the runtime, DOM rendering and type definitions, all four, on the same major |
