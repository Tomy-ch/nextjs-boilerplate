# Naming Conventions

This ADR sets the naming conventions for **file names / identifiers (components, hooks, functions, types, constants) / route segments / environment variables / ADR files**, used on top of the physical placement settled in [0027](0027-directory-structure.md) (directory structure).

[0021](0021-frontend-responsibility.md) is authoritative for the naming discipline of kernels and directories themselves (role names only / banned names such as `common` `utils` `lib`), and this ADR **does not repeat it**. This ADR covers the naming of files and identifiers inside them.

## Status

Accepted

## Context

Naming in this repository is decided in the priority order **Next.js conventions > React conventions > this repository's (nextjs-boilerplate) own existing conventions**, and **leans toward industry standards as far as possible**. The primary authority for naming is Next.js / React and industry standards; the backend side's conventions are not made the authority for naming (layer principles are aligned, but naming follows the frontend ecosystem).

In applying this priority, we checked **what the Next.js 16 documentation makes a convention and what it does not**:

- **What Next.js makes a convention**: only special files (`page` / `layout` / `route`, etc. = fixed lowercase) and the route segment notation (`[slug]` / `[...slug]` / `(group)` / `_folder`)
- **What Next.js does not make a convention**: the file names and organization of components / hooks / other modules. The Next.js documentation states "**Next.js is unopinionated about how you organize and colocate your project files**" (`project-structure`), and calls `components` / `lib` / `ui` / `utils` / `hooks` "generalized placeholders" with "no special framework significance"

Therefore:

- **Special files and routes** follow the Next.js convention (lowercase)
- **Other file names** are not enforced by Next.js and are left to **industry standards**. **kebab-case** is adopted, consistent with the de facto standard of the Next.js ecosystem (official examples / shadcn/ui), with file-system safety (avoiding collisions on case-insensitive file systems), and with this repository's existing files (`src/app/layout.tsx` / `page.tsx` are lowercase)
- **Identifiers** (component names, hook names, etc.) follow React conventions, because React/JSX enforces them syntactically (components = PascalCase required)

For the naming formats of env / ADRs / tests, **this repository's own existing conventions and related ADRs are authoritative** (ADR files = this repository's `docs/adr/README.md` / environment variables = [0030](0030-environment-variable-management.md) / tests = [0090](0090-testing-strategy.md)).

## Decision

### File Names — kebab-case for All Sources (Not Enforced by Next.js → Industry Standard)

Source file names are **unified in kebab-case**. The file name (kebab-case) and the identifier of its main export (the "Identifiers" rule below) are **separate axes**; the file-name side is kebab-case regardless of kind.

| Target | File name | Identifier of the main export | Example |
| --- | --- | --- | --- |
| React component | **kebab-case** | PascalCase | `date-picker.tsx` → `DatePicker` |
| hook | **kebab-case** (starting with `use-`) | `use` + PascalCase | `use-media-query.ts` → `useMediaQuery` |
| Other modules (model / adapters / function groups) | **kebab-case** | camelCase | `format-date.ts` → `formatDate` / `api-client.ts` → `apiClient` |
| Next.js special files | **Fixed lowercase (Next.js convention)** | — | `page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` / `not-found.tsx` / `route.ts` / `template.tsx` / `default.tsx` / `global-error.tsx` |
| Start-up / config files | **Fixed names from Next.js / tool conventions** | — | `instrumentation.ts` / `proxy.ts` (the former `middleware.ts` in Next.js 16; [0043](0043-middleware-policy.md)) / `next.config.ts` |
| Server Action collection | **`actions.ts`** (fixed name) | — | `features/<name>/actions.ts` ([0021](0021-frontend-responsibility.md)) |

- The traditional React practice (component files in PascalCase = `DatePicker.tsx`) is **not adopted**. Prioritizing the Next.js ecosystem's industry standard and case-insensitive file-system safety, file names are unified in kebab-case for every kind
- Unifying on kebab-case makes one rule suffice regardless of file kind, and mixed cases and upper/lower-case collisions structurally cannot occur

### Route Segment Names (App Router — Next.js Convention)

- Directory names of route segments are **lowercase, following the Next.js App Router convention** (`app/help/` / `app/sign-in/`, etc.; multiple words in kebab-case)
- Follow the Next.js notation (do not invent patterns):
  - Dynamic: `[slug]` (dynamic) / `[...slug]` (catch-all) / `[[...slug]]` (optional catch-all)
  - route group: `(group)` (grouping that does not affect the URL)
  - private folder: `_folder` (for non-routing colocation; also helps avoid naming collisions with future Next.js special files)

### Identifiers (React / TypeScript Conventions)

Combining React/JSX's syntactic constraints with industry standards (non-Hungarian notation), the following are fixed:

