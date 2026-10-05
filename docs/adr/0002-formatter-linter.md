# Formatter and Linter Policy

This project adopts **Biome** as the primary formatter and linter for JavaScript / TypeScript / JSON / CSS.

The principle is "**Biome first; ESLint complements only the checks Biome cannot handle**". Biome owns formatting and every lint check it can express, and ESLint is used as a complement only for checks Biome cannot express (layer-boundary import checks and the like). Biome is the sole formatter; Prettier is not adopted.

This document defines why Biome is adopted, the conditions for using ESLint as a complement, and the usage policy and operating rules.

## Status

Accepted

## Rationale

### 1. Consolidation into a Single Tool (the Principle)

Biome alone covers what used to require all of the following.

- An ESLint-family linter
- A Prettier-family formatter
- Import sorting (organize imports)

This:

- Reduces config files and plugins
- Removes overlapping responsibilities and conflicts between tools
- Lowers learning and operating cost

"A single tool", however, is a means, not a goal. We do not give up **checks Biome cannot currently express that are core to this repository's structural safety**, such as the layer-boundary import check (a depguard / boundaries-style check that takes "the layer doing the import" as context). ESLint complements only that gap (see "Complementing Biome with ESLint" below).

### 2. Performance

- Fast lint / format from a Rust implementation
- Keeps the run time down when scanning large directories and on CI
- Little perceptible lag on pre-commit / format-on-save

### 3. Optimized for the Next.js / React Domain

Biome ships lint domain rules for `next` / `react` and detects the following out of the box.

- `noNextAsyncClientComponent`
- `noNestedComponentDefinitions`
- Other representative React Hooks rules

### 4. A Configuration That Is Easy to Survey

- lint / format / assist / overrides are gathered into **one** `biome.json` (see "Do not split the configuration" below)
- VCS integration (respecting `.gitignore`) is also self-contained in the config file

## Checks by the TypeScript Compiler (`tsconfig.json`)

Mistakes that types can catch are given **to `tsc`**, not to lint. The capability-based division of roles (below) applies in the same shape to "types vs lint" as well as between tools, without duplication.

On top of `strict: true`, the following are enabled.

| Flag | Decision | Reason |
| --- | --- | --- |
| `noUncheckedIndexedAccess` | Adopted | Catches `undefined` from array / index access in the types |
| `erasableSyntaxOnly` | Adopted | Restricts `enum` / `namespace` to type-erasable syntax and forbids TS-specific syntax that produces runtime values |
| `verbatimModuleSyntax` | Adopted | Enforces the `import type` discipline on the type side |
| `noImplicitOverride` | Adopted | Prevents mix-ups in inheritance at low friction |
| `noPropertyAccessFromIndexSignature` | Adopted | Forbids dot access to index signatures. The inflow points (`process.env` / searchParams in [0030](0030-environment-variable-management.md)) are already sealed, so the cost is effectively zero |
| `exactOptionalPropertyTypes` | **Deferred** | High friction with React props. The remaining gap ("not specified" and "explicit `undefined`" cannot be told apart in the types) is filled by the runtime mechanism below |
| `noUnusedLocals` / `noUnusedParameters` | **Not enabled** | Biome catches these as errors with `correctness/noUnusedVariables` / `noUnusedFunctionParameters` (two copies of the same check diverge) |

- **`target` is `ES2022`**: the newest ECMAScript version implemented by every entry in Next.js's default browserslist (Chrome 111 / Edge 111 / Firefox 111 / Safari 16.4), which [0102](0102-browser-support.md) ratifies (ES2023's array-copying methods such as `toSorted` are missing from Firefox 111). `tsc` runs with `noEmit` and the build (SWC) decides the shipped syntax from browserslist, so this value only sets the premise of type checking
- **The mechanism that fills the gap left by deferring `exactOptionalPropertyTypes`**: `JSON.stringify` drops keys whose value is `undefined`, so `{name: undefined}` and `{}` are identical on the wire. The risk remains only in local assembly before serialization, so **it is confined by placing a PATCH-payload normalization function in `adapters`**. "Leave untouched" = omit the key / "clear" = explicit `null`; `undefined` carries no meaning. The public surface of adapters accepts only the normalized type (this is not left as a prose convention)

