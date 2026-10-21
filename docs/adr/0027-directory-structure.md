# Directory Structure

This ADR settles the **logical** structure of **feature slices × presentation-layer kernels**, declared in [0020](0020-adopted-architecture.md) (adopted architecture) / [0021](0021-frontend-responsibility.md) (separation of responsibilities), as a **physical** placement under `src/`. It sets the **physical layout / path alias / co-location policy / granularity of shared modules / timing of creating physical directories**.

## Status

Accepted

## Context

[0020](0020-adopted-architecture.md) declares the 11-kernel layout (`src/{app, features/<name>, model, components, adapters, capabilities, stores, config, errors, logging, observability}`; `capabilities` in [0022](0022-capabilities-kernel.md), `stores` in [0023](0023-stores-kernel.md)) and its design principles, and [0021](0021-frontend-responsibility.md) declares each kernel's responsibilities, the dependency matrix and the naming discipline. "What to place physically under `src/` and at what granularity", "how to use path aliases" and "where tests and styles go (co-location)" are held by this ADR as decisions subordinate to those.

The basic form of physical placement is **per-package co-location** (implementation, tests and README co-located in the same place) + a shallow layer structure + moving to a shared module only when the promotion criterion is met. This matches the backend side's shape, and guarantees through physical placement that a change to one feature stays in one place.

## Decision

### Physical Layout

Directly under `src/` are [0020](0020-adopted-architecture.md)'s **11 kernels** (9 + `capabilities` [0022](0022-capabilities-kernel.md) + `stores` [0023](0023-stores-kernel.md)) ([0020](0020-adopted-architecture.md) is authoritative for the overall diagram and dependency directions). This ADR sets the physical placement **inside** each kernel.

```text
src/
├── app/                    # route-segment (page/layout/loading/error) / route-handler (route.ts) / metadata (robots, etc.). [0025]
├── features/
│   └── <name>/             # 1 feature = 1 directory. inside, dig by screen × nature (below)
├── model/                  # display VOs / formatters / display result types (ActionState<T>, etc.) (flat co-location)
├── components/             # cross-cutting UI (flat co-location)
├── adapters/               # external connections. split into two faces, server/ and client/ ([0024], RSC boundary)
│   ├── gen/                #   wire types generated from the contract ([0072]. an area not edited by hand)
│   ├── http/               #   rules for the request shape both elements follow (an area with no execution context)
│   ├── server/             #   server-only (backend client, secrets, config allowed)
│   └── client/             #   "use client" (same-origin BFF fetch / WS / telemetry sending; no secrets)
├── capabilities/           # cross-cutting client hooks (runtime capabilities. [0022])
├── stores/                 # cross-cutting client state (Zustand stores shared by several features. [0023])
├── config/                 # purpose-scoped typed config (server / client split. [0030])
├── errors/                 # error normalization ([0080])
├── logging/                # structured logging ([0081])
└── observability/          # instrumentation ([0081])
```

- The split into `adapters/server` and `adapters/client` is **not arbitrary nesting but a split along a principled axis, the execution context (the RSC boundary)** ([0024](0024-adapters-server-client-split.md)), and is not an exception to the co-location convention's "do not nest needlessly" (it is a different thing from hierarchy built for a feature's convenience)
- The physical structure of App Router segments (`page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` / `[slug]/`, etc.) follows the Next.js App Router conventions ([0040](0040-routing-rendering-strategy.md))

### Path Alias

- Imports that cross layers use tsconfig's **`@/*` → `./src/*`** alias. The alias is the standard route for imports between layers
- **Relative imports are limited to within the same feature / the same kernel (= between physically close files).** Relative imports that cross a kernel or feature boundary (`../../model/...`, etc.) are not used; write `@/model/...` instead. This also keeps element resolution in ESLint boundaries (how [0021](0021-frontend-responsibility.md) enforces the boundaries) stable

### Co-location Policy

So that a change to one feature stays within one slice, related files are co-located next to the implementation (the locality of changes (co-location) that [0020](0020-adopted-architecture.md) gives as the basis for adopting feature slices / flat co-location by default).