| Target | Case | Notes |
| --- | --- | --- |
| React component | **PascalCase** | Required by JSX syntax (React convention) |
| hook | **`use` + PascalCase** (referred to as `useCamelCase`) | `useMediaQuery` / `useDebounce`. React's convention |
| Functions, variables | **camelCase** | |
| Types / interfaces | **PascalCase** | **No `I` prefix** (TypeScript's industry standard = non-Hungarian) |
| True constants (module-level immutable values) | **UPPER_SNAKE_CASE** | Enum-like constants, etc. Environment variable values are excluded (not re-exposed as UPPER_SNAKE constants; referred to through the typed Config's getters — [0030](0030-environment-variable-management.md)) |
| Properties of the typed Config | camelCase (getter names) | Contents in [0030](0030-environment-variable-management.md) |

### Environment Variables

- Environment variable names are **UPPER_SNAKE_CASE of the form `{SUBSYSTEM}_{NAME}`** (UPPER_SNAKE is the industry standard for environment variables. `{SUBSYSTEM}` groups by a subsystem prefix (e.g. `SERVER_` / `AUTH_`), and `{NAME}` is the relative name). Adopting this format follows from [0030](0030-environment-variable-management.md)'s decision. **The prefix is a unit of naming and is independent of the config purpose** — the purpose is drawn by the subsystem that reads the value ([0030](0030-environment-variable-management.md)). Do not decide the purpose from the prefix, or the prefix from the purpose
- Variables exposed to the browser carry the **`NEXT_PUBLIC_` prefix** per the Next.js convention (`NEXT_PUBLIC_{SUBSYSTEM}_{NAME}`). **[0030](0030-environment-variable-management.md) (environment variable management)** is authoritative for the details of the boundary, validation and typing
- **Exception: where a standard or de facto standard prescribes the variable name itself, use that standard name as is** (e.g. OpenTelemetry's `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_SERVICE_NAME`, Next.js's `NEXT_PUBLIC_*` / `PORT`). Renaming a standard name to `{SUBSYSTEM}_{NAME}` stops SDKs and tools that implement the standard from reading it by default and requires custom bridging code ([0010](0010-standards-and-non-lockin.md)'s conformance to standards). The exception covers **only variables read by external specifications or tools**; variables the app reads itself are not exceptions

### ADR File Names

- ADR files are **`NNNN-kebab-case-title.md`** (a 4-digit zero-padded number + a kebab-case title). This is **this repository's own existing convention** (`docs/adr/README.md`) and also matches the kebab-case policy for source files
- Numbering uses topic-ordered block bands (the tens = subject blocks), and [0140](0140-documentation-operations.md) holds the numbering lifecycle. Prefixed numbering (`Dev-` / `Toolchain-`, etc.) is not used; everything sits in one numeric sequence

### Test File Naming

- [0090](0090-testing-strategy.md) is authoritative for test file extensions and the conventions for `describe` / `it` strings (kebab-case + `.test.ts(x)`, including Japanese naming such as `正常系` / `異常系` and the ban on table-driven tests). That the body of a file name is kebab-case follows this ADR's unified policy

## Prohibitions

- ❌ Using PascalCase / camelCase in source file names (`DatePicker.tsx` / `formatDate.ts`, etc.). File names are unified in kebab-case (Enforcement: the scaffold (`pnpm gen`) checks names against kebab-case at generation time. Files placed by hand are Prose — **mechanizable** (enable Biome's `useFilenamingConvention` with kebab-case. No rule exists))
- ❌ Mixing cases (bringing in file names other than kebab-case) (Enforcement: the scaffold (`pnpm gen`) checks names against kebab-case at generation time. Files brought in by hand are Prose — **mechanizable** (enable Biome's `useFilenamingConvention` with kebab-case. No rule exists))
- ❌ An `I` prefix on types / interfaces (`IButtonProps`, etc.) (Enforcement: Prose — **mechanizable** (fail, with lint, type / interface declarations whose names match `^I[A-Z]`. No rule exists))
- ❌ Bringing custom naming patterns into App Router special files or route segments (follow the Next.js convention) (Enforcement: Prose — **partly mechanizable**. Segment names under `src/app/` could be caught with a regular expression for lowercase kebab-case and the Next.js notation (`[...]` / `(...)` / `_...`), but no rule exists. Whether a custom spelling imitates a special file is decided by the intent of the name)
- ❌ Giving environment variables a shape other than `{SUBSYSTEM}_{NAME}` (except where the standard-name exception applies) / putting secrets in `NEXT_PUBLIC_` ([0030](0030-environment-variable-management.md)) (Enforcement: Prose — **partly mechanizable**. Whether variable names in `env/.env.*` are UPPER_SNAKE with a prefix could be caught with a regular expression, but no rule exists. Whether the prefix is a subsystem, whether it is a standard-name exception, and whether the value is a secret are decided by meaning)
- ❌ Renaming variable names prescribed by a standard (`OTEL_*`, etc.) to `{SUBSYSTEM}_{NAME}` (standard implementations could no longer read them) (Enforcement: Prose — **not mechanizable**. Which variable names an external specification prescribes is not in the code, and a rename shows up only as the standard name disappearing)
- ❌ Giving kernels or directories names that do not name a role ([0021](0021-frontend-responsibility.md)'s naming discipline; out of scope for this ADR but restated) (Enforcement: ESLint `boundaries/no-unknown-files` fails on directories directly under `src/` (the JS/TS inside them) whose names are not in `KERNELS`. Directory names inside kernels are Prose — **mechanizable** (match each segment of the path against the list of banned names. No rule exists))

## Notes

- The file and identifier naming this ADR holds falls into the rule class ([0140](0140-documentation-operations.md)). This ADR holds the reasoning (why), and the place for it as a constraint enforced day to day is `docs/rules.md`, which [0140](0140-documentation-operations.md) sets

## Related ADRs

- [0027-directory-structure.md](0027-directory-structure.md) — physical placement (the foundation this ADR's file naming sits on)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the naming discipline for kernels and directories (role names only, banned names). This ADR covers file and identifier naming inside them
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — the boundary, typing and validation of environment variables. This ADR sets only the naming format
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — App Router segment structure. This ADR sets its naming (lowercase, dynamic notation, route group, private folder)
- [0090-testing-strategy.md](0090-testing-strategy.md) — test file extensions and `describe` / `it` naming
- [0140-documentation-operations.md](0140-documentation-operations.md) — the ADR numbering lifecycle / the rule class