## Complementing Biome with ESLint

### Division of Roles (Capability-Based, Eliminating Divergence)

Which tool a check lives in is decided **solely by "can Biome express that check"** (capability-based). A check must not be put on the ESLint side for preference, familiarity or the convenience of a preset.

**What we eliminate is divergence, not duplication itself.** If the same check merely runs twice, the conclusions agree and no harm is done. The harm comes from two things: (1) the implementations differ, so the verdicts or the suggested fixes diverge; (2) the configuration is relaxed on one side only, and which one is right cannot be settled. The test is therefore not "do they overlap" but **"can they diverge"**; if yes, consolidate onto one side.

| Responsibility | Owner |
| --- | --- |
| Formatting | Biome alone (ESLint's formatter features are not used) |
| Import organization (organize imports) | Biome (assist) |
| Lint checks Biome can express | Biome (configured in one `biome.json`; see "Do not split the configuration") |
| Checks Biome cannot express | ESLint |

- **Do not give the same check to both tools** (because the divergence above can occur)
- **Rules Biome already implements are enabled and used on the Biome side.** Putting a rule in ESLint because "Biome has the rule but it is not enabled" contradicts the capability basis (e.g. import cycle detection is not given to ESLint because Biome's `noImportCycles` is already enabled)
- **Operate in the shrinking direction**: a check Biome comes to support is removed from ESLint and moved to Biome. The ESLint side always holds only "Biome's gaps"

### Checks Currently on the ESLint Side

- **Layer-boundary import checks** (eslint-plugin-boundaries and the like). Biome's `noRestrictedImports` + `overrides` cannot express a check that takes "the layer doing the import" as context, which makes it the representative example of what Biome does not currently support (`noImportCycles` only detects cycles, not violations of the layer dependency direction)
- The concrete plugin and the layer-definition mapping are set by the ADR on separation of responsibilities within the frontend ([0021](0021-frontend-responsibility.md)), where it states how its layer rules are enforced (the plugin is `eslint-plugin-boundaries`; the layer definitions are that ADR's dependency matrix)
- **Checks of React's rendering discipline** (`eslint-plugin-react-hooks`). It provides the React Compiler's diagnostics as rules and detects shapes such as **deriving state inside an effect, side effects during render, and wrapping JSX built during render in try/catch**. Biome's `react` domain only has dependency exhaustiveness (`useExhaustiveDependencies`) and hook call position (`useHookAtTopLevel`), and can express none of the above
  - **Rules that could diverge stay on the Biome side.** The implementations differ, so the suggested fixes differ, and when the configuration is relaxed on one side only, which one is right cannot be settled.
    Biome's `useExhaustiveDependencies` looks by default at **`useEffect` / `useLayoutEffect` / `useInsertionEffect` / `useCallback` / `useMemo` / `useImperativeHandle`**, so it **covers memo-family dependencies, not just effects**. This plugin therefore enables neither `exhaustive-effect-dependencies` nor `memo-dependencies`
  - **When adding a rule, check for duplication against this list of target hooks.** Even when names are split into "for effects" and "for memo", Biome looks at both with one rule
  - **No preset is applied; rules are enabled one by one** (per condition 2 of "Conditions for Using ESLint")
  - Where existing code cannot satisfy a rule, limit it to **a per-line suppression with a reason**, and split the rewrite into a separate PR. Mixing the lint introduction and a component redesign in one PR makes it impossible to tell which one caused a regression

### Conditions for Using ESLint

ESLint and its rules may be added to the repository only when all of the following hold.

1. **The check is not supported by Biome** (capability-based). The PR body records the result of confirming that "Biome cannot express it" (whether a corresponding rule exists, related issues, etc.)
2. **No stylistic / formatting rules, and no general-purpose rules that could diverge from Biome.** Presets such as `eslint:recommended` / `eslint-config-next` are not applied wholesale (they overlap with Biome's `next` / `react` domains and its recommended rules). Only per-rule opt-in
3. **Managed with flat config (`eslint.config.ts`).** Next.js 16 removed `next lint` and `next build` no longer runs lint, so the ESLint CLI is run directly
4. **ESLint itself and its plugins are exact-pinned devDependencies, and `pnpm audit` is run when they are added** (treated as a main dev tool under [0004](0004-library-management.md))
5. **Once Biome supports the check, it is removed from ESLint and moved to Biome.** Checking the support status is built into 0004's periodic audit cycle (the weekly-to-monthly `pnpm outdated` review) and into the checklist of Biome version-update PRs

## Version Management

Biome is exact-pinned as an npm devDependency. **The authority on the version is `devDependencies` in `package.json`; it is not copied here.**

The binary is obtained by `pnpm install` and runs at the same version both locally and on CI (see [0001-package-manager.md](0001-package-manager.md) for the pnpm policy).

Likewise, ESLint itself, its plugins and the tools needed to load its configuration are exact-pinned devDependencies (0004).

## Configuration Policy

The key points of `biome.json` are below. See the file itself for details.

### Do not split the configuration

**Biome's configuration is one `biome.json`, with no profiles.** The same rules apply wherever it is invoked from: on save, by hand, in pre-commit or on CI.

The reason not to split is that **when the weaker profile has the implicitly discovered name, a structural false pass becomes possible**. An invocation without `--config-path` — an editor extension, a bare `biome check`, someone touching this repository for the first time — reads the weaker profile and returns green, while the gate rejects with the stronger one. Whether green or red is right is decided by whether `--config-path` was on the invocation, and **appears nowhere in the output**.

The only possible ground for splitting is responsiveness on save, and **that ground does not hold in this repository** — a full scan covers 2,332 files in about 2 seconds, and no difference is measurable whether or not the `project`-domain rule (`noImportCycles`) is included. Once measurement removes the ground, a split leaves only its cost.

Therefore:

- **`--error-on-warnings` is part of the default** (`pnpm lint` adds it). There are not two invocations whose result changes depending on whether it is added
- The difference between `pnpm lint` and `pnpm lint:ci` is **the tools that run, not the rules** (the latter continues with ESLint and the boundary reconciliation). The difference is not made by how much the same Biome is shown
- A proposal to drop rules on responsiveness grounds **must attach a measurement in this repository**. General upstream arguments are not enough
- See [0151-git-hooks.md](0151-git-hooks.md) for the execution flow from hooks / CI

### VCS Integration

- `vcs.enabled = true` / `clientKind = git`
- `useIgnoreFile = true` respects `.gitignore`; ignore targets are not defined twice

### Formatter

| Item | Value |
| --- | --- |
| Indentation | 2 spaces |
| Line width | 100 |
| Line ending | `lf` |
| Quotes | `"` (both JS / JSX) |
| Semicolons | Always |
| Trailing comma | `all` |
| Arrow parentheses | Always |

### Linter

- Operated with `recommended: true` as the baseline
- Recommended rules of the `next` / `react` domains are enabled
- Additionally enabled (the current values are authoritative in `biome.json`):
  - `noConsole: warn`
  - `noExplicitAny: error`
  - `noUnusedImports / noUnusedVariables: error`
  - `noUndeclaredDependencies: error`
  - `noNestedComponentDefinitions: error` / `noNextAsyncClientComponent: error`
  - `noUnknownAtRules: off` (for Tailwind directives)
- Bug-detecting rules (`noConstantBinaryExpressions` / `noLeakedRender` / `noShadow` / `useIframeSandbox` and so on) are also enabled
- `noImportCycles: error` (`project` domain; always applied, including on save)

### Assist

- `organizeImports: on` on save

### Overrides

- `.vscode/**` … enables JSON `allowComments` (for jsonc)
- `**/*.d.ts` … `noExplicitAny` off
- `scripts/**` … `noConsole` / `noExplicitAny` off (for operational scripts)
- `public/**` … `noSvgWithoutTitle` off (alternative text for static SVG assets is guaranteed by `alt` at the use site)
- `src/adapters/gen/**` / `mocks/*/**` … **generated artifacts are excluded from the linter and only formatted**. If CI stops on the generator's output style, the only way to fix it is a patch to the generator. Formatting is still applied to generated artifacts (to keep diffs readable)
- `src/**/generated/**` … formatter off too (output overwritten on regeneration; formatting would be undone by the next generation)

### ESLint (`eslint.config.ts` — the Complement)

- Managed in one flat-config file (`eslint.config.ts`). Only the implementations of custom rules are split into `eslint-rules/` (stacking configuration and implementation in one file hurts the config's readability)
- `architecture.ts` is the single authority for the dependency matrix; the flat config imports it and turns it into checks. **The matrix is not transcribed into the config**
- Only complementary checks that satisfy "Conditions for Using ESLint" go here (currently the layer-boundary check). No formatter integration, stylistic rules or rules duplicating Biome
- It runs serially as the second stage of `pnpm lint:ci` (pre-commit / CI). The layer-boundary check involves the TS resolver and is too heavy to run on save, so in the editor only the extension's diagnostics run alongside
- **Configure the import resolver.** The layer-boundary check only works once an import target can be resolved to a real file; an unresolvable import silently passes as "belonging to no layer". Configure a TypeScript resolver that resolves `@/*`, and consider the check introduced **only after confirming that a planted violation becomes an error**
- Declare ignore targets (`.next/` / `out/` / generated artifacts, etc.) in the flat config, so they do not diverge from Biome's exclusion policy
- Each rule carries a comment explaining "why Biome cannot express this", to make the move decision easy

## Basic Commands

Run through the scripts in `package.json`.

```bash
# Lint + Format チェック（biome。warn もブロックする）
pnpm lint

# 上に ESLint と境界宣言の突合を続ける（CI・pre-commit が回すゲート）
pnpm lint:ci

# Lint + Format を自動修正
pnpm fix

# Format のみ書き換え
pnpm format
```

To run directly:

```bash
pnpm exec biome check --error-on-warnings                          # lint + format チェック（= pnpm lint）
pnpm exec biome check --fix                                        # 自動修正
pnpm exec biome format --write
pnpm exec eslint .                                                 # 補完検査
```

`lint:ci` runs `pnpm lint` (Biome) → ESLint (`lint:eslint` = `eslint .`) → the boundary-declaration reconciliation (`check:architecture`) serially. `pnpm lint` is Biome only. The boundary-check rules have almost no auto-fix, so `pnpm fix` is Biome only.

## Editor Integration

Integration assumes VSCode. `.vscode/extensions.json` lists `biomejs.biome` as a recommended extension, and `.vscode/settings.json` enables the following.

- `editor.defaultFormatter`: `biomejs.biome`
- `eslint.format.enable`: `false` (Biome is the sole formatter; ESLint's formatter features stay disabled)
- Behavior on save (listed together in `editor.codeActionsOnSave`):
  - `source.fixAll.biome`: `always`
  - `source.organizeImports.biome`: `always`
  - `source.fixAll.eslint` listed alongside (the boundary rules have almost no auto-fix, so they do not collide with Biome's formatting)
  - `editor.formatOnSave`: `true`

On every save, formatting, import organization and auto-fixes are therefore done by Biome (which picks up the canonically named `biome.json` automatically), while ESLint shows the diagnostics of the complementary checks in parallel. **The rules applied on save are the same as the gate's** (see "Do not split the configuration" above).

`dbaeumer.vscode-eslint` is included among the recommended extensions in `.vscode/extensions.json`. Because Biome owns formatting, `.vscode/settings.json` disables ESLint's formatter features.

### `.editorconfig`

An `.editorconfig` sits at the repository root. It covers **files Biome does not format** (`Makefile` / `*.mk` / `*.md` / `*.toml` / `*.yaml`, etc.) and the default on-save behavior of editors without the Biome extension; it plays no part in files Biome targets.

- Shared values (`charset` / `end_of_line` / `indent_style` / `indent_size` / `insert_final_newline` / `trim_trailing_whitespace`) match the "Formatter" table above. If they diverge, `biome.json` is authoritative
- There are two exceptions — `*.md` sets `trim_trailing_whitespace = false` because two trailing spaces mean a line break, and `Makefile` / `*.mk` set `indent_style = tab` because recipe lines require tabs
- `formatter.useEditorconfig` stays at its default `false`. Enabling it would not change the result for Biome's files because `biome.json` values take precedence; it would only create a second entry point for formatting settings

## Prohibitions

- Using Prettier alongside is prohibited (Biome is the sole formatter). pre-commit and CI judge formatting with `biome check`, so a file Prettier wrote is failed by the hook, and the work of deciding which one is right grows permanently. This is revisited only when Biome's formatting stops covering a language this repository actually handles (its supported languages shrink, or a newly handled language is outside Biome's scope); Prettier having a rich plugin ecosystem is not a reason
- Using ESLint as a formatter is prohibited (including enabling `eslint.format.enable` / introducing stylistic or formatting rules) (Enforcement: `pnpm lint:ci` (Biome's formatting check) fails on formatting that differs from Biome's. The value of `eslint.format.enable` and the introduction of stylistic plugins into `eslint.config.ts` could be caught by parsing the config files, but no rule exists)
- Writing values of its own for Biome's target files in `.editorconfig` is prohibited (the authority on formatting is `biome.json`; `.editorconfig` covers only files Biome does not look at) (Enforcement: Prose — **mechanizable** (compare the values of `.editorconfig` sections whose globs hit Biome's targets against the formatter in `biome.json`. No rule exists))
- Putting a check Biome can express on the ESLint side is prohibited (capability-based; divergence would occur. Every ESLint rule added without satisfying "Conditions for Using ESLint" violates this ADR) (Enforcement: Prose — **partly mechanizable**. An ESLint rule with an equivalent in Biome could be caught by checking against a rule-name mapping, but no rule exists. Whether Biome can express a custom rule (`eslint-rules/`) is a judgment about what the check means and is not decided by its name)
- Applying presets such as `eslint:recommended` / `eslint-config-next` wholesale is prohibited (per-rule opt-in only) (Enforcement: Prose — **mechanizable** (detect `*.configs.*` spreads and `eslint-config-*` imports in the syntax tree of `eslint.config.ts`. No rule exists))
- Do not unilaterally disable formatter or linter settings in `biome.json` for a one-off case (if needed, agree on it through an ADR revision) (Enforcement: Prose — **not mechanizable**. Disabling shows up in the diff of `biome.json`, but whether it served a one-off case or was agreed through an ADR is a judgment about history and is not in the shape of the code)
- Exclude generated artifacts, `node_modules` and the like through `files.includes` in `biome.json` / ignores in `eslint.config.ts`, and avoid heavy use of `biome-ignore` / `eslint-disable` comments (Enforcement: ESLint's `reportUnusedDisableDirectives` fails on `eslint-disable` comments that have no effect. Whether use is "heavy" is Prose — **not mechanizable**: the code holds no count threshold)
- Do not add Biome config files (profile splitting is prohibited; see "Do not split the configuration" above) (Enforcement: Prose — **mechanizable** (a gate checks that exactly one tracked `biome.json` / `biome.jsonc` exists and that scripts and workflows contain no `--config-path`. No rule exists))

## Notes

- When adding or disabling a rule, first consider local application through `overrides` (Biome) / file-scoped settings (ESLint flat config); a global change is the last resort
- On a version update, confirm that `pnpm exec biome check` produces no diff; if it does, absorb it with `pnpm fix` and include a formatting commit in the same PR. Biome update PRs also check the Biome support status of the checks kept on the ESLint side (whether they can be moved)
- Nursery rules may change behavior or group across versions. On the premise of exact pinning ([0004-library-management.md](0004-library-management.md)), check the diff in the update PR
- **Conventions Biome can express, such as the ban on reading `process.env` directly, live on the Biome side (`noProcessEnv` and so on), not in ESLint** (an application of the capability basis; enabling it goes together with the environment-variable ADR = [0030](0030-environment-variable-management.md))

## Related ADRs

- [0001-package-manager.md](0001-package-manager.md) — adopting pnpm / lockfile handling
- [0004-library-management.md](0004-library-management.md) — exact pinning of ESLint and its plugins / `pnpm audit` / the periodic audit for move decisions
- [0151-git-hooks.md](0151-git-hooks.md) — how pre-commit / pre-push call `pnpm lint:ci` (stage responsibilities, the pre-commit speed target and the fallback rule)
- [0153-ci-configuration.md](0153-ci-configuration.md) — the CI configuration that makes `pnpm lint:ci` a required PR check
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the plugin choice for the ESLint layer-boundary check (`eslint-plugin-boundaries`) and the layer-definition mapping (how its layer rules are enforced). The matrix's authority is `architecture.ts`, which the flat config imports
