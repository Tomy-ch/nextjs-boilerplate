---
imports-allowed: [model, errors] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [fetch, config, capabilities, stores, business-state]
coverage-exclusions:
  - "src/components/icon.ts"
test-requirement: component
---

# components

The kernel that holds pure, design-system-style UI components used by more than one feature.

## What is here is a reference implementation

**You may rebuild it, and you may throw it away.** The components listed in this inventory and the
values held by [`tokens/`](../../tokens/README.md) are placed here on the assumption that you will
replace them with your own design. **Using them as they are is not a requirement.**

What we ask you to keep is not the components but **how they are placed**.

| What stays | What you may throw away |
| --- | --- |
| How the layers are split (`design-system` / `patterns` / `shell` / `app-starter`) and the axes behind it (who rewrites it × what the component is for) | The look, variants and naming of individual components |
| The direction of dependencies (pull only `model` and `errors`; own no fetch, no config, no business state) | The choice of starting from shadcn/ui itself |
| The discipline of co-locating a README and stories with each component | The content of the stories that exist now |
| Deciding color and spacing through semantic tokens | The token values |

**`app-starter` in particular is a layer meant to be rebuilt.** The components that know the backend
contract live there, so when the contract changes they are rebuilt ([Placement and Naming](#placement-and-naming)).

## What Belongs Here

- Cross-cutting UI, the UI state needed for display, and accessible interactive components

## What Does Not Belong Here

- fetch, config, business state, and imports of `capabilities` / `stores`

## Operations

- Components in this directory start from a shadcn/ui copy-in. When adopting a vendor import such as Radix, keep it inside `components`; features do not reference it directly
- **SSR first**: the basic components needed for the initial display prefer native HTML and Server Components. Implementations that need the browser runtime, such as `"use client"`, Radix or a Portal, are limited to client islands with interaction requirements native elements cannot meet. For a small static choice prefer `select-native`; do not move to CSR merely for the initial layout
- The look is checked against the Storybook stories as the source of truth. Stories are co-located in the same directory as the component they cover
- Co-locate a `README.md` in every component directory. The required sections are owned by "Placement and Naming". For components that default to native / Server Components and for client-island components, state that boundary and whether hydration is needed
- The shadcn CLI emits icons as lucide (`iconLibrary` in `components.json` has no Tabler option). After a copy-in, replace those imports with ones through [`icon.ts`](./icon.ts). If a needed name is missing, add one line to `icon.ts`. A missed replacement fails both because the package cannot be resolved and in `pnpm lint:eslint`
- A new shadcn copy-in automatically copies [`component-template.md`](./component-template.md) as the component directory's `README.md`. The template placeholders must be made concrete to match the implementation in the same import work
- When you add a component, add one line to the [component inventory](#component-inventory). When you rename one, rewrite the line; when you delete one, delete it. A component missing from the inventory is, to whoever reads this, the same as not existing. Components like `ContextMenu`, which have no visible trigger and cannot be noticed without reading existing components, are the most affected
- Where a component goes is decided by `layer` and `as` in [`shadcn-manifest.yaml`](./shadcn-manifest.yaml), and `pnpm check:ui` checks that they match `directory`. **`layer` is "who rewrites it" and `as` is "what the component is for"**; the axes differ, so do not fold them together. `design-system/navigation/pagination` and `app-starter/cursor-pagination` are both `as: navigation` because their purpose is the same and their layer differs
- Keep stories a neutral catalog that people using the boilerplate can reference as is. Show a component's own usage with generic copy, props and links; examples tied to a specific business or screen go in feature-side stories
- UI that owns state as its own responsibility shows loading / empty / error / success in stories. Do not create meaningless state stories for UI that does not own that state, such as `Button`; show that UI's own interaction states such as disabled and pending. Screen-specific states are composed on the feature side
- UI used by a single feature only is placed inside that feature
- Dependencies are limited to `model` and `errors`
- Use [`cn.ts`](./cn.ts) for conditional class names and resolving Tailwind utility conflicts. Do not add implementations that use `clsx` and `tailwind-merge` directly
- Take icons from [`icon.ts`](./icon.ts). Implementations that import the supplier directly are not placed even inside `components`. This keeps a replacement to one file, and `no-restricted-imports` in `eslint.config.ts` shuts them out. **This surface is limited to named re-exports** — a table that looks up a component by name pulls unused icons into the bundle too
- For the decision "once satisfied, keep it mounted from then on", use [`use-latched.ts`](./use-latched.ts). If the content is removed every time its container closes, **things that cannot be restored once removed** (an editing surface that can only be built from the content at the time it opened, an input that must be included in the submission) are rebuilt. It is needed across layers, so it lives here rather than under a layer
- Colors, spacing and the like use the semantic tokens of [`tokens/`](../../tokens/README.md). Do not use primitive tokens directly
- Add shadcn/ui components with `pnpm add:ui <component> --as=<heading> [--layer=<layer>] [-- <shadcn add options>]`. It copies in one component at a time to the place matching its layer and heading, and on success records the layer, heading, registry, time added and CLI version in [`shadcn-manifest.yaml`](./shadcn-manifest.yaml), so do not run `pnpm exec shadcn add` directly. `--as` is required and `--layer` defaults to `design-system`; an invalid value for either is rejected before `shadcn add` runs
- An original component with no equivalent upstream item is placed with `pnpm gen component <name> --as=<heading> [--layer=<layer>]`. The vocabulary and defaults of the placement options are the same as `add:ui`; it emits the implementation, story, test and a README copied from `component-template.md` into the same directory, and records a `kind: original` row in [`shadcn-manifest.yaml`](./shadcn-manifest.yaml). `pnpm check:ui` fails a directory that has a README but no row in the ledger, so the template and the ledger row are emitted together
- **Do not own rendering spans.** Cross-cutting UI has no per-screen attribution, so instrumentation is limited to the top of the feature layer ([observability/README.md](../observability/README.md))

## Checks After a Change

When you add or change a component, pass the following. Only the order of the first two matters: fix what `pnpm fix` can fix, then let `pnpm lint:ci` report the rest.

```bash
pnpm fix
pnpm lint:ci
pnpm typecheck
pnpm vitest run <path of the component you touched>
pnpm build-storybook
git diff --check
```

**Judge within the scope you touched.** Components in this repository are independent of each other, and several people and sessions touch different components at the same time. If making everything green is the completion condition, someone else's in-progress state blocks your completion, and trying to fix it breaks their work.

- Narrow coverage to the target with `--coverage.include`. The repository-wide number says nothing about whether your change is good or bad
- Fix `pnpm check:ui` findings only for your own component. Leave findings on other components in your report
- If a component you did not touch is failing, report it rather than fixing it. The failure itself is information for whoever owns that component

The Vite chunk-size warning from `pnpm build-storybook` does not stop the build from succeeding. It is advice on splitting and does not point to a defect in a component.

### Test Structure

The perspectives are owned by [docs/testing-conventions.md](../../docs/testing-conventions.md) and by each README's "Storybook and Tests". This layer keeps the following four shapes consistent.

- The default environment in `vitest.config.ts` is `node`, so a test that renders puts `// @vitest-environment jsdom` at the top. `scripts/`, which does not render, does not carry this line
- A test whose subject returns rendered output always has one `axe()` from `vitest-axe` ([0091](../../docs/adr/0091-test-verification-methods.md))
- Components that read the router (`next/navigation`) replace the current location and navigation with `vi.mock("next/navigation")`. Components do not fetch, so a test of a rendering component never replaces `fetch`
- Components whose display changes with the browsing environment pin, with `renderToStaticMarkup`, that the server output does not depend on the environment. `render` sees only the post-hydration result, so a mismatch in the initial render is not found there

## TSDoc Standard

TSDoc has one condition to meet: **a caller can implement against it by supplying props alone, without knowing the internal behavior.** Do not write implementation steps or internal state transitions; write only the contract visible from the public API. In addition, **state where it is placed in Storybook so its look can be found at a glance.**

Which tags are required and which are written only when applicable — `@param` / `@returns` / `@defaultValue` / `@example`, and writing the meaning of props on the members of `<Component>Props` — is owned by [docs/rules.md](../../docs/rules.md#comments). This layer adds only the following.

| Element | Content |
| --- | --- |
| First line | This component's responsibility. Write what it takes on, not a paraphrase of its name |
| `@remarks` | Constraints a caller misuses it without knowing: the SSR / client-island boundary, required a11y attributes, and responsibilities this component does **not** own |
| `@param props` | Required (the rule is in rules.md). This layer adds only whether native attributes are passed through |
| `@see` | The Storybook title. Write it in the form ``@see Storybook `Action/Button` `` |

`<Component>Props` itself carries a `{@link}` to its component, and a constant for a value set enumerates when to use each value.

For a compound with many subcomponents, the root's `@example` shows the whole combination, and each subcomponent carries only a one-line responsibility and its own constraints. Do not duplicate the same content across every subcomponent.

What not to write:

- Internal implementation steps, state transitions, which hooks are used
- Development history, past bugs, migration history (git history owns these)
- Text that merely paraphrases the type signature in prose

## Focus indicators versus decorative rings

There are two ways to draw a ring around an element: CSS `outline` and `box-shadow` (Tailwind's `ring-*`). Split them by purpose: **`outline` for focus indicators, `ring` for decorative rings.** Building the same look with two mechanisms splits how focus looks from component to component.

### Focus Indicators

- The focus ring is unified as `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary`. The `ring` token used by shadcn output (`ring-ring` / `border-ring` / `outline-ring`) is not adopted; it is replaced with this on import
- `active` is used for the color so that the resting border (`input`) and focus can be told apart. `active` meets **4.5:1** on every background, one step stronger than the **3:1** of `input`
- **`shadow-glow-primary` is decoration; what indicates focus is the `outline`.** In forced-colors mode the UA sets `box-shadow` to `none`, so the glow disappears, but the `outline` remains and focus is not lost. This is also why the glow must never be the only cue for focus
- There are two reasons not to use `ring` for focus: **in forced-colors mode the UA forces `box-shadow` to `none`**, so the focus ring disappears entirely; and **the `ring-offset` gap is not transparent but a band painted with `ring-offset-color`**, which shows on any surface whose color does not match it
- **Do not put `outline-none` on the same element.** In Tailwind v4, `outline-none` sets `--tw-outline-style: none` on the element, which cancels the `outline-style: var(--tw-outline-style)` that `focus-visible:outline-2` emits, so no focus ring is rendered at all. If you only want to suppress the default outline, the `focus-visible` side alone is enough
- Menu items that show focus with a fill (items in `dropdown-menu`, `context-menu`, `command`, `select-client`) are the exception and use the combination of `outline-hidden` and `focus:bg-accent`

### Font Weight

- **Write emphasis with `font-emphasis`. Do not specify a weight directly.** Each typeface has different weights, and specifying a step it lacks just rounds it and produces no emphasis (`tokens/README.md`, *Only one emphasis step*). **`no-raw-font-weight` checks this mechanically** (`eslint-rules/`). `font-normal` cancels emphasis ("not emphasized"), so it may be used
- **There is only one step.** The difference between headings and body text comes from size (`text-lg` etc.) and position; weight is added on top of that. Do not try to build another level of hierarchy with weight — some environments with OS-bundled typefaces cannot render it

### Surface Family (`data-surface`) and Portals

- **Put the surface-family attribute at a position that includes the Portal's exit.** Components in `overlay/` exit to directly under `document.body` through Radix's Portal, so if the attribute sits on an element inside the content, only the overlay's content is rendered in the default family (`tokens/README.md`, *Where the attribute goes must contain the Portal*)
- Of the two options the token side presents (put it on the `body` equivalent / point the Portal's `container` inside the family), this layer takes **the former**. The content is covered from the moment the server renders it by the `data-surface` the layout shell puts on the outer frame, and overlay content gets the same value on `body` through the bridge in [`foundation/surface`](./design-system/foundation/surface/README.md). Doing it after hydration is enough because overlays open through interaction. Replacing `container` is not adopted — it would add an entry point to every overlay component and make callers specify it every time
- **Do not bake color into symbols.** Draw symbols such as a check mark with borders or `currentColor`, not images. An image does not follow when the family or color scheme changes the tokens

### Glow

- **The colors that may glow are fixed.** Only five exist — `shadow-glow-primary` / `-info` / `-success` / `-warning` / `-destructive`; `secondary` and `emphasis` have no token (`tokens/README.md`, *Whether and when to glow*)
- **`warning` and `destructive` do not glow at rest.** Attach it to `hover:` / `focus-visible:`. A dangerous action that glows all the time reads as "pressable right now"
- **Do not glow in a color different from the surface's.** Wrapping a red surface in the primary color's glow looks broken in a world made of light
- **Only the primary action (`default`) glows from rest.** There is one "live action right now" on a screen, so this is a state indicator, not constant decoration
- **`destructive` takes a larger hover / active opacity difference than other variants** (`/75` and `/60`; others are `/85` and `/70`). On a dark color scheme a slight drop in opacity produces no contrast with the background, and hover does not reveal that it can be pressed

### Boundary Lines

- **Use `border-input` if the line marks an element's boundary, and `border-border` if it divides sections.** Things whose input area becomes unclear without a border, such as `Input` / `Textarea`, and variants that consist only of an edge, such as `Badge`'s `outline`, all take `input`
- They are split because **the contrast requirements differ**. The boundary of an input area is subject to **WCAG 1.4.11's 3:1 against adjacent colors**, and `border`, as a divider, has only 1.2–1.6:1 on any surface and does not meet it. `input` is defined to meet 3:1 on all of `background` / `card` / `popover` / `muted` / `accent`. Dividers are outside that criterion, so `border` is fine there
- **Do not use `primary` and `emphasis` for body text color.** These two are colors for surfaces and shapes and meet only WCAG 1.4.11's **3:1**. On text they fall below AA's 4.5:1. Use `secondary` / `success` / `warning` / `destructive` / `info` for links and status copy (all meet 4.5:1). Icons are non-text, so 3:1 is enough and `primary` may be used
- The basis of the decision is in the token values, so when you change the color scheme, check this section first and **re-measure the ratios**. A reason written in a caller's comment goes unnoticed when the token is fixed

### Decorative Rings

`outline` can draw only one line per element, and it is always drawn outside. The following requirements cannot be met with `outline`, so use `ring-*`.

- Stacking rings, or compositing a ring with a shadow
- Drawing inside the element (`ring-inset`). Used inside `overflow: hidden` or on elements flush against the container's edge

Wanting to transition a change in thickness is not a reason to choose `ring`. `outline-width` can also be transitioned,
so placing `outline-solid outline-0` as the base and changing only the thickness, as in `hover:outline-4`, gives the same result.

The way `ring-offset` paints the gap with the background color is a defect for focus but a feature for decoration. `ring-2 ring-background`, which separates overlapping `avatar`s with a background-colored band, is an example.

## Undefined Classes

Tailwind emits no CSS for classes it does not recognize, and reports nothing about it. The element is simply rendered without that declaration, so defects such as **a transparent surface, a missing focus ring, an invisible selected state** do not appear until you look in a browser. shadcn output assumes tokens held by the upstream theme, so this can slip in with every import.

Detection is done by `pnpm check:classes`. It actually builds `globals.css` and checks that every class written in the `.tsx` files under `src/components` appears in the output. In CI it **runs on every PR** — this check is not change-driven, because classes that assume the upstream theme can drop out of the output through other changes too.

**Do not "delete it because it has no definition".** Having no output and being forbidden to write it are different things. `animate-in` / `fade-in-*` / `slide-in-from-*`, which emit no CSS because no animation plugin is adopted, and `group` / `peer`, which are only referenced from descendant variants, intentionally have no CSS. They are listed with their reasons in `KNOWN_WITHOUT_CSS` in [`scripts/check-classes.ts`](./scripts/check-classes.ts); when you find a new one, add it there instead of removing it from the implementation. Removing it from generated output loses the information that output carried.

On the other hand, the following are "broken, not a token matter" and are fixed immediately.

- Import paths that do not resolve (the generated `@/components/design-system/button` does not match this repository's layout)
- A mismatch between the type and the element actually rendered
- Code that fails lint / typecheck
- a11y wiring such as a missing accessible name

## CSS Variable Prefixes

This repository's CSS variables are `--color-*` (primitive) and `--semantic-color-*` (semantic). The unprefixed `var(--primary)` / `var(--secondary)` / `var(--muted)` / `var(--foreground)` used by shadcn output **resolve to nothing**.

When an unresolved variable is an argument of `color-mix()` or `oklch(from …)`, the value becomes invalid and **the whole declaration is discarded, so the surface does not appear at all**. Class-name detection does not catch this, so detect variables separately on import.

```bash
grep -ohE 'var\(--[a-z0-9-]+\)' src/components/<layer>/**/<component>/*.tsx \
  | sed 's/var(//;s/)//' | sort -u | grep -vE '^--(radix|tw)-' \
  | while read -r v; do grep -qF -e "$v:" storybook-static/assets/*.css || echo "未解決: $v"; done
```

`--radix-*` may be excluded because Radix sets them, as may variables a component passes itself through `style`, because that component sets them at runtime.

## Recurring Implementation Patterns

Things that take the same shape across components, and the reasons for choosing that shape. Individual component READMEs assume this section and do not repeat it.

### `data-slot`

- **Put `data-slot` on every element rendered.** The value is kebab-case: the root is the component's concept name (`dialog`), and a subcomponent is `<concept>-<part>` (`dialog-content`). Both selectors with which a parent styles a child's part (`*:data-[slot=alert-title]:text-warning`) and the handle tests use to get elements not reachable by role ([docs/testing-conventions.md](../../docs/testing-conventions.md#component-and-hook-tests--testing-library-principles)) read this value
- `pnpm check:classes` takes candidates only from `className` and the arguments of `cn()` / `cva()`, so a `data-slot` value is never mistaken for a class

### Variant Definitions

- Variant names are held by constants in `<component-name>.definition.ts`, and the `variants` of `cva` look up those constants as computed keys (`[BUTTON_VARIANT.DEFAULT]: "…"`). The name is written in only one place, so adding to a value set never grows only one of the definition and the class table
- When to use each value is enumerated in the doc of the constant on the definition side ([TSDoc Standard](#tsdoc-standard)). Only classes are written on the `cva` side

### Adjust state during render; create resources in effects

- **Adjustments that reset state based on the difference from the previous value happen during render, not in an effect.** Putting adjustments such as "keep it once satisfied" (`use-latched.ts`), collapsing a menu at the navigation target, or returning to the first step when steps decrease and the current position falls outside the sequence into an effect inserts one render before the adjustment — the destination's content shows for one frame still covered by the menu, or it renders at the position of a step that does not exist. When `setState` is called during render, React discards that render's result and renders again, so the caller gets the adjusted value. `react-hooks/no-deriving-state-in-effects` checks this mechanically
- **Create resources that need releasing (object URLs and the like) in an effect.** Created during render, the ones from discarded renders remain without being disposed. This trips `react-hooks/set-state-in-effect`, so add the reason "a sync that involves creating a resource" on the suppression line
- An updater function only returns the next state from the state. Calling another state's updater inside an updater repeats the side effect when React re-runs the updater. Combine related values into one state
- **Give a button whose `type` changes from `button` to `submit` at the same position a different `key`.** Reconciled as the same element at the same position, the DOM element is reused and `type` is rewritten at the moment of the press. The click's default action runs after the handler, so it advances and then submits the form too
- Content that holds **things that cannot be restored once removed** even while unused (an editing surface that can only be built from the content at the time it opened, an input included in the submission) is hidden with `hidden` and kept mounted. The decision is owned by `use-latched.ts` ([Operations](#operations))

### Client Islands and Native Forms

- **A control inside a surface that a Portal moves out of the form is not included in the submission even with a `name`.** Carry the selected value in a hidden input placed on the trigger side. For multiple selection, place as many hidden inputs with the same `name` as there are selected values
- **Hidden inputs are outside constraint validation, so `required` has no effect.** Indicating that a field is required is owned by `Field` / `RequirementBadge`, and actual enforcement by the Server Action or server-side validation. Write "does not carry the required attribute" in the component's README
- A file input resets `value` to empty after reading, so that `change` fires even when the same file is chosen again. Files received by drop do not go through the selection dialog, so unless written back into the input they are not included in a native form submission

### When suppressing Biome for assistive-technology wiring

Biome's a11y rules look only at the shape of elements, so they can fire even when the semantics are correct. **Do not regress the implementation; suppress the finding with a reason on that line** ([docs/rules.md](../../docs/rules.md#ui-parts)). Two recur.

- **A region that scrolls locally has `tabIndex={0}` even though it is non-interactive** (`noNoninteractiveTabindex`). Without it, the region cannot be scrolled with the keyboard alone, which violates WCAG 2.1.1
- **A grouping that is "not a set of multiple controls", such as one control and its decorative outer frame or one slide of a carousel, is expressed with `role="group"`** (`useSemanticElements`). `fieldset` represents a set of multiple controls with a `legend`, so using it there makes the semantics a lie

### Surfaces Layered over the Content

- **Surfaces that a Portal places over the content (notifications, menus, dialogs) have an opaque background.** A tint such as `bg-warning/10` used by an in-context `Alert` assumes the underlying layer is the content's surface. When reusing the same variant's classes on an overlapping surface, give it a background on the surface side
- On a band that places a region alongside, `main` becomes a flex item and by default cannot be narrower than its content's minimum width. When columns or a long word push the minimum width up, `main` overflows its parent and a horizontal scroll appears across the whole screen. The content side cannot prevent this, so the layout shell shrinks with `min-w-0`

## Placement and Naming

Next.js and React do not prescribe the directory structure, directory names, or the placement of tests and stories under `components/`. Next.js's file-system conventions are limited to route segments and special files under `app/`, and what React prescribes is things like PascalCase for component identifiers used in JSX. The following are adopted as this repository's conventions, not framework conventions.

- A component co-locates its implementation, tests and stories in one directory. To avoid three or more files piling up side by side, the base form is `design-system/<purpose>/<component-name>/` (`<layer>/<component-name>/` for `patterns` and `app-starter`)
- The component README is placed in the same directory as the implementation, tests and stories. It is not a transcription of props; it shows, under headings, the purpose, role, public components, use cases, responsibility boundaries, and what Storybook / tests check. The role of each public component is given as a table
- **A directory that has a `README.md` is a component.** `pnpm check:ui` uses this as its only marker to reconcile the ledger with what exists. Enumerating role directories is not adopted because the script would have to be fixed every time a role is added, and a role someone forgot to add would silently drop out of the ledger
- **Do not put a README in a grouping directory such as `design-system/<purpose>/`.** If you do, it is itself counted as a component and fails as having no record in the ledger. What a grouping directory takes on is owned by the list further down in this README
- Do not decide whether something is a component by whether it has an implementation file. Components that have only stories, like `layout-patterns`, exist, so inferring identity from contents breaks down
- When an SSR-first implementation and a client-island implementation exist side by side for the same UI concept, the directory and file names are `<concept>-native` / `<concept>-client`, and the public component names are `ConceptNative` / `ConceptClient`. `client` represents the usage boundary; the current vendor name such as Radix is written only in the README
- A `native` / `client` pair separates only the runtime implementation. Even at the time of the import audit, align the basic design of size, semantic tokens, focus, disabled and invalid as far as possible, and check SSR, forms, a11y and the public API. Full alignment including layout, motion and visual regression is finished while looking at Storybook when building the design system. Native-specific parts such as OS-rendered popups need not match pixel-perfectly
- A component's static constants, value sets, types and look definitions go in `<component-name>.definition.ts`. The public component responsible for rendering and interaction goes in `<component-name>.tsx` and imports the static definitions
- Public constants for value sets are defined in the form `export const BUTTON_SIZE: Readonly<{ ... }> = { ... }`
- Even when not public API, if several files use values of the same UI concept, decide one owner, define them there, and reference them from each file. Values that represent JSX / type syntax itself, such as native HTML element names, may be written directly
- Layer, purpose and component names are lowercase kebab-case. This aligns with the kebab-case convention of all source and is not enforced by Next.js / React
- `foundation` is not an individual component but the purpose of the base that supports UI across the board. `typeset`'s typesetting and `scrollbar`'s scrollbar display belong to it, and both are imported from `globals.css`. What they share is that they **render no visible element**: some are CSS only, and some are client islands that only carry attributes and return no rendered output (the `surface` bridge). There are two ways the CSS applies: one declares an inherited property once on `:root` and applies with no opt-in, like `scrollbar`; the other is opt-in and applies only within the range marked `.typeset`, like `typeset`. State which one at the top of the README
- A hook shared by several components goes in **the shallowest common place that covers its range**. One shared within the same purpose goes directly under the purpose directory (`overlay/use-overlay-history.ts` is pulled by `dialog` / `sheet` / `drawer` / `alert-dialog`); one that spans layers goes directly under `components/` (`use-latched.ts`). It has no README, so it is not counted as a component

### Layers

Directly under `components/`, split by layer. **A layer is decided by "who rewrites the component", an axis separate from its purpose.** Apply the contract test first.

| Layer | What it takes on | How it is split |
| --- | --- | --- |
| `design-system` | Components that do not know the contract and **gain no role from reading it**. Things that compose but stay closed within their role, like `list` using `separator`, go here | Split by purpose |
| `patterns` | Components that do not know the contract but **compose several roles**. Their purpose cannot be fixed to one, so they are not split | Not split |
| `shell` | Components whose **placement and count are decided by the component itself**. `toaster` once in the root layout, `content-container` inside `main`, `page-header` at the top of the page | Not split |
| `app-starter` | Components that **know the backend contract**: the meaning of HTTP statuses, submission results, upload steps and so on. Meant to be rebuilt | Not split |

Apply the tests in this order: **contract → mount position → how the role closes**. Changing the order makes the destination of a component that both knows the contract and has a fixed mount position waver.

Dependencies flow one way: `app-starter / shell → patterns → design-system`. A reverse flow is a sign that the layers do not hold, so when you find one, doubt the layer decision.

**Do not use "because it is an app feature unit" to decide the layer.** A feature itself, like `import-export`, shows up in neither vocabulary nor structure, so making it a condition always falls back to subjectivity. What is treated as a feature unit is listed as a roster by `layer: app-starter` in [`shadcn-manifest.yaml`](./shadcn-manifest.yaml), and the term refers only to what is listed there.

Inside `design-system`, the direction of dependencies does not matter. Combining within the same purpose, like `list` and `separator`, is normal.

### Purpose Directories under `design-system/`

`design-system/` has many entries, so it is split by purpose. `patterns/` and `app-starter/` hold things whose purpose cannot be fixed to one, so they are not split. The source of truth for placement and its check are owned by the `shadcn-manifest.yaml` item under "Operations".

| Directory | What it takes on | What it does not hold |
| --- | --- | --- |
| `action` | The starting point of a user's action itself. It holds only the act of pressing or switching | Deciding what happens. The caller passes it as a callback |
| `form` | Components that receive a value and submit it as a form value | Validation rules, submission target, interpreting the submission result |
| `overlay` | Components that open a surface over the content from a trigger. They hold opening/closing, focus and Escape | The surface's content. The caller passes it as children |
| `navigation` | Components that indicate a destination, and components that handle the move itself | Building the destination URL. The caller passes it |
| `display` | Components that show received content in readable form | Formatting values. The formatters in `model/` own that |
| `status` | Components that convey how processing is going right now | Deciding the state. The caller decides and passes it |
| `container` | Frames that hold content, and components that control how that surface looks | The structure of the content. The caller builds it |

When a purpose spans two, take **the side without which the component cannot exist**. `selection-toolbar` is subordinate to the surface's state of selection, so it goes in `container`; `copy-button` is mainly the act of pressing, so it goes in `action`.

```text
components/
├── design-system/                  ← knows no contract; its role is closed
│   ├── foundation/                 ← a grouping directory; no README here
│   │   └── typeset/
│   │       ├── typeset.css
│   │       ├── typeset.stories.tsx
│   │       └── README.md
│   ├── action/
│   │   └── button/
│   │       ├── button.definition.ts
│   │       ├── button.tsx
│   │       ├── button.test.tsx
│   │       ├── button.stories.tsx
│   │       └── README.md
│   ├── form/  overlay/  navigation/  display/  status/  container/
│   ├── layout/
│   └── rich-text/
├── patterns/                       ← spans roles but knows no contract
│   ├── wizard-form/
│   └── table/                      ← nested; the parent decides where it goes
│       ├── columns.tsx
│       ├── README.md
│       └── static-data/
├── shell/                          ← mount position and count are fixed
│   ├── app-shell/
│   ├── toaster/
│   ├── pull-to-refresh/
│   ├── content-container/
│   └── page-header/
├── app-starter/                    ← knows the backend contract
│   └── auth-state-feedback/
│       ├── auth-state-feedback.definition.ts
│       ├── auth-state-feedback.tsx
│       └── README.md
├── scripts/
├── cn.ts
├── icon.ts
├── use-latched.ts
└── shadcn-manifest.yaml
```

## Storybook Display Conventions

- The first segment of a story's `title` is **the same as the component's inventory heading**. The value's source of truth is `as` in [`shadcn-manifest.yaml`](./shadcn-manifest.yaml), and `pnpm check:ui` reconciles them. There are 13: `Foundation` / `Action` / `Form` / `Overlay` / `Navigation` / `Display` / `Status` / `Container` / `Layout` / `Feedback` / `Rich Text` / `View State` / `Sugar`. In `design-system`, the directory, the inventory and the sidebar form the same sections. Layers not split by purpose (`patterns` / `shell` / `app-starter`) have no purpose headings in the inventory, so their sidebar section is decided by `as` alone
- Granularity (a minimal standalone component or a composition) is not made into a sidebar section. As an implementation grows, subcomponents increase, so granularity is an attribute that changes. Only attributes that do not change are baked into placement
- **Feature stories do not go under the 13 headings above.** The inventory is the list of components this kernel owns, and feature components are not owned here. The feature side uses the following two first segments
  - `Page/<feature>/<screen>` — the screen composition (`features/<name>/<screen>/view.tsx`). The place to check how the whole screen looks in states that involve no fetching
  - `Features/<feature>/…` — screen-specific components (`features/<name>/<screen>/ui/<part>/`). The following segments take the same shape as the implementation's directories
- **What fetches (`page-content.tsx`) is not made into a story.** A story cannot hold the real fetch, so all it can check is the composed result. Verifying the fetch is owned by unit tests
- **`Icons/` is not a component heading either.** It is the inventory of the icons [`icon.ts`](./icon.ts) distributes ([`.storybook/icon.stories.tsx`](../../.storybook/icon.stories.tsx)), and for the same reason as `Tokens/` it appears in neither the layers nor the inventory. It reads the public surface at runtime rather than transcribing names, so adding to `icon.ts` makes it appear on this screen
- **`Tokens/` is not a component heading.** It is the inventory of design tokens ([`.storybook/design-token.stories.tsx`](../../.storybook/design-token.stories.tsx)); it is not a component the app renders, so it appears in neither the `components/` layers nor the inventory. The convention directly under `components/` splits layers by "who rewrites it", so adding it there as a fifth layer would make the convention a lie. It lives in `.storybook/` as Storybook's own material, and `stories` in `main.ts` picks it up
- The sidebar order is owned by `storySort` in [`.storybook/preview.tsx`](../../.storybook/preview.tsx). It is placed in the order **`Page` → `Features` → `Tokens` → `Icons` → inventory**, alphabetical within each. While building, the first two are what you open, and the inventory, as reference material, takes fewer steps to search when it is at the back. The inventory's own order is not carried into the sidebar. The inventory creates a reading order by layer and purpose, but the sidebar is where you look up the component you want by name, so the two orders need not match
- The coordinates and spacing of the Storybook Canvas are not the app's layout conventions. `layout: "centered"` is a story-side display setting that makes a small standalone UI easier to check. For components that spread to the full screen or width, choose `fullscreen` or `padded` per story
- Props inferred by Controls cannot create arbitrary React elements. Props that need a single element child, such as `asChild`, do not expose a Control; prepare a dedicated story that makes the needed child explicit with `render`
- **Every story file carries a component description and a description per story.** The component description states what the component is for and **when to use it instead of a similar neighboring component**. Components that look alike but have different responsibilities, such as `Accordion` and `Collapsible`, or `Alert`, `Toaster` and `FeedbackState`, can only be chosen between when placed side by side. A story description states what that story shows
- There are two places for descriptions: the whole component in `parameters.docs.description.component`, and each story in the JSDoc immediately before its export (or `parameters.docs.description.story`). **Both are rendered only on the Docs page.** This is why [`.storybook/preview.tsx`](../../.storybook/preview.tsx) sets `tags: ["autodocs"]`; removing it leaves the written descriptions shown nowhere
- Components with no width of their own (inputs, cards, menu triggers) are wrapped in a `div` given a width in the story's `decorators`. The width is a story-side display setting and belongs neither to the component nor to the app's layout. Add `max-w-[calc(100vw-2rem)]` so it is not cut off on narrow screens
- States that appear only after interaction (an open menu, a chosen candidate, the list after submitting) are fixed in the story by interacting in `play`. If the story holds only the closed form, the component's main form appears neither in the catalog nor in visual regression. How to get a surface that a Portal has placed directly under `body` is owned by [docs/testing-conventions.md](../../docs/testing-conventions.md#component-and-hook-tests--testing-library-principles)

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: fetch` — owns no external IO such as `fetch`. Fetch results are received as props from the caller | violation. Imports of `adapters` are failed by machine, so what is checked here is calls to the global `fetch` | [0021](../../docs/adr/0021-frontend-responsibility.md) (what each kernel is responsible for). Machine: ESLint boundaries |
| `forbidden: config` — does not import `config` and does not read `process.env` | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) dependency matrix. Machine: ESLint boundaries and `NODE_RUNTIME_ACCESS` in `architecture.ts` |
| `forbidden: capabilities` — does not import `capabilities`. Compositions that need runtime capabilities are done in features | violation | [0022](../../docs/adr/0022-capabilities-kernel.md) prohibitions. Machine: ESLint boundaries |
| `forbidden: stores` — does not import `stores`. Compositions that need cross-cutting state are done in features | violation | [0023](../../docs/adr/0023-stores-kernel.md) prohibitions. Machine: ESLint boundaries |
| `forbidden: business-state` — the only state it may hold is UI state needed for display (open/closed, the selected item, a notification queue and so on); it holds no copy of fetched business data and no business progress state | violation if fetched data is copied into its own state. suggestion when it cannot be told whether the state is UI or business | [0021](../../docs/adr/0021-frontend-responsibility.md) (what each kernel is responsible for) / this README, "What Does Not Belong Here" |
| Layers (`design-system` / `patterns` / `shell` / `app-starter`) are decided by "who rewrites it", and dependencies flow one way: `app-starter / shell → patterns → design-system` | A reverse import is a violation. suggestion when the placement does not match the order of the tests (contract → mount position → how the role closes), such as a component that knows the contract living outside `app-starter` | this README, "Layers" |
| The components placed here are used by several features. UI dedicated to one feature goes inside that feature | suggestion if only one feature uses it | [0021](../../docs/adr/0021-frontend-responsibility.md) criteria 1 and 2 for what a kernel accepts / this README, "Operations" |
| SSR first — `"use client"`, Radix and Portals are used only in client islands with interaction requirements native elements cannot meet | suggestion | this README, "Operations" / [docs/rules.md](../../docs/rules.md#ui-parts) |
| Color and spacing go through semantic tokens. Class merging goes through `cn.ts`; `clsx` / `tailwind-merge` are not used directly | Direct use of primitive tokens and merging that bypasses `cn.ts` are violations | this README, "Operations" |
| Focus indicators are written with `outline` and decorative rings with `ring`, and boundary lines and body text color follow the subsections of "Focus indicators versus decorative rings" | The shapes those subsections forbid by name (using `ring` for focus, combining `focus-visible:outline-2` with `outline-none`, using `primary` / `emphasis` for body text color) are violations | this README, "Focus indicators versus decorative rings". Font weight is by machine: `project-rules/no-raw-font-weight` |
| Adjustments that reset state from the difference with the previous value happen during render, and creating resources that need releasing goes in an effect | violation if the adjustment is in an effect. violation if a `set-state-in-effect` suppression has no reason | this README, "Recurring Implementation Patterns". Machine: ESLint `react-hooks/no-deriving-state-in-effects` / `react-hooks/set-state-in-effect` |
| Submission does not rely on controls inside a surface that a Portal moves out of the form; values are carried in hidden inputs. Regions that scroll locally are focusable | violation if `name` is placed only on controls inside the Portal. violation if a region with `overflow-*` has no `tabIndex` | this README, "Recurring Implementation Patterns" / [docs/rules.md](../../docs/rules.md#ui-parts). The rest of a11y is by machine: `vitest-axe` ([0091](../../docs/adr/0091-test-verification-methods.md)) |

## Related ADRs

Per-component READMEs do not have this section. References to ADRs are gathered in this layer's README.

- [0021](../../docs/adr/0021-frontend-responsibility.md) — layer responsibilities and import boundaries. The basis for pulling only `model` and `errors` here
- [0026](../../docs/adr/0026-layout-shell-mount.md) — where the layout shells and Providers of `shell/` are mounted
- [0027](../../docs/adr/0027-directory-structure.md) — physical placement and co-location. The shape that puts the implementation, tests, stories and README in one directory
- [0050](../../docs/adr/0050-styling-strategy.md) — Tailwind and design tokens, and resolving classes with `cn()`
- [0051](../../docs/adr/0051-styling-system.md) — the token system, how steps are cut, motion, and printing
- [0052](../../docs/adr/0052-ui-component-policy.md) — the choice of starting from shadcn/ui, and the convention of closing the icon supplier into `icon.ts`
- [0053](../../docs/adr/0053-ui-component-interaction-seam.md) — the a11y seam around interaction such as opening/closing, focus and history
- [0054](../../docs/adr/0054-ui-catalog-storybook.md) — operating Storybook as the catalog
- [0080](../../docs/adr/0080-error-handling.md) — normalizing the backend errors `app-starter` knows about, and the division of responsibility with the screen side
- [0091](../../docs/adr/0091-test-verification-methods.md) — the division between stories and unit tests, and building in automated a11y checks
- [0100](../../docs/adr/0100-accessibility-target.md) — the accessibility level to reach

## Component Inventory

Every component this repository has. Before modifying, deleting or replacing one, check here whether a component with the same responsibility already exists. Each row's summary is a one-line abstract; for responsibility boundaries, public API and what is checked, each README is the source of truth.

The headings are layer and purpose, and their source of truth is `layer` and `as` in [`shadcn-manifest.yaml`](./shadcn-manifest.yaml). Only `design-system` is split by purpose; `patterns` and `app-starter` hold things whose purpose cannot be fixed to one, so they are not split.

### design-system

Components that do not know the contract and gain no role from reading it. They stay as the foundation.

#### foundation

The base that supports UI across the board. It renders no visible element.

| component | Summary |
| --- | --- |
| [`print`](./design-system/foundation/print/README.md) | CSS base that sets the presentation when output to paper or saved as PDF |
| [`scroll-fade`](./design-system/foundation/scroll-fade/README.md) | CSS base that fades the edges of a horizontal scroll area with the scrollbar hidden, showing there is more |
| [`scrollbar`](./design-system/foundation/scrollbar/README.md) | CSS base that defines in one place the scrollbar look shared by every scrolling surface |
| [`surface`](./design-system/foundation/surface/README.md) | Applies a design-token family to a subtree and the Portal's exit |
| [`shimmer`](./design-system/foundation/shimmer/README.md) | CSS base that shows work whose progress cannot be measured is still running, with a band flowing over the surface |
| [`typeset`](./design-system/foundation/typeset/README.md) | CSS base that displays sanitized Markdown / HTML with a consistent typesetting rhythm |

#### action

Components that are the starting point of an action.

| component | Summary |
| --- | --- |
| [`button`](./design-system/action/button/README.md) | Starts a user action |
| [`button-group`](./design-system/action/button-group/README.md) | Groups several actions on the same target into one adjacent, continuous strip |
| [`copy-button`](./design-system/action/copy-button/README.md) | Copies a value to the clipboard |
| [`print-button`](./design-system/action/print-button/README.md) | Prints the document being displayed |
| [`toggle`](./design-system/action/toggle/README.md) | Shows, as a pressed state, whether a display is applied now, and switches it |

#### form

Components that receive a value and submit it as a form value.

| component | Summary |
| --- | --- |
| [`calendar`](./design-system/form/calendar/README.md) | Chooses a date or a date range |
| [`checkbox-client`](./design-system/form/checkbox-client/README.md) | Client island for custom checkbox interaction, including indeterminate |
| [`checkbox-native`](./design-system/form/checkbox-native/README.md) | Submits a binary consent, setting or multiple choice as a native form |
| [`combobox-client`](./design-system/form/combobox-client/README.md) | Chooses one item from many candidates while narrowing them by typed text |
| [`date-picker-client`](./design-system/form/date-picker-client/README.md) | Chooses a single date from a calendar popup |
| [`editable-table`](./design-system/form/editable-table/README.md) | Edits by placing native form controls in table cells |
| [`field`](./design-system/form/field/README.md) | Composes a label, input, description and error into one form field |
| [`input`](./design-system/form/input/README.md) | Displays and submits a single-line native `input` |
| [`input-group`](./design-system/form/input-group/README.md) | Holds unit symbols, icons and auxiliary actions in one continuous frame with the input |
| [`label`](./design-system/form/label/README.md) | Tells the user the item name of a form control |
| [`multi-select-client`](./design-system/form/multi-select-client/README.md) | Chooses several values at once with checkboxes while the candidates stay collapsed |
| [`radio-group-client`](./design-system/form/radio-group-client/README.md) | Client island for custom interaction native radios cannot provide |
| [`requirement-badge`](./design-system/form/requirement-badge/README.md) | Shows next to the label whether an input is required or optional |
| [`radio-group-native`](./design-system/form/radio-group-native/README.md) | Chooses one from static candidates and submits it as a native form |
| [`search-field-client`](./design-system/form/search-field-client/README.md) | Search field that follows keystrokes and notifies a keyword search |
| [`search-field-native`](./design-system/form/search-field-native/README.md) | Places a keyword search field as a GET form that needs no JavaScript |
| [`segmented-input`](./design-system/form/segmented-input/README.md) | Receives a fixed-length code split into per-digit segments |
| [`select-client`](./design-system/form/select-client/README.md) | Provides a custom popup and keyboard / focus interaction native selects cannot provide |
| [`select-native`](./design-system/form/select-native/README.md) | Chooses one from a small static set of candidates and submits it as a native form |
| [`slider-client`](./design-system/form/slider-client/README.md) | Specifies a number or range by continuous interaction. Lower and upper bounds can be chosen on one control surface |
| [`slider-native`](./design-system/form/slider-native/README.md) | Native range that specifies a number by continuous interaction |
| [`switch-client`](./design-system/form/switch-client/README.md) | Switches a setting on / off and reflects the result on screen immediately |
| [`switch-native`](./design-system/form/switch-native/README.md) | Switches a setting on / off as a native form value |
| [`textarea`](./design-system/form/textarea/README.md) | Displays and submits a multi-line native `textarea` |
| [`toggle-group-client`](./design-system/form/toggle-group-client/README.md) | Lays out related toggles as one set and reflects them immediately in browser-side state |
| [`toggle-group-native`](./design-system/form/toggle-group-native/README.md) | Lays out related toggles as one set and submits the chosen value as a form |

#### overlay

Components that open a surface over the content from a trigger.

| component | Summary |
| --- | --- |
| [`alert-dialog`](./design-system/overlay/alert-dialog/README.md) | Confirms an irreversible action such as deletion before running it |
| [`command`](./design-system/overlay/command/README.md) | Searchable list that narrows candidates by typed text. Can be placed as a surface or as a modal |
| [`context-menu`](./design-system/overlay/context-menu/README.md) | An accelerator over visible paths that brings target-specific actions to hand on right-click |
| [`dialog`](./design-system/overlay/dialog/README.md) | Opens auxiliary display or ordinary editing as a modal covering the screen |
| [`drawer`](./design-system/overlay/drawer/README.md) | Modal panel pulled out from the screen edge that can also be closed by dragging |
| [`dropdown-menu`](./design-system/overlay/dropdown-menu/README.md) | Opens a list of actions from a trigger |
| [`hover-card`](./design-system/overlay/hover-card/README.md) | Shows a short supplement near the trigger on hover / keyboard focus |
| [`image-viewer`](./design-system/overlay/image-viewer/README.md) | Shows a thumbnail-listed image large when pressed |
| [`popover`](./design-system/overlay/popover/README.md) | Opens supplementary content or auxiliary actions near the trigger |
| [`sheet`](./design-system/overlay/sheet/README.md) | Opens auxiliary navigation or a filtering surface as a modal panel that appears from the screen edge |
| [`tooltip`](./design-system/overlay/tooltip/README.md) | Adds a short supplement to an element whose meaning is not self-evident on its own |

#### navigation

Components that indicate a destination, and components that handle the move itself.

| component | Summary |
| --- | --- |
| [`breadcrumb`](./design-system/navigation/breadcrumb/README.md) | Shows the hierarchy up to the current location and lets the user go back to upper levels |
| [`menubar`](./design-system/navigation/menubar/README.md) | Groups actions on the whole screen into per-category menus, shown as an always-visible horizontal row |
| [`navigation-menu`](./design-system/navigation/navigation-menu/README.md) | Lays out the main destinations and opens lower levels as needed |
| [`pagination`](./design-system/navigation/pagination/README.md) | Represents page movement for a list that navigates by URL |
| [`tabs-client`](./design-system/navigation/tabs-client/README.md) | Switches between several panels while staying on the same URL |
| [`tabs-native`](./design-system/navigation/tabs-native/README.md) | Shows the same target from several perspectives and switches the perspective by URL |

#### display

Components that show received content in readable form.

| component | Summary |
| --- | --- |
| [`activity-timeline`](./design-system/display/activity-timeline/README.md) | Displays events that happened in time order |
| [`amount-with-reference`](./design-system/display/amount-with-reference/README.md) | Displays an amount and a reference conversion into another currency that appears on toggle |
| [`avatar`](./design-system/display/avatar/README.md) | Identifies a user or organization with a small circle |
| [`badge`](./design-system/display/badge/README.md) | Visually supports a short category or status |
| [`bubble`](./design-system/display/bubble/README.md) | Displays one chunk of speech or a notification as a speech bubble. Inside `Message` it follows the sender's direction |
| [`card`](./design-system/display/card/README.md) | Makes related information and auxiliary actions into one visual group |
| [`chart`](./design-system/display/chart/README.md) | Displays trends and breakdowns of aggregated values with per-series color and shape |
| [`json-ld`](./design-system/display/json-ld/README.md) | Embeds the screen's structured data as an `application/ld+json` script. Its reader is search engines, and it has no visible element |
| [`kbd`](./design-system/display/kbd/README.md) | Displays a key the user presses as keyboard input |
| [`key-value-list`](./design-system/display/key-value-list/README.md) | Displays pairs of item names and values in a list |
| [`keyboard-shortcut`](./design-system/display/keyboard-shortcut/README.md) | Presents an action that can be run from the keyboard as a pair of description and keys |
| [`list`](./design-system/display/list/README.md) | Stacks rows of the same shape vertically and displays icon, heading, description and auxiliary actions in a consistent structure |
| [`marker`](./design-system/display/marker/README.md) | Places a one-line annotation or divider label one step quieter than the body text |
| [`media-image`](./design-system/display/media-image/README.md) | Consistently applies fixed aspect ratio, CSS Skeleton and LCP preload to `next/image` |
| [`message`](./design-system/display/message/README.md) | Displays one message that has a sender and a body |
| [`separator`](./design-system/display/separator/README.md) | Separates groups of adjacent content |
| [`stepper`](./design-system/display/stepper/README.md) | Lays out known, finite steps in defined order and shows the current position and the steps not yet reached |
| [`table`](./design-system/display/table/README.md) | Displays structured data where the relation between columns and rows is needed for the user's understanding |
| [`text-highlight`](./design-system/display/text-highlight/README.md) | Shows where in the text a searched term matched |

#### status

Components that convey how processing is going right now.

| component | Summary |
| --- | --- |
| [`alert`](./design-system/status/alert/README.md) | Conveys caution, failure and the next action to take, in context |
| [`progress-client`](./design-system/status/progress-client/README.md) | Shows progress updated on the browser side as the relation between a value and its maximum |
| [`progress-native`](./design-system/status/progress-native/README.md) | Shows the progress of a task of known length as a native `progress` |
| [`skeleton`](./design-system/status/skeleton/README.md) | Temporarily shows a shape close to the final content while loading |
| [`spinner`](./design-system/status/spinner/README.md) | Shows on the spot that a short task with no visible end is in progress |

#### container

Frames that hold content, and components that control how that surface looks.

| component | Summary |
| --- | --- |
| [`accordion`](./design-system/container/accordion/README.md) | Checks several related details by opening only the items needed |
| [`aspect-ratio`](./design-system/container/aspect-ratio/README.md) | Fits a child element into a frame with the specified aspect ratio |
| [`carousel`](./design-system/container/carousel/README.md) | Browses content of the same kind in sequence within limited width |
| [`collapsible`](./design-system/container/collapsible/README.md) | Checks one piece of auxiliary content by opening it only when needed |
| [`direction`](./design-system/container/direction/README.md) | Provider that distributes text direction to the components beneath it |
| [`message-scroller`](./design-system/container/message-scroller/README.md) | Handles the scroll position of a list that keeps being appended to, following new items only while at the end |
| [`resizable`](./design-system/container/resizable/README.md) | Lets the user grab and move the boundary between adjacent display regions to decide the allocation |
| [`scroll-area`](./design-system/container/scroll-area/README.md) | Scrolls only part of the content locally |

#### layout

Composition examples that build a page's structure.

| component | Summary |
| --- | --- |
| [`layout-patterns`](./design-system/layout/layout-patterns/README.md) | Composition examples that build a page's structure with utilities only. Exposes no component |

#### rich-text

Components that handle text the writer has given structure.

| component | Summary |
| --- | --- |
| [`rich-text-content`](./design-system/rich-text/rich-text-content/README.md) | Displays sanitized rich text as body content |
| [`rich-text-editor`](./design-system/rich-text/rich-text-editor/README.md) | Lets formatted body text be written within only what the sanitizer lets through |

### patterns

Components that compose several roles without knowing the contract ([Layers](#layers)).

| component | Summary |
| --- | --- |
| [`action-bar`](./patterns/action-bar/README.md) | A region that gathers actions. It holds only position and stacking order |
| [`filter-bar`](./patterns/filter-bar/README.md) | Displays a list's filtering controls together with the conditions currently in effect |
| [`form-field`](./patterns/form-field/README.md) | Builds the item name, required marker, input, supplement and error in the same order regardless of input type |
| [`selection-toolbar`](./patterns/selection-toolbar/README.md) | Gathers the number of items selected in a list and the actions available on that selection |
| [`table`](./patterns/table/README.md) | Displays structured data where the relation between columns and rows is needed for the user's understanding |
| [`table-view-options`](./patterns/table-view-options/README.md) | Sets together a table's visible columns, display density, pinned columns and per-width visibility |
| [`editable-data`](./patterns/table/editable-data/README.md) | Builds a native form and table from column definitions that include editable cells |
| [`row-actions`](./patterns/table/row-actions/README.md) | Builds the per-row action menu from row action definitions |
| [`static-data`](./patterns/table/static-data/README.md) | Builds column widths, headings, rows and the empty display from read-only column definitions |
| [`wizard-form`](./patterns/wizard-form/README.md) | Frame for input split into several steps. Holds the current position and forward / back movement |

### shell

Components whose mount position is decided by the component itself ([Layers](#layers)).

| component | Summary |
| --- | --- |
| [`app-shell`](./shell/app-shell/README.md) | Outer frame for user-facing screens. Puts the header, navigation, skip link, `main` and footer in the same positions |
| [`admin-shell`](./shell/admin-shell/README.md) | Outer frame for admin screens. Puts the sidebar navigation list, header, skip link and `main` in the same positions |
| [`content-container`](./shell/content-container/README.md) | Aligns the reading width and side margins of page content inside `main` |
| [`page-header`](./shell/page-header/README.md) | At the top of a page, shows that page's name, description and main actions |
| [`toaster`](./shell/toaster/README.md) | Shows the success or failure of a mutation that does not redirect as a temporary notification |
| [`pull-to-refresh`](./shell/pull-to-refresh/README.md) | Pulls down from the top edge of the screen to refetch the current route. Works only in environments with touch |
| [`consent-banner`](./shell/consent-banner/README.md) | Keeps asking at the bottom edge, until a choice is made, whether cookies may be used for optional purposes |

### app-starter

Components that know the backend contract ([Layers](#layers)).

| component | Summary |
| --- | --- |
| [`invalid-query-feedback`](./app-starter/invalid-query-feedback/README.md) | When the URL's conditions fall outside the contract, shows the reason and a way to clear them in place of the main content |
| [`api-error-feedback`](./app-starter/api-error-feedback/README.md) | Shows a client-side API failure as an in-context Alert or as a Dialog that stops the action |
| [`attachment`](./app-starter/attachment/README.md) | Shows one selected file as its type, name, progress and cancel action |
| [`auth-state-feedback`](./app-starter/auth-state-feedback/README.md) | Shows the states sign-in required, insufficient permission and not found, and the way out of them |
| [`connection-status`](./app-starter/connection-status/README.md) | Shows with a short label how continuous receiving is going right now |
| [`cursor-pagination`](./app-starter/cursor-pagination/README.md) | Moves to the previous / next page in a cursor-based list |
| [`feedback-state`](./app-starter/feedback-state/README.md) | Conveys the loading / empty / error / success display states consistently |
| [`load-more`](./app-starter/load-more/README.md) | At the end of a list that accumulates as you read on, shows the state of loading the next part |
| [`file-upload`](./app-starter/file-upload/README.md) | Chooses files to send and tells, before sending, whether their format and size meet the requirements |
| [`form-feedback`](./app-starter/form-feedback/README.md) | Shows the result of a Server Action or native form as a summary and the next action |
| [`form-validation-summary`](./app-starter/form-validation-summary/README.md) | Summarizes the whole form's validation errors in one place and lists links to each input |
| [`import-export`](./app-starter/import-export/README.md) | Shows the result of a file import (including row-level errors) and the state of an export |
| [`navigation-guard`](./app-starter/navigation-guard/README.md) | Confirms before navigating when the user tries to move within the app with unsaved changes |
| [`notification-center`](./app-starter/notification-center/README.md) | The surface for checking persistent notifications: unread count, list, read state, and the no-notifications state |
| [`saved-views`](./app-starter/saved-views/README.md) | Saves a list's filters and sorting under a name so they can be chosen again |
| [`unload-guard`](./app-starter/unload-guard/README.md) | Shows the browser's standard confirmation when the user tries to leave the page with unsaved changes |
| [`upload-preview`](./app-starter/upload-preview/README.md) | Reviews the selected files in a list and replaces, cancels or retries them |