- **Kernels (each component directory in `model` / `components`, `stores`, inside an element of `adapters`, etc.) use flat co-location by default.** Modules that hold decisions sit side by side, one file per role, and are not sorted by kind into subdirectories
- **`features/<name>/` is dug along only two axes.** The first axis is **screen (resource)**, the second is **nature**. This avoids arbitrary hierarchy; it is not dug along anything other than these two axes (kind, layer name, planned reuse, etc.)

  ```text
  features/<name>/
  ├── README.md
  ├── facade/                 # the only surface other features may import ([0021])
  │   └── <part>/
  ├── ui/                     # no screen in between = parts owned by the whole feature (internal)
  │   └── <part>/
  └── <resource>/             # axis 1 (optional, one level): resource = a bundle of screens
      ├── ui/                 #   parts shared by that resource's screens
      │   └── <part>/
      └── <screen>/           # axis 1: screen = per resource
          ├── page-content.tsx    #   fetching and assembly
          ├── query.ts            #   a copy of the input (URL / searchParams)
          ├── actions.ts          #   mutations (Server Actions. placement conditions in [0025])
          ├── view.tsx            # axis 2: display — composing the screen
          └── ui/                 #   display — its parts
              └── <part>/         #   1 component = 1 directory
                  ├── <part>.tsx
                  ├── <part>.test.tsx
                  ├── <part>.stories.tsx
                  └── <part>.definition.ts
  ```

- **Splitting by nature is done because each nature differs in how it is verified and in what it may import.** Fetching and assembly call `adapters`; display does not (the dependency matrix in [0021](0021-frontend-responsibility.md)). Fetching comes with mocks at the module boundary; display comes with the DOM ([0091](0091-test-verification-methods.md)). If the location expresses the nature, what a file may call and how it is verified can be decided without reading it
- **A screen's display is split into `view.tsx` (composition) and `ui/<part>/` (parts).** `view.tsx` takes the values fetched by `page-content.tsx` and assembles the screen; it is not on a par with the components in `ui/`
- **Do not repeat the enclosing directory's word in file or directory names.** It is `features/<name>/list/ui/card/card.tsx`, not `<name>-card`. The path carries the distinction, and the PascalCase side carries the identifier ([0028](0028-naming-convention.md): file names and main exports are separate axes)
- **Inside `ui/`, one component = one directory**, co-locating the implementation, tests, stories, definition and README. This has the same shape as `components/design-system/<role>/<part>/`, and this granularity is adopted to secure a place for stories ([0054](0054-ui-catalog-storybook.md)) per component
- **The depth limit is `features/<name>/<resource>/<screen>/ui/<part>/`.** The inside of `ui/` is not dug further by kind. If a screen can no longer hold its components, do not deepen `ui/`; instead **split the screen (first axis)** or move it out to `components` through [0021](0021-frontend-responsibility.md)'s promotion rule
- **The first axis may be nested one level.** `<resource>/` is "the bundle of screens belonging to this resource"; it is **a recursion of the first axis, not a third axis**. The first axis expresses "which screen owns it", and what belongs to no screen is owned one level up — that level up is not necessarily the whole feature; it may be **a group of screens handling the same resource**. The same reasoning that allows `ui/` directly under the feature works for just one more level
  - **The acceptance condition is that "two or more resources actually exist, and at least one of them has two or more screens".** If either is missing, do not nest; keep the flat `features/<name>/<screen>/` shape. As with the decision directly under the feature, it is decided by observable facts, not dug on a prediction that "resources are likely to increase later"
  - **Nesting is limited to one level.** If a second level seems necessary, that is a sign the feature is not cut to the granularity of its resources; split the feature rather than digging
  - This shape matches a widely used structure that bundles feature slices by resource (Feature-Sliced Design's slices, App Router's per-route co-location). **The routing hierarchy and the placement hierarchy line up**, so the location can be found from the URL
- **While there is only one screen, the first axis may be omitted.** Place `page-content.tsx` / `view.tsx` / `ui/` directly under `features/<name>/`. Split into screen directories when the second screen arrives
- **What belongs to no screen and is owned by the feature as a whole is placed under the nature directly below the feature, without a screen in between** (`features/<name>/ui/<part>/`, etc.). This is not a third axis. Since the first axis expresses "**which screen owns it**", what belongs to no screen is owned one level up — a consequence of the same axis
  - **The decision is "two or more screens actually use it".** The prohibited planned-reuse axis means promoting early on a **prediction** that "it will probably be used later". Predictions are prohibited because nobody reverts them when they miss; deciding the location by **an observable present fact** is not prohibited
  - What only one screen uses goes under that screen. When the screens using it drop back to one, move it back
  - **Crossing features is outside this rule** and moves to [0021](0021-frontend-responsibility.md)'s promotion rule. Because `features ↔ features` is prohibited, **do not solve it by importing the other feature's internals from one feature**
  - If the level directly under the feature swells with components, that is a sign the feature is not cut right. Do not deepen `ui/`; split the feature or promote to `components`
