# Design System

This page explains end to end, from design tokens to a feature's screen components, **how the things that decide appearance stack up, and which layer decides what and what it does not decide**. The decisions themselves belong to [ADR 0050](../adr/0050-styling-strategy.md)–[0055](../adr/0055-design-system-export.md), and the day-to-day prohibitions to two sections of [`docs/rules.md`](../rules.md#ui-parts): UI Components and Interaction, and Layout and Bands (`#layout`). What this page holds is the background needed to read them, and **the paths and pitfalls you only find by opening the implementation**.

What `src/components/` accepts and its inventory are owned by [`src/components/README.md`](../../src/components/README.md), which this page does not copy. When they disagree, the ADRs and the layer README win.

## The stack — what sits on top of what

| Tier | Location | Decides | Does not decide |
| --- | --- | --- | --- |
| **token** | [`tokens/`](../../tokens/README.md) → `src/app/generated/tokens.css` | The **values** of color, spacing, radius, typeface, shadow and steps, and their mapping per color scheme (light / dark) × surface (`user` / `admin`) | Which component uses which token |
| **foundation** | `src/components/design-system/foundation/` | The CSS foundation that applies across components (scrollbar, typesetting, print, shimmer, scroll-fade), and the bridge that carries the surface to the Portal's exit | Publishing React components (it exports nothing except the `surface` bridge) |
| **design-system components** | `src/components/design-system/<purpose>/<component>/` | Appearance and interaction closed within one role. Variants, sizes, the a11y contract | What happens, what is shown, where it is placed (the caller passes these) |
| **patterns** | `src/components/patterns/` | Shapes composed from several roles (the outer frame of an item, the filter strip, a table's column definitions) | The backend contract, the mount position |
| **shell / app-starter** | `src/components/shell/` / `src/components/app-starter/` | Layout shells whose position and count are fixed / components that know a contract (HTTP status, submission results, upload steps) | Business vocabulary (the moment it carries any, it goes to `features`) |
| **feature ui** | `src/features/<name>/<screen>/ui/<part>/` | Assemblies that carry the subject matter's vocabulary. The components above wired to real data and Server Actions | The appearance system (it does not add tokens directly; it arranges `components`) |

From top to bottom, **a lower tier does not know the tier above it, and an upper tier only combines the tiers below**. The layers `components` may import are limited to `model` and `errors` (`architecture.ts`), while `features` reaches `components` freely. A feature using `cn()` follows this direction.

**A component does not know which surface it has been placed on.** The difference between surfaces is fully expressed by re-mapping semantic tokens ([0051](../adr/0051-styling-system.md)); there is no branching inside components and no per-surface component. For the same reason, a component does not know where it is placed either (pinned to the bottom, or permanently at the side) — that is the screen's decision, and the end of [`docs/rules.md`](../rules.md#ui-parts) forbids it.

## Tokens — where values come from and how they arrive

The SSOT has two tiers, `tokens/primitives.json` (raw values) and `tokens/themes/<family>/<scheme>.json` (aliases pointing at primitives), written with W3C Design Tokens `$type` / `$value` and `{...}` aliases. `pnpm gen:tokens` (`tokens/scripts/gen-tokens.ts`) generates the following three, and `pnpm check:tokens` fails on any difference from the generated artifacts. **Do not edit the generated artifacts.**

| Generated artifact | What reads it |
| --- | --- |
| `src/app/generated/tokens.css` | Imported first by `globals.css`. Tailwind and every component |
| `src/model/generated/breakpoint.ts` | The JS side that determines the band (`BREAKPOINT`) |
| `src/model/generated/design-token.ts` | The inventory of token **names**. The catalog's `Tokens/` reads values at runtime based on it |

### How They Reach Tailwind

`tokens.css` consists of three blocks.

1. `@theme { --color-blue-590: … }` — registers primitives into Tailwind's theme. Utilities like `bg-blue-590` **are generated** from here, but components do not use them
2. `@theme inline { --color-primary: var(--semantic-color-primary); }` — **aliases** semantic names to Tailwind color tokens. This block is what generates `bg-primary` / `text-primary` / `border-input`
3. The surface × color scheme blocks (`:root` / `[data-surface="admin"]` / the dark variant of each) — the concrete `--semantic-color-*` values are bound here

So a `bg-primary` written in a component resolves in three steps: `--color-primary` → `--semantic-color-primary` → primitive. **The prefixes are separate so a machine can tell them apart**: a direct reference to `--color-blue-*` in the generated CSS is a primitive leak.

### The Two Switching Axes and Where They Apply

| Axis | Values | Where it appears | Default |
| --- | --- | --- | --- |
| Color scheme | `light` / `dark` | `:root`. **Two paths**: the OS's `prefers-color-scheme` and `:root[data-theme]` | `light` (no attribute) |
| Surface | `user` / `admin` | The **subtree** carrying `[data-surface]` | `user` (no attribute) |

The default surface and the default color scheme carry no attribute, so **a tree with nothing written on it is always `user` × `light`**. Non-default color schemes are emitted only for `screen`, so print always uses the default color scheme.

The `dark:` variant is fired by `@custom-variant dark` in `globals.css` through **the same two paths**. Writing `@media (prefers-color-scheme: dark)` in your own CSS applies dark declarations to a user who chose light via `data-theme` — it looks at only one of the paths.

The side that sets the surface attribute is `shell/admin-shell`, which puts `data-surface` on the outer frame and places `SurfacePortalBridge` next to it. Why the bridge is needed is covered in "[Common Pitfalls](#common-pitfalls)".

### What Generation Rejects

`gen-tokens.ts` checks that every surface has the same color schemes (`assertSameSchemes`) and that every surface × every color scheme declares the same tokens (`assertSameTokens`), and fails the whole generation if anything is missing. Allowing a gap would let the cascade carry over the neighboring combination's value, and **only the places you thought you switched would stay in the original color**. Adding a surface is just creating a directory; the only names the generator knows are the default surface (`user`) and the default color scheme (`light`), which appear on a tree with no attribute set. The defaults are needed to decide what is emitted on `:root`, and if one is missing the whole generation fails — if you rename the default surface or color scheme, change the constants in `gen-tokens.ts` in the same change.

## `cn()`, Variants and CSS Modules

**`cn()`** (`src/components/cn.ts`) is a single function combining `clsx` + `tailwind-merge`, and the only entry point for conditional classes and resolving conflicts between Tailwind utilities. Do not import `clsx` / `tailwind-merge` directly from the consuming side.

**Variants** are written with `class-variance-authority` and placed in `<component>.definition.ts` (`BUTTON_VARIANT` / `BUTTON_SIZE` in `button.definition.ts` are that shape). The `<component>.tsx` that renders imports the definition and uses it. A variant expresses only **appearances that cannot hold at the same time**; the presence of a state or a swap of structure is not made into a variant ([0052](../adr/0052-ui-component-policy.md)). When boolean props start multiplying, that is the signal to switch to slots (`children` / `asChild`) or to split the component.

**CSS Modules** are permitted in a limited way by [0050](../adr/0050-styling-strategy.md), but **there is currently not a single `*.module.css`**. The only `.css` files in `src/` are `globals.css` and the five in `foundation/` (`scrollbar` / `typeset` / `shimmer` / `print` / `scroll-fade`), and these are not modules but **global foundations** imported by `globals.css`. When you think "this cannot be written with utilities, so it goes into a CSS file", there are two destinations, and they mean different things.

| Destination | Scope | Example |
| --- | --- | --- |
| `foundation/<name>/<name>.css` + an `@import` in `globals.css` | Global. Either inherited properties placed once on `:root`, or an opt-in class like `.typeset` | The look of the scrollbar, the typesetting rhythm, the print layout |
| `<component>/<component>.module.css` | That component only | No instance yet |

## The Zones of `src/components/`

Directly under `components/`, the split into four is by **who rewrites it**, and only `design-system` is split further by **what the component is for**. These are two separate axes, and the ledger (`shadcn-manifest.yaml`) also holds `layer` and `as` as separate keys.

| Layer | Test | How it is split |
| --- | --- | --- |
| `design-system` | Knows no contract, and reading it does not add roles | By purpose (`action` / `form` / `overlay` / `navigation` / `display` / `status` / `container` / `layout` / `rich-text` / `foundation`) |
| `patterns` | Knows no contract, but composes several roles | Not split |
| `shell` | Where and how many are placed is decided by the component itself | Not split |
| `app-starter` | Knows the backend contract | Not split |

The tests are applied in the order **contract → mount position → how the role closes**. Dependencies run one way, `app-starter / shell → patterns → design-system`, and direction is not constrained inside `design-system`.

**A directory that has a `README.md` is a component.** `pnpm check:ui` uses this as its only marker when matching the ledger against what exists, so grouping directories such as `design-system/form/` get no README. Conversely, components that have only a story and a README, such as `layout/layout-patterns`, do exist — whether implementation files exist is not used for the decision.

There are 13 `as` headings (`action` / `form` / `overlay` / `navigation` / `display` / `status` / `container` / `foundation` / `layout` / `feedback` / `rich-text` / `view-state` / `sugar`), and `CATALOG_HEADING` in `src/components/scripts/check-shadcn.ts` is authoritative. **`feedback` / `view-state` / `sugar` do not exist as directories** — they are headings that components in `patterns` and `app-starter` claim only in the inventory and the sidebar, and the directory is derived only from `layer`.

### Where to Put a New Component

1. **Does it carry the subject matter's vocabulary?** If so, `components` drops out, and it goes to the three levels of `features` ([placement.md](placement.md))
2. **Does it know a contract?** If it knows the meaning of HTTP statuses, how to interpret submission results, or the steps of an upload, it is `app-starter`
3. **Are its position and count fixed?** If the component itself decides them — once in the root layout, inside `main`, at the top of a page — it is `shell`
4. **Does its role close as one?** If so, `design-system/<purpose>/`; if it composes several, `patterns`
5. When it spans two purposes, take **the side it cannot exist without** (`copy-button` is mainly about the act of pressing, so `action`; `selection-toolbar` is subordinate to the state of a surface called selection, so `container`)

Once the location is decided, write `layer` / `as` / `directory` into the ledger and co-locate the README, story and test. If it comes from shadcn, `pnpm add:ui` does most of this (next section). If it is your own, `pnpm gen component <name> --as=<heading> [--layer=<layer>]` produces the four files — README, implementation, test and story — and also adds a `kind: original` row to `shadcn-manifest.yaml`. **Freshly generated, it passes `pnpm check:ui` as is.**

### Components That Exist Only as Named Candidates

There are four cross-cutting patterns that are highly reusable in typical business systems and consumer-facing systems and are expected to raise the completeness of `app-starter`. **None is implemented yet, and none is built ahead of time.** Their shape cannot be fixed until the information structure is settled, so whether they are needed is judged while actually building the relevant screens. When built, they are limited to a shape that carries no business vocabulary, API types or particular business states, and receives serializable display data and operation results from the consuming side.

| Candidate | Purpose | Elements | Responsibilities it does not hold |
| --- | --- | --- | --- |
| `settings-shell` | The settings / account area | Navigation between settings categories, section headers, key-value / form display of settings items, save state | The meaning of credentials and settings values (owned by the feature). Subordinate to `shell/app-shell` |
| `master-detail-layout` | A list and its detail side by side | Responsive list / detail panes, URL sync of the selection, switching to route / drawer on narrow bands | Data fetching and the type of the selected item (owned by the feature). Subordinate to `shell/app-shell` |
| `maintenance-state` | Service operating state | Maintenance, partial outage, rate limit, retry-after, recovery confirmation, a path to the status page | Outage detection and recovery time (owned by the operations side). Decide first whether it overlaps with `app-starter/api-error-feedback` / `feedback-state` |
| `offline-recovery` | Recovering from a lost connection | Offline display, reconnection, retry, held submissions, guidance on conflicts | The sync approach and redelivery guarantees (owned by `capabilities` / the feature). **Not completable within `components` alone** |

The location is decided after first separating the `patterns` or `shell` candidates from the responsibilities left in `features`. They are treated not as added primitives but as components for "assembling the app up to an operable state".

## Handling shadcn/ui

### Taking It In

`pnpm add:ui <item> --as=<heading> [--layer=<layer>] [-- <shadcn add options>]` is the only entry point (`src/components/scripts/add-shadcn.ts`). Do not call `pnpm exec shadcn add` directly. The wrapper takes care of the following, none of which happens with the CLI alone.

- It requires `--as` **first**, and if the value is not a heading, fails before running `shadcn add`
- It moves the generated artifacts the CLI writes to `design-system/<item>.tsx` into `<layer>/<purpose>/<item>/` according to the layer and heading
- It sorts out the generated artifacts of dependency components. If one is already taken in, it removes the duplicate and points the import at a relative path to the real one; if not, it reports the name and leaves it
- It copies `component-template.md` as `README.md`. The placeholders are made concrete in the same piece of work
- On success it upserts `kind: copy-in` / `layer` / `as` / `directory` / `dependencies` / `source[].commit` into the ledger (`shadcn-manifest.yaml`). `source` is the path and commit of the upstream files declared by the registry's JSON, and becomes the base of a later 3-way merge
- The problem where the CLI's `pnpm add` refuses to add to the workspace root and **stops without a single file written** is let through with `npm_config_ignore_workspace_root_check`, for this one invocation only

### After Taking It In

Upstream is **a reference implementation, not something to follow** ([0052](../adr/0052-ui-component-policy.md)). This repository owns it and may modify it. Four things must be fixed right after taking it in, and if left alone, none of them shows up until you look in a browser.

| What to fix | Why | Detection |
| --- | --- | --- |
| The import path `@/components/design-system/<item>` | It does not exist in this layout | typecheck |
| `lucide-react` imports | `iconLibrary` in `components.json` has no Tabler option, so the CLI emits lucide | Package resolution failure and `pnpm lint:eslint` |
| Focus styles `ring-ring` / `border-ring` / `outline-ring` | Focus in this repository is `outline`. The `ring` token is not adopted | `pnpm check:classes` |
| Unprefixed CSS variables such as `var(--primary)` | Only `--semantic-color-*` has real values. Inside an argument to `color-mix()`, **the whole declaration is discarded and the surface disappears entirely** | Not caught by class detection. Run the README's `grep` by hand |

`pnpm check:classes` actually builds `globals.css` and matches, in selector form, whether the classes written in `.tsx` files under `src/components` appear in the output. **It does not "remove it because there is no definition"** — things that intentionally have no CSS because no animation plugin is adopted, such as `animate-in` / `fade-in-*`, are placed with a reason in `KNOWN_WITHOUT_CSS` in `check-classes.ts`, and are not removed from the implementation.

### The Ledger's `kind` and Drift

| `kind` | Meaning | When upstream moves |
| --- | --- | --- |
| `copy-in` | Taken in from the registry and held as something to follow | Reported as `要追従`. Taken in by 3-way merge |
| `reimplemented` | An equivalent upstream item exists, but it was reimplemented here (`checkbox-native` and the like) | Reported as `参考`. Not followed |
| `original` | No equivalent upstream item exists | Nothing |
| `not-adopted` | Considered and not built. Has no implementation; `reason` / `revisitWhen` are required | Nothing |

`pnpm check:ui` checks the ledger's consistency (`directory` against what exists, unrecorded directories, rows that lost their implementation, whether `kind` and `source` fit together, `dependencies` against actual imports, the validity of `as`) without network access, and if there are no problems, compares the latest upstream against `source.commit`. CI (`.github/workflows/shadcn-drift.yaml`) runs the former **on every PR** and the latter only weekly — upstream drift is not caused by the change under review, so it is not a reason to fail a PR.

To take in upstream changes, use a 3-way merge with `git merge-file`, based on the original at `source.commit` (the procedure is in `src/components/scripts/README.md`). Re-taking it in with `--overwrite` erases every TSDoc, import and focus fix.

### Blocks are read, never copied in

shadcn/ui's Blocks are finished app fragments, and **are not copied in as `components`**. What you read from them is layout, responsive component composition and story examples, and from there you reconstruct only the parts you need to fit the dependency boundaries, directory conventions, real API connections and type conventions. **Type annotations that violate the conventions are not ported** — type assertions such as `as React.CSSProperties` are forbidden by ESLint in this repository, and bringing the Blocks' style in unchanged fails `lint:ci`.

### Do not add upstreams

The registry sometimes ships items that presuppose a different headless upstream (Base UI and the like). Such items are not taken in; they are built by composing components already held, or by implementing only the needed mechanism in-house. An upstream can be added only as a migration decision — "do we replace the current upstream with that one?" — and coexistence is not chosen ([0052](../adr/0052-ui-component-policy.md)).

## Icons — containing the vendor

Only [`src/components/icon.ts`](../../src/components/icon.ts) may name the supplier (`@tabler/icons-react`). The lockout is held by `no-restricted-imports` (`iconVendorImports`) in `eslint.config.ts`, and only `icon.ts` itself is exempt from it. The same lockout applies to `docs-viewer/` — so that the workspace never has two places that can name the supplier.

`icon.ts` holds **only named re-exports**.

```ts
export { IconChevronRight as ChevronRightIcon, … } from "@tabler/icons-react";
```

- The public name is **this surface's vocabulary** (`ChevronRightIcon`), not the supplier's spelling (`IconChevronRight`). When swapping, only the right-hand side is rewritten and the callers do not move
- Do not make it a table that looks up components by name (`{ "chevron-right": … }`). A table becomes a static reference to the whole set, and even unused icons ride along in the bundle. With re-exports, only what is imported remains
- The `IconComponent` type is `ComponentType<ComponentProps<"svg">>`, not an alias of the supplier's type. Aliasing it would let props the supplier added leak through this surface
- A missing name is added to `icon.ts` as one line. The catalog's `Icons/` (`.storybook/icon.stories.tsx`) namespace-imports `icon.ts` and **enumerates every entry at runtime**, so an added icon shows up as is. Since `icon.ts` holds only re-exports, it is excluded from the coverage denominator (the frontmatter of `components/README.md`)

## Stacking-Order Bands

z-index is not tokenized. Only Tailwind's step values are used ([`docs/rules.md`](../rules.md#layout)), and **which step value is which band** belongs to [0051](../adr/0051-styling-system.md), which assigns z-index steps to bands. This section maps where those bands appear in the implementation.

| Band | Value | How it appears in the implementation |
| --- | --- | --- |
| Overlap within the body | `z-10` | The sticky header example in `layout-patterns`, the sticky in `patterns/selection-toolbar`, the fixed column in `patterns/table-view-options` |
| Bands the screen pins itself | `z-30` | Pinned elements placed in the feature's `ui/` (the strip right under the header, a container that slides in and out from the bottom). **None inside `components`** |
| Screen skeleton | `z-40` | The header of `shell/app-shell` / `shell/admin-shell`, the `fixed` of `patterns/action-bar` |
| overlay | `z-50` | All of `overlay/*`, the surfaces of `navigation/menubar` / `navigation-menu`, the region of `shell/toaster`, `shell/consent-banner`, `shell/pull-to-refresh`, the skip link of `app-shell` (`focus:z-50`) |

**`z-20` is left empty.** It is not a value to slot between bands; it is the declaration that four bands are enough. If "put this one on top" is needed within the same band, solve it with DOM order and do not add values — needing one means the band assignment is wrong.

**Overlap inside a component is not a band.** The stacking of `avatar`, the border `button-group` raises on focus, and in `attachment` the trigger stretched across the whole surface (`z-10`) with the controls shown above it (`z-20`) are all closed inside the stacking context the component itself creates. They do not conflict even with the same `z-10` / `z-20` values as the bands, because they have no effect outside the component.

**`z-40` pinned to the bottom takes the safe area.** `pb-[max(--spacing(2),env(safe-area-inset-bottom))]` in `action-bar.definition.ts` is that shape, and at `lg:` and up it leaves the band with `lg:static lg:z-auto`. A `z-10` that only sticks to a scroll region does not take it.

## The Catalog (Storybook)

Storybook is **the one and only list of components** ([0054](../adr/0054-ui-catalog-storybook.md)). The README narrates responsibilities and design intent, and the story shows the visual spec and states on the canvas — the same thing is not written in both. Stories are co-located next to the component, and `.storybook/` holds only configuration and the inventories that are not components (`Tokens/` / `Icons/`).

### The sidebar and the inventory share the same zones

The first segment of a story's `title` matches the ledger's `as`, and `pnpm check:ui` cross-checks them. Features use `Page/<feature>/<screen>` and `Features/<feature>/…` and do not go under the 13 headings. The order is fixed by `storySort` in `.storybook/preview.tsx` as `Page` → `Features` → `Tokens` → `Icons` → the inventory.

`Tokens/Catalog` holds only the **names** from `src/model/generated/design-token.ts`, and **reads the values at mount time from CSS variables via `getComputedStyle`**. Switching `Theme` / `Surface` in the toolbar resolves the same names to different values, shown together with the contrast ratio against the background. Since no values are copied into the table, adding a token does not make the inventory stale.

### When a Component Cannot Have a Story

The principle is "do not newly create a component without a story", and the exceptions are limited to either **it cannot be rendered in a browser** or **there is nothing to render**.

| Component | Story | Why |
| --- | --- | --- |
| `foundation/surface` | None | `SurfacePortalBridge` returns `null`. How each surface looks is held by `Tokens/*` |
| `patterns/table` (parent) | None | The expanded column definitions are shown by the `static-data` / `editable-data` stories. The parent only decides where nested parts go |
| The CSS foundations in `foundation/*` | **Has one**. No test | Rendering is done by the browser and the OS and cannot be reproduced in jsdom. The story is the only means of checking |
| `layout/layout-patterns` | **Only a story** | Exports nothing. A place for composition examples and decisions |
| A feature's `page-content.tsx` | None | A story cannot hold the real fetch. Separate the composition that holds the fetch from the component that holds the appearance, and give the latter the story |

### Swapping external endpoints on surfaces without a server

The catalog has no server, but leaves no interaction that breaks when pressed. Only **the external endpoints** are swapped; the subject itself is not.

- **Server Actions** are swapped for the neighboring `__mocks__/` by `sb.mock(import("…/actions.ts"))` in `.storybook/preview.tsx`. **Write the path including the extension** — omitting it makes resolution fail, and it proceeds with the declaration present but not a single mock registered. The default return value is success, and failure is produced by swapping `mocked()` in the story. A story that captures the submitting state holds it with the never-resolving submit target in `~catalog/lib/pending-action`
- **Same-origin `/api/*`** is answered by `.storybook/msw/`. Do not swap `fetch` inside a story — swapping it means the component no longer goes through response validation and the failure branches
- The decorator sets the color scheme as `data-theme` on `:root`, and the surface as `data-surface` on **`body`**. Wrapping only the story's tree makes the contents of Portals fall outside the attribute
- The decorator wraps every story in `ToastProvider`. If each story wrapped it, a story that forgot would render Storybook's error screen, and that could get approved as a baseline image

### a11y is checked on every story in the catalog

`axe` runs on every story in the same digest-pinned container as visual regression ([0091](../adr/0091-test-verification-methods.md)). `addon-a11y` is a local interactive panel, not a gate. It sees different things from `vitest-axe` at the component layer — jsdom has no color, so measured contrast only comes out at the story layer.

## Exporting Outward

`pnpm design:bundle` (`scripts/design-bundle/`) writes three things to `tmp/design-bundle/`: `r/*.json` (component sources in shadcn registry format), `catalog.md` (an inventory of purpose, responsibility boundaries and story names) and `tokens.css` (the generated tokens). The script does not know the destination; the delivery procedure to Figma or to an assistant that reads files is held by the `design-export` skill ([0055](../adr/0055-design-system-export.md)).

- The purpose and responsibility boundaries in `catalog.md` are read from each component README's `## Purpose` / `## Responsibility Boundaries` sections, and story names from `storybook-static/index.json`. **Without the index it stops** — emitting empty story names would make "components without stories" appear to exist, so `pnpm build-storybook` must come first
- The bundle is a generated artifact and is not committed. There is also no path that writes a design tool's output back into the repo. Implementing a proposal is ordinary implementation work that a human reads and decides on
- **Run it once, before starting to design screens.** The purpose of importing it is to design screens with the design judgment filled in, and once design has started it is too late. A high-fidelity import verifies every component one by one and takes time, so run it alone rather than alongside other work. If the design system changes after the import, do not repeat it midway; gather the changes and re-import once

## Relationship to Baseline Images

The mechanism of per-story visual regression (capture, compare, retake, approve) belongs to [vrt.md](vrt.md) and is not repeated here. Only the conditions that act from the design system's side are listed.

- **Touching a token moves everything.** One line in `tokens/` affects every story, so do not retake until you can state the reason for each failing screen. Retaking along with a mixed-in defect makes that defect the next source of truth
- **A component that branches on its container's width sits, in its story too, inside a parent that has `container-type`.** A baseline image captured without fixing the container does not match the real thing
- **A surface that appears only on hover is advanced to focus with `play`.** Capture has no pointer, so a surface left to hover is never captured. The a11y contract requires the same surface to open on focus, and `play` uses that path
- **A story whose appearance is a function of time** is declared in `vrt/lib/excluded-stories.ts` with a reason and a removal condition. That is not a reason to delete the story

## Common Pitfalls

### Whether `"use client"` is present is not decided by the layer

Of the 85 implementation files in `design-system`, those with `"use client"` and those without are roughly half and half. It is not the layer that decides whether something is Client, but **whether native is enough, component by component**. That is why the same concept has `<concept>-native` / `<concept>-client` pairs: `select-native` renders a plain `select` as a Server Component, and `select-client` renders Radix's popup in a client island. **Do not choose the one that looks richer** — if the options are static and fixed in number, use native, and do not lean toward client for the initial layout alone ([`docs/rules.md`](../rules.md#ui-parts)).

### Placing `data-surface` inside the body renders only overlays in the default surface

`overlay/*` goes out directly under `document.body` via Radix's Portal. Even with `data-surface="admin"` on the layout shell's outer frame, the contents of an open dialog are outside it and so render in the `user` colors. This is why `shell/admin-shell` places `SurfacePortalBridge` together with the outer frame's attribute: the bridge puts the same attribute on `body` after hydration, and on removal clears only the value it set. **The body has the correct surface from the moment the server renders it, and overlays open on interaction so do not exist before hydration** — so a bridge running in an effect is in time. Pointing the Portal's `container` inside the surface was not adopted, since it would add a slot to six overlay components and make the caller specify it every time.

### Unresolved CSS variables break more quietly than classes

The `var(--primary)` in shadcn's generated output resolves to nothing in this repository. In `bg-[var(--primary)]` the surface just becomes transparent, but **inside a function argument such as `color-mix(in oklch, var(--primary) 10%, transparent)` the whole declaration becomes invalid, and the surface does not appear at all**. `pnpm check:classes` only checks whether classes exist, so for variables, run the `grep` in [`components/README.md` § CSS Variable Prefixes](../../src/components/README.md#css-variable-prefixes) separately when taking a component in.

### Adding `outline-none` removes the focus ring

Focus indication is unified as `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active`. Adding `outline-none` alongside it, meaning to suppress the default outline, makes Tailwind v4's `outline-none` set `--tw-outline-style: none`, which cancels the `outline-style: var(--tw-outline-style)` that `focus-visible:outline-2` emits. **No focus ring is drawn at all.** To suppress the default, the `focus-visible` styles alone are enough. `ring` is not used for focus because under forced-colors `box-shadow` becomes `none` and disappears; `shadow-glow-primary` is just decoration layered on top.

### Using `primary` and `emphasis` for text fails AA

These two are colors for surfaces and graphics, and only meet 3:1 against the background. Using `text-primary` for links or status text falls below 4.5:1. For text, use `secondary` / `success` / `warning` / `destructive` / `info`. Icons are non-text, so `primary` is fine. Likewise, a direct weight such as `font-bold` is rejected by `eslint-rules/no-raw-font-weight` — there is only one step, `font-emphasis`, and as long as Japanese text is left to the typefaces bundled with the OS, a second step cannot be rendered distinctly in many environments.

### `pnpm gen component` takes the placement as options

`--as=<heading>` is required, and `--layer` defaults to `design-system`. The set of headings is held by the ledger's checking side,
so the template does not carry its own list. **Passing the zone as a positional argument is not accepted** — because there are locations such as `patterns/` where the layer alone does not decide the heading.

It produces four files — README, implementation, test and story — and the README is a copy of `component-template.md`
(the side that builds the inventory reads its section names, so a layer README's section structure would not be picked up). A `kind: original`
row is also added to the ledger — a component with no upstream can only take this `kind`, and the checking side requires `original` to have **no**
declaration of where it was taken from.

### Calling `pnpm exec shadcn add` directly stops without writing anything

The CLI runs `pnpm add` for dependencies without `-w`, and since this repository has a workspace, adding to the root is refused. Dependency installation runs before files are written, so **it ends without a single file written, whatever the kind of component**. `pnpm add:ui` raises the permission for this one invocation only. Writing it into `.npmrc` as a permanent permission lets every `pnpm add` silently add to the root by mistake.

### A README in a purpose directory gets counted as a component

`pnpm check:ui` treats a directory that has a `README.md` as a component. The moment you put a guide such as `design-system/overlay/README.md` there, it fails as a component missing from the ledger. What each purpose directory covers is held by the list in `components/README.md`, and is written only there.

### `z-20` is not between bands

The bands are the four `z-10` / `z-30` / `z-40` / `z-50`, and `z-20` is left empty. If you feel you need "above overlap in the body, below the screen's bands", one of the band assignments is wrong. Using `z-10` / `z-20` inside a component is fine, but that is about the component's own stacking context and has nothing to do with the bands.

### Adding a token to only one surface or scheme fails generation

If you add a token to `tokens/themes/user/light.json`, the same name is needed in the other three: `user/dark` / `admin/light` / `admin/dark`. If even one is missing, `pnpm gen:tokens` stops at `assertSameTokens`. **Stopping is the intended behavior; do not work around it** — letting a gap through makes the cascade carry over the neighboring value, and only the places you thought you switched stay in the original color. If you fix `tokens.css` by hand to get through, `pnpm check:tokens` fails it instead.

### Fractional steps are spelled `--spacing-0\.5`

A `.` cannot appear in a CSS custom property name, so the generator escapes it as `\.`, and the Tailwind reference side uses the same spelling. If you search the built CSS as a string without assuming this spelling, you will judge a declaration that exists to be "missing".

### Spacing steps take two paths

Among `gap-*` / `p-*`, the steps that tokens give names to (`0` / `1` / `2` / `4` / `6` / `8`) go through `var(--spacing-N)`, and their values can be changed in one place, `tokens/primitives.json`. The other steps (`1.5` / `3` / `10`) expand into `calc()` as multiples of Tailwind's base `--spacing`, a path separate from tokens. **There is no convention yet on which to use, and they are currently mixed** (`layout-patterns/README.md`).

### Story descriptions appear only on the Docs page

`parameters.docs.description.component` and the JSDoc right before a story are not rendered on the Canvas. `.storybook/preview.tsx` sets `tags: ["autodocs"]` so that the Docs page appears; removing it means the descriptions you wrote appear nowhere. When writing `play` in an overlay story, get the opening action from `within(canvasElement)` and the opened surface from `within(document.body)` — waiting inside the canvas times out without finding it even though it is open.

### `design:bundle` does not run without a Storybook build

It takes story names from `storybook-static/index.json`, so it stops without the index. This is solved by "`pnpm build-storybook` first", and if the index is merely stale, build again. The error message is split between "the file does not exist" and "it cannot be parsed" for this reason: treating the latter the same as the former would keep users who have already built stuck at the same place.

## Related ADRs

- [0050](../adr/0050-styling-strategy.md) — Tailwind as the main axis / limited permission for CSS Modules / where `cn()` lives / the division of work that puts the surface attribute at the Portal's exit
- [0051](../adr/0051-styling-system.md) — the two token tiers and two axes / bands and container queries / motion / print / stacking-order bands / Japanese typefaces
- [0052](../adr/0052-ui-component-policy.md) — copy-in of shadcn/ui / do not add upstreams / variants only for mutually exclusive appearances / containing icons
- [0053](../adr/0053-ui-component-interaction-seam.md) — built-in first / the overlay a11y contract and history / the state a component holds and what is passed from outside / receiving through slots
- [0054](../adr/0054-ui-catalog-storybook.md) — Storybook as the one and only list of components / swapping on surfaces without a server / 15 topics per component
- [0055](../adr/0055-design-system-export.md) — export artifacts are tool-independent / dependencies run one way, repo → design
- [0021](../adr/0021-frontend-responsibility.md) — the basis for `components` reaching only `model` and `errors` / the promotion rules
- [0026](../adr/0026-layout-shell-mount.md) — the path that mounts `shell/` layout shells and Providers in the root layout
- [0027](../adr/0027-directory-structure.md) — co-location of implementation, test, story and README
- [0091](../adr/0091-test-verification-methods.md) — a11y checks on every story / the adoption of visual regression
- [0100](../adr/0100-accessibility-target.md) — WCAG 2.x AA. The source of the tokens' contrast targets