- **What other features use is placed in `features/<name>/facade/<part>/`.** Only this is a surface that may be imported from outside; both under a screen and `ui/` directly under the feature are internal (the conditions and discipline are authoritative in [0021](0021-frontend-responsibility.md), which sets what cannot be promoted and therefore lives in `facade/`)
  - Only **what none of the promotion-target kernels can accept** goes here. UI carrying the vocabulary of a specific domain is such a case
  - Raise it from `ui/` **when a second feature actually needs it**, and move it back down when it drops back to one
  - The depth goes as far as `features/<name>/facade/<part>/`, one component = one directory, the same as `ui/`
- **Tests are co-located next to the implementation.** They are not gathered into `__tests__/`. [0090](0090-testing-strategy.md) is authoritative for test file extensions and naming conventions (this ADR covers only placement)
- **Styles default to Tailwind utilities** ([0050](0050-styling-strategy.md)), and separate CSS files are minimized. Global CSS is gathered into `src/app/globals.css`. [0050](0050-styling-strategy.md) is authoritative for where design tokens / the `cn()` helper go
- **Mocks generated from the contract** (MSW handlers, etc.) are placed in **`mocks/`** outside `src/`, separate from the generated types ([0072](0072-api-type-generation.md)'s do-not-edit)
- **The actual modules the catalog swaps in are placed in `__mocks__/<same name as the target>` in the same directory as the target** ([0054](0054-ui-catalog-storybook.md)). This is not digging by kind but an exception because the swapping tool fixes the name and position, and shapes that exceed the depth limit by one level, such as `facade/<part>/__mocks__/`, are allowed only within this reason. Only **swaps read solely by the catalog** may be placed here; nothing the production path imports is placed here

### Granularity of Shared Modules

- **Modules that hold decisions are per-file by default** (one file per role, flat co-location), and are **promoted to per-folder** once they grow too large (preventing deep nesting)
- **UI components are per-folder by default.** Besides the implementation they come with stories, a definition and a README, which are co-located per component (`components/design-system/<role>/<part>/` and `features/<name>/<screen>/ui/<part>/` have the same shape)
- An element that needs to be shared **across features** follows [0021](0021-frontend-responsibility.md)'s **promotion rule** (promote to `model` / `components` / `adapters` / `capabilities` / `stores`) before adding folders. No general-purpose folder (`common` / `utils`, etc.) is made as a receptacle for sharing ([0021](0021-frontend-responsibility.md) bans names that do not name a role)
- Sharing **only across screens of the same feature** is not subject to promotion. Place it directly under the feature (the co-location policy above). **Only when neither promotion nor crossing screens applies — another feature needs it, but no kernel can accept it because it carries a specific domain's vocabulary —** is `facade/` used ([0021](0021-frontend-responsibility.md))

### Timing of Creating Physical Directories

- **Do not sprout empty directories** ([0020](0020-adopted-architecture.md)). A directory is created only along with its contents
- Adding a new directory directly under `src/` (= adding a 12th or later kernel) is done **after defining its role in an ADR addendum**, having satisfied [0021](0021-frontend-responsibility.md)'s naming discipline and kernel acceptance criteria. This ADR ratifies the range of the 11 kernels; anything outside it needs an ADR addendum. `capabilities` ([0022](0022-capabilities-kernel.md)) and `stores` ([0023](0023-stores-kernel.md)) are kernels added following this convention

## Prohibitions

- ❌ Sprouting empty directories without contents (Enforcement: Prose — **mechanizable** (git cannot hold empty directories, so scan under `src/` for directories holding only placeholder files such as `.gitkeep`. No rule exists))
- ❌ Gathering tests into `__tests__/` (co-locate them next to the implementation) (Enforcement: `scripts/one-to-one.gate.test.ts` (fails on tests with no source next to them and sources with no test next to them))
- ❌ Relative imports that cross a feature / kernel boundary (crossing layers with `../../`). Crossing layers uses the `@/*` alias (Enforcement: Prose — **mechanizable** (fail, with ESLint, relative imports whose resolved target belongs to a different element of `BOUNDARY_ELEMENTS`. No rule exists))
- ❌ Digging inside a feature along **axes other than screen (resource) and nature** (kind, layer name, planned reuse, etc.; the only exception is `__mocks__/`, whose position the swapping tool fixes — see the co-location policy) (Enforcement: Prose — **partly mechanizable**. Directories with known spellings that express a kind or layer name (`hooks` / `utils` / `components`, etc.) could be caught by name matching, but no rule exists. Whether any other level is a screen or a nature is decided by the meaning of the name)
- ❌ Digging deeper than `features/<name>/<resource>/<screen>/ui/<part>/` (split the screen or promote to `components`) (Enforcement: Prose — **mechanizable** (scan for directories under `ui/<part>/` (excluding `__mocks__`) and for depths beyond five levels from `features/<name>/`. No rule exists))
- ❌ Nesting the first axis two or more levels, and inserting `<resource>/` before the acceptance condition (two or more resources, and one of them with two or more screens) is met (Enforcement: Prose — **mechanizable** (treat directories holding `page-content.tsx` as screens, count bundles whose parent is not directly under the feature as resources, and check the nesting depth and "two or more resources, one with two or more screens" by scanning. No rule exists))
- ❌ Sorting the inside of a kernel into subdirectories by kind (flat co-location; per-folder UI components are not sorting by kind but one component per directory) (Enforcement: Prose — **partly mechanizable**. Subdirectories with known spellings that express a kind (`hooks` / `types` / `utils`, etc.) could be caught by name matching, but no rule exists. Distinguishing them from role areas and one-component-per-directory is decided by the meaning of the name)
- ❌ Creating a new directory directly under `src/` outside the 11 kernels without an ADR addendum (Enforcement: ESLint `boundaries/no-unknown-files` fails on JS/TS files placed in directories directly under `src/` that are not in `KERNELS`. A directory holding only non-JS/TS files is Prose — **mechanizable** (compare the list directly under `src/` with `KERNELS`. No rule exists))
- ❌ Creating general-purpose folders as receptacles for sharing (`common` / `shared` / `utils` / `lib`, etc.) ([0021](0021-frontend-responsibility.md) bans names that do not name a role) (Enforcement: ESLint `boundaries/no-unknown-files` fails on general-purpose folders (the JS/TS inside them) created directly under `src/`. Inside kernels and features it is Prose — **mechanizable** (match each segment of the path against the list of banned names. No rule exists))
- ❌ Placing **by hand** an `index.ts` (barrel file) that holds only re-exports (the import source becomes a directory rather than a file, and where the real thing lives can no longer be read. It also breeds circular references and unnecessary loading. Imports point at the real path. **Generated artifacts are out of scope** — the upstream tool decides the generated shape. An `index.ts` placed as an execution entry point is not a re-export and does not fall under this) (Enforcement: Prose — **mechanizable** (fail `index.ts` files that hold only re-exports with Biome's `noBarrelFile`, excluding generated artifacts by override. No rule exists))

## Notes

- For placing per-layer READMEs in each kernel and feature, [0021](0021-frontend-responsibility.md)'s rules for operating per-layer READMEs are authoritative

## Related ADRs

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — the logical structure, overall diagram and dependency directions of the 11 kernels (the parent decision of this ADR's physical placement)
- [0023-stores-kernel.md](0023-stores-kernel.md) — the 11th kernel `stores` (cross-cutting client state; reflected in this ADR's structure diagram)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — kernel responsibilities, the dependency matrix, the naming discipline, the promotion rule (the basis for this ADR's sharing granularity and boundary imports)
- [0011-no-docker.md](0011-no-docker.md) — the presentation-layer role definition (PaaS / static CDN delivery; physical placement must not contradict the deployment premise)
- [0028-naming-convention.md](0028-naming-convention.md) / [0030-environment-variable-management.md](0030-environment-variable-management.md) — file and identifier naming on top of this ADR's physical placement, and the contents of the `config` kernel
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) / [0050-styling-strategy.md](0050-styling-strategy.md) / [0090-testing-strategy.md](0090-testing-strategy.md) — the ADRs that make App Router structure, style placement and test placement concrete on top of this ADR's physical placement
