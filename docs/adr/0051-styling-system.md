# Styling System (Design Tokens, Responsive, Motion, Print)

Taking the "frame" defined by [0050](0050-styling-strategy.md) — **Tailwind as the main axis + a limited allowance for CSS Modules (styled-components / emotion not adopted) / token = CSS variable / the boundary between global and local / dark mode = token switching + following `prefers-color-scheme`** — this ADR makes its contents concrete: **the design token system (naming layers and scales) / breakpoints and container queries / motion policy / print**. Where 0050 defined only the frame "design tokens are CSS variables", this ADR defines "how those CSS variables are structured and how they unfold into the expressive axes of responsive, motion and print".

Following the two principles of [0010](0010-standards-and-non-lockin.md) (standards conformance / non-lock-in), every decision made here rides on **CSS standards and industry patterns that hold even with Tailwind taken out of the justification**. What this repository fixes is the "shape" of the system; it does not fix concrete palette values, scale steps or how motion looks.

## Status

Accepted

## Context

0050 settles adopting Tailwind v4, where `cn()` lives, design token = CSS variable, and dark mode = token switching, but **the contents of the tokens (naming layers semantic vs raw / the scales of spacing, typography, radius and shadow / the correspondence with `@theme`) are only a frame and blank**. Likewise **the breakpoint system**, **the motion policy** and **print / PDF** are outside 0050's range. This ADR bundles these four items into one.

`src/app/globals.css` has a **two-layer structure** (raw color variables on `:root` → aliased to Tailwind color tokens with `@theme inline` → raw variables rebound under `prefers-color-scheme: dark`), and this ADR generalizes it. Starting to write without deciding the naming layers would break the dark mode 0050 adopted (referencing colors by semantic meaning, keeping theme switching closed within swapping tokens), so settling the system takes effect ahead of feature implementation.

## Decision

### 1. Design token system = two layers (primitive / semantic)

- Tokens are split into **two layers**. This separation is an industry pattern that [W3C Design Tokens](https://www.w3.org/community/design-tokens/) is standardizing, and it holds with CSS custom properties alone (**it holds even with Tailwind taken out** = the non-lock-in justification against [0010](0010-standards-and-non-lockin.md)'s "does it hold with the vendor taken out of the justification").
  - **primitive (raw scale)**: raw values with no meaning. **The list of which families are held as primitives is held by `tokens/primitives.json`**, and this ADR does not copy it. They are **registered in Tailwind v4's `@theme`** so that utilities are generated automatically.
  - **Families that use Tailwind's default scale as-is are not SSOT primitives.** font-size / line-height (`--text-*`) and the shadow steps (`--shadow-*` such as `--shadow-sm`) are Tailwind v4 defaults, and `tokens/*.json` does not hold them. Shadows that carry meaning by name (panel shadows, glows) are held by `tokens/themes/**` as semantic-layer tokens and registered as aliases in `@theme`'s `--shadow-*`.
  - **semantic (meaning aliases)**: aliases that name a use. The prefix is `--semantic-color-*` (`background` / `foreground` / `muted` / `border` / `accent`, etc.), and they reference primitives with `var()`. **The default reference surface (components) is the semantic layer**. The prefixes are separated so that detection on the generated CSS can mechanically tell direct primitive references from semantic references.
- **Colors are referenced only through semantic** (a concrete form of 0050's "reference colors through tokens rather than hard-coding them"). Primitives are not sprinkled directly into components.
- **The SSOT of tokens is `tokens/*.json`** ([W3C Design Tokens](https://www.w3.org/community/design-tokens/) format, hand-written), not an artifact generated from a design tool. `tokens/scripts/gen-tokens.ts` generates CSS containing the `@theme` registration of primitives and the semantic aliases, and `src/app/globals.css` imports it. **Generated artifacts are not edited** (the same shape as [0072](0072-api-type-generation.md)'s generated-artifact discipline). Rewriting the CSS directly would double the SSOT, so adding or changing tokens is always done against `tokens/*.json`.
- **Theme switching (light / dark, etc.) is completed solely by rebinding semantic aliases**. This is the linchpin that makes 0050's dark-mode decision hold as a system. There are two switching paths: the default is the OS setting (`prefers-color-scheme`), and when a `data-theme` attribute is present it takes precedence. **Tailwind's `dark:` variant also fires on the same two paths** (`@custom-variant`). A condition that looks at only one of them leaves a state where only fill colors switch and classes with `dark:` do not follow.
- **Do not make a glow the only cue for a state.** In forced-colors mode the UA sets `box-shadow` to `none`, so a glow made from shadows disappears completely. Show the state together with color or wording.
- **Themes other than the default are limited to `screen` media.** Without the limit, the dark color scheme also matches print and the page becomes unreadable (§4).
- **There are two switching axes: color scheme and family.** The color scheme (light / dark) is an axis of the whole document, put on `:root`, and the **family** (user-facing / admin-facing, etc.) is an axis of a subtree, put on `[data-surface]`. The family is separated because the concern of assigning different values to the same semantic token depending on where it is placed stands independently of the color scheme. The two are orthogonal, so they are not shaped so that choosing one decides the other (laying out the four combinations flat, etc.).
  - **The family is completed solely by rebinding semantic aliases** (the same mechanism as the color scheme). A component does not know which family it has been placed in. Holding separate components per family would multiply the same component by the number of families.
  - **The family is placed on a subtree, not on `:root`.** In the App Router, nested layouts cannot touch attributes of `<html>`, so the only path that works is a subtree. However, **it must be at a position that includes the Portal's exit** — overlays are emitted directly under `document.body`, so placing it inside the body content makes only overlays render in the default family (the division of paths is [0050](0050-styling-strategy.md)).
  - **The default family is emitted for the tree without the attribute.** Specificity stacks up: `(0,1,0)` for the family, `(0,2,0)` for the color scheme, and `(0,3,0)` where both apply, and in the same tree the declaration that specifies both family and color scheme wins.
  - **`color-scheme` is declared only by the color-scheme axis.** Emitting it on the family side too would hold the same condition twice, and only one of them would drift.
- **The axes that get scales**: color / spacing / typography (size, line-height, weight, tracking) / radius / shadow / text-shadow / blur. z-index is not tokenized. Which step value means which band is held by this ADR's "Stacking-Order Bands", and the day-to-day rule of using only step values lives on the `docs/rules.md` side.

### 2. Responsive = viewport breakpoints (mobile-first) + container queries

- **Tailwind v4's default breakpoints** (`sm` / `md` / `lg` / `xl` / `2xl`) are ratified. **The boundary values are held by design tokens, not by this ADR** — the SSOT is `breakpoint` in `tokens/primitives.json`, from which `@theme`'s `--breakpoint-*` and `BREAKPOINT` (`src/model/generated/breakpoint.ts`) are generated (the generated-artifact discipline of §1). Switching to a custom scale is also done against the tokens (choosing the values is use-case dependent).
- **Mobile-first (min-width based) is stated explicitly**. It is Tailwind's default behavior and at the same time general CSS practice, not Tailwind-specific (it holds with the vendor taken out; [0010](0010-standards-and-non-lockin.md)). Unprefixed is mobile, and `md:` etc. override additively.
- **The tiers are fixed to three names**: below `md` is mobile, from `md` up to below `lg` is tablet, and `lg` and above is PC. The boundaries use the defaults above as-is; here we decide only where in the defaults the tier names are assigned.
  - The basis for **putting the lower bound of PC at `lg` rather than `md`** is twofold: tablet portrait widths concentrate in the band from `md` up to below `lg`, and Storybook's default viewport places tablet in that band. Making `md` the lower bound of PC would treat real devices in that band as "wide enough to hold a region at the side".
  - **Below `lg` is a band where no width can be spared beside the body.** Bringing out a region that takes width in this band leaves the body with hardly more width than mobile, and the body side breaks first. This is the basis for separating bands where something can sit permanently at the side from bands where it cannot, and the presentation choices derived from it (permanent or overlay / normal placement or fixed to the bottom edge) are held by [`docs/rules.md`](../rules.md) as behavioral rules.
- **Container queries (`@container`) are adopted**. This is a core feature of Tailwind v4 (no plugin needed), and its substance is **the CSS-standard `@container` / `container-type`** (holds with Tailwind taken out = the non-lock-in of [0010](0010-standards-and-non-lockin.md)).
  - **Which to use**: page skeletons and layout shells ([0026](0026-layout-shell-mount.md)) use **viewport breakpoints**, and reusable components inside feature slices **default to container queries**. Reason = feature-slice components get different allotted widths in different reuse contexts, so branching on "the width of the container I am placed in" rather than the viewport fits local reasoning (the locality principle of [0020](0020-adopted-architecture.md)).

### 3. Motion = CSS / View Transitions by default + Framer Motion for complex motion + respecting reduced-motion

- **Default means (fixed)**: the default means of motion are **CSS transition / animation** and **the View Transitions API** (a browser standard / Next.js supports it with an experimental flag (`experimental.viewTransition`) + React experimental APIs). Both are browser-standard mechanisms, not bound to a particular library (the non-lock-in of [0010](0010-standards-and-non-lockin.md)). Simple hover / focus / enter, state transitions and page transition animations are written with these standard means first.
- **Do not add an animation plugin (utility-generating `tw-animate-css`, etc.) on top of the default means.** Layering a plugin over what the standard means already cover creates two vocabularies for the same motion. As a consequence, **the system has no means of conveying waiting through motion** — waiting whose progress is unknown (indeterminate) is not expressed with progress components but handled by skeleton displays (`Skeleton` / `Shimmer`), and progress components take on only progress whose value is known.
- **Adopt Framer Motion (the `motion` package) for complex motion**: only for complex cases where standard CSS / View Transitions break down — **exit animations (`AnimatePresence`) / layout animations (FLIP) / gestures (drag, pan) / orchestrating multiple elements (stagger) / physics-based (spring)** — is Framer Motion (current package name `motion`) used.
  - **Conformance to standards and the de facto ([0010](0010-standards-and-non-lockin.md))**: Framer Motion is the de facto declarative motion library in the React ecosystem, a choice that follows the naming precedence (React conventions > industry standards).
  - **Vendor-independent justification ([0010](0010-standards-and-non-lockin.md))**: the basis for adoption is not "because Framer recommends it". The complex cases above (especially **exit animations** = the leaving transition before an element unmounts) **cannot be expressed structurally with CSS / View Transitions alone** (they need React's unmount control to mesh with the DOM's lifetime). This basis — "filling a concrete gap the standards cannot reach with a declarative API" — holds even with the particular vendor Framer taken out (among similar alternatives = React Spring / GSAP / Motion One, etc., Framer was chosen as one factor on the independent grounds of being declarative, integrated with React and attentive to a11y). The boundary itself — putting the default on the standard means and limiting Framer to complex cases — satisfies the non-lock-in operational test ("does default motion hold with Framer taken out?" = Yes).
  - **Home = `components`**: **direct vendor references** to Framer Motion (`motion.*` components / `AnimatePresence` / `useAnimate`, etc.) **are closed inside the `components` layer**. `motion` is not sprinkled directly into feature slices; UI with motion is wrapped and provided as reusable components in `components` (a concrete form of [0010](0010-standards-and-non-lockin.md)'s non-lock-in of putting the vendor behind a boundary where it can be swapped = localizing to `components` the surface affected when the vendor is swapped).
  - **Dependency management**: `motion` is **exact-pinned** as a core dep (`pnpm add -E`), and **`pnpm audit`** is run when adding it ([0004](0004-library-management.md)). Major updates are handled in a separate PR.
  - **Add it to the dependencies at the point of use** (the same shape as [0053](0053-ui-component-interaction-seam.md)'s "place it in code only in a form accompanied by an implementation"). Bringing it in ahead of time while the default means suffice leaves only the cost of following major updates, with nothing using it.
- **Respecting `prefers-reduced-motion` is mandatory** (implemented with Tailwind's `motion-reduce:` / `motion-safe:` variants, `@media (prefers-reduced-motion)`, or Framer Motion's `useReducedMotion` hook). Respecting reduced-motion corresponds to WCAG SC 2.3.3 Animation from Interactions (**Level AAA**). No SC at AA directly mandates it, but this project respects `prefers-reduced-motion` out of consideration for user experience. **The level of authority behind this enforcement (AAA) is stated explicitly in this ADR**, and this ADR holds the system-side consequence "never omit the reduced-motion branch when implementing motion". When Framer Motion is used, respecting reduced-motion is equally mandatory (exit, layout and spring are also subject to reduction).

### 4. Print / PDF = print CSS (a frontend extension point) / PDF generation (a backend boundary seam)

- The concern of printing is split in two by **boundary judgment ("is it a separate domain?")**.
  - **Print CSS = an extension point of the frontend area**. Tailwind's **`print:` variant / `@media print`** (CSS standard) is defined as a **named extension point** that gives print layout. Following 0050's global consolidation, global adjustments for print, when needed, go in `globals.css`.
  - **PDF generation = the backend domain = cut at a boundary seam**. Server-side PDF rendering (Puppeteer / reporting engines, etc.) is a backend responsibility ([0070](0070-backend-role-separation.md)); the frontend handles up to "providing printable HTML/CSS", and beyond that it is cut with a name as a boundary seam (the presentation layer does not generate PDFs).
- **A minimal print implementation is bundled.** As the CSS foundation, it holds only the layout that applies regardless of what is output: page margins, avoiding breaks between headings and paragraphs, and repeating table header rows. **It does not hold what goes on paper** — whether something is output is specified by the caller with a class and is not judged automatically from tags. Running `window.print()` and PDF generation are also outside this foundation.
- **Two parties decide what does not go on paper.** The layout shell (shell) keeps its own header, footer and skip link off paper — they are all for moving between screens; on paper they cannot be pressed and only take up space. The layout shell's judgment is the same whichever screen is printed, so the layout shell decides; what to drop from the contents differs per screen, so the screen decides.
- **Do not bring the dark color scheme into print.** This is guaranteed by limiting themes other than the default to `screen` media (§1). Without the limit, the color scheme of light text on a dark surface comes out on paper as-is and becomes unreadable.

### 5. Japanese body typeface = left to the typefaces bundled with the OS (web fonts limited to Latin display and monospace)

**Japanese web fonts differ in cost from Latin typefaces by orders of magnitude.** Because of the number of characters, the files run to several MB, and serving is split into more than 100 slices by
`unicode-range`. The browser narrows fetching to what it needs, but **the `@font-face`
declarations for every slice land in the CSS, and that blocks rendering**. Measured: `@font-face`
865 declarations = 661 KB (233 KB gzip). The app's own declarations in the same CSS were 25 KB gzip, and **90% of the weight was
typeface declarations**.

The advantage of `next/font` is that it **takes this CSS into self-hosting**, but for Japanese that takeover produces the cost above.
`subsets` can narrow only named subsets (latin / cyrillic, etc.), and has no effect on numbered slices
(`next/font/google` has no option for specifying `unicode-range`).

#### Available measures and how they fare in a boilerplate

| Measure | Contents | Outcome in this repository |
| --- | --- | --- |
| **① Leave it to the typefaces bundled with the OS** | Use no Japanese web font; fall back to Hiragino Kaku Gothic / Yu Gothic / Noto Sans JP, etc. | **Adopted**. Zero transfer and zero declarations |
| ② Subset and self-host | Produce files containing only the characters actually used. Several MB → tens of KB | **Not possible**. The wording is unknown, so "the characters used" cannot be fixed. That it is less effective on frequently updated sites is also a generally known limitation |
| ③ Keep `unicode-range` split serving | The Google Fonts default. The browser fetches only the slices it needs | **Partly adopted**. Fetching can be narrowed, but the problem of the declarations landing remains, so the range where they may land is limited (below) |
| ④ Limit the use | Web fonts only for Latin display and monospace; Japanese from the OS | **Adopted**. Used together with ① |

#### This repository's decision

- **Do not load Japanese web fonts.** The body text of every family is left to the typefaces bundled with the OS. Measured,
  the user-facing surface went from CSS 260 KB → 26 KB (gzip) and `@font-face` 865 → 10, and the admin surface from 158 KB → 25 KB and 493 → 10.
  LCP went from 5.52 → 2.94 seconds on a static screen with no fetch, and from 4.34 → 2.79 seconds on an admin surface with many input fields
- **Display (Latin) and monospace stay as web fonts.** Latin has only a few slices, and the cost differs by orders of magnitude
- **The body typeface is not part of the family (`data-surface`) axis** ([0045](0045-fonts-and-images.md)). The mechanism for swapping
  per family (`[data-surface]` in `globals.css`) remains, but by default both point at the same stack.
  **Splitting surfaces does not make the cost disappear** — even if the admin typeface is loaded only on the admin surface, the people who open admin are still
  made to read the declarations. Differences between families are carried by color scheme, glow, spacing and emphasis steps
- **Emphasis is collapsed into one step.** Measured (macOS / Chromium, comparing the ink of the same string), Hiragino Kaku Gothic
  renders 400/500/600/700/800 all distinctly, but **Yu Gothic distinguishes only 400 from everything else** (500, 600, 700 and 800
  look the same), and `system-ui` renders 500 and 600 the same. So the difference from body text (400) survives everywhere, but **splitting
  further above it disappears in many environments**. To keep the system from holding distinctions that components choose between yet never reach users,
  `strong` is dropped and only `emphasis` is held
- **The difference between headings and body is made by size and position.** Weight does not create another step of hierarchy. Measured as well: of the 37 places using the dropped
  `font-strong`, 30 were used together with `text-lg` / `text-xl`, so size was already carrying
  the hierarchy. A second weight step can come back only when that difference can be rendered distinctly in every supported environment,
  and as long as Japanese is left to the typefaces bundled with the OS that does not happen — the premise for bringing it back is putting a Japanese web font
  in the body, and the declaration cost counted above returns as-is. "I want headings to look stronger" is not a
  reason
- When bringing a Japanese web font back to the body, do it with ② (if the wording is fixed) or with ③ limited
  to a per-family surface. **Wherever it is added, the people who open that surface read the declarations for every slice**

### Tokens have three layers

- **primitive** (`tokens/primitives.json`) — raw values. Not referenced directly from components
- **semantic** (`tokens/themes/<family>/<color-scheme>.json`) — aliases that point at primitives. This is the layer components reference
- **component** — values that carry meaning only for a single component. **Defined by referencing semantic** (not referencing primitives directly)

The semantic layer has one sheet per combination of family and color scheme, and **every combination declares the same tokens**. A missing token is not merely a missing declaration: through the cascade it inherits the neighboring combination's value, so only the places that were supposed to switch family stay as they were. This agreement is enforced at generation time.

### What width decides, and what the container decides

Responsive judgment has two axes. **Which to use is decided by the target**, so it is not chosen per screen.

| Axis | Used for | Examples |
| --- | --- | --- |
| **Band (viewport)** | The screen skeleton: what goes where, whether it is shown | Whether there is a sidebar, the direction of columns, overlaying vs side by side |
| **Container width (container query)** | The inside of a component: when the same component is placed in both wide and narrow places | Internal layout of a card, wrapping of rows |

It is decided by the target because the same component appears both in the body and in a narrow region at the side. If a component's inside were split by viewport, it would take the same shape wherever it is placed. Conversely, making the skeleton follow the container width would double the boundaries between the band definition (§2) and the container declaration. **What holds these two as behavioral rules is [`docs/rules.md`](../rules.md).**

A component decided by container width **presupposes that its parent has `container-type`**. Satisfy that premise in stories too (a baseline image captured without fixing the container does not match the real thing).

### Stacking-Order Bands

z-index uses only Tailwind's step values and does not add steps with arbitrary values (the day-to-day rule is [`docs/rules.md`](../rules.md)). What this section holds is **which step value means which band**. There are four bands, and the value between bands (`z-20`) is left empty.

| Band | Value | What sits on it |
| --- | --- | --- |
| **Overlaps within the body** | `z-10` | Things that stick within the flow of the body. Sticky headers / footers within content, fixed table columns, actions stuck to the bottom edge of a scroll region (`sticky`) |
| **Bands a screen pins itself** | `z-30` | Sticky elements a single screen places inside the skeleton. An auxiliary band pinned just below the header (filters, etc.), a summary container that slides in and out from the bottom edge |
| **Screen skeleton** | `z-40` | The shell's header, and actions fixed to the bottom edge of the viewport (`fixed`) |
| **overlay** | `z-50` | Everything emitted to `document.body`. dialog / sheet / menu / popover / tooltip, the toast region, the consent prompt, the skip link that appears on focus, the pull-to-refresh indicator |

A higher band comes above **all** of the lower bands. **Order within a band is decided by DOM order, not resolved with values** — if "put this one on top" is needed within the same band, that is a sign the band assignment is wrong.

**Overlaps inside a component are not bands.** Overlaps inside a component — overlapping avatars, a border raised on focus, a pressed surface laid over the top — are closed within the stacking context the component itself creates. Values inside it do not compete with the bands, so `z-10` / `z-20` may be used, but they must not take effect outside the component.

**Overlapping surfaces are opaque.** In every band, the body passes underneath while something is stuck. If it shows through, text overlaps and becomes unreadable.

**The safe area is taken by surfaces fixed to the bottom edge of the viewport.** An action fixed to the bottom edge at `z-40` sets its bottom padding to the larger of the normal padding and `env(safe-area-inset-bottom)`. A surface merely stuck to a scroll region (`sticky` at `z-10`) does not take it — the bottom of the document ends before the system UI, and the stuck surface does not go under it. Whether `env()` returns a non-zero value is decided by the viewport declaration (`viewport-fit`), and that declaration is held by the screen side. Components write their padding in a form that works either way and do not change with whether the declaration is present.

## Prohibitions

- ❌ Skipping the semantic layer and sprinkling primitives (raw scale) or color literals directly into components (theme switching would no longer be closed within swapping tokens; §1) (Enforcement: Prose — **mechanizable** (primitive color utilities in class strings, direct references to `--color-*` and color literals could be rejected by picking them up with the same string-literal scan as `project-rules/no-raw-font-weight`; no rule exists))
- ❌ Holding separate components per family, and having a component judge which family it is placed in (the family is completed solely by rebinding semantic aliases; §1) (Enforcement: Prose — **partly mechanizable**. Having a component judge its family could be rejected by picking up references to `data-surface` in `src/components`, but no rule exists. Whether separate components are held per family is a judgment about the correspondence between components, not decided by shape)
- ❌ Laying out the combinations of family and color scheme flat and treating them as one axis (collapsing two orthogonal axes multiplies the combinations every time one side is added; §1) (Enforcement: Prose — **not mechanizable**. Whether the combinations are treated as one axis is decided by the meaning of the names, not by the structure of `tokens/themes/` (generation passes even if a family's name includes a color scheme))
- ❌ Multiplying ad-hoc CSS variables everywhere that ignore the token naming layers (primitive / semantic). New tokens are defined as `@theme` primitives or semantic aliases (Enforcement: the `tokens-drift` job (`pnpm check:tokens`) rejects hand-written variables in the generated `tokens.css`. Variables added outside the generated artifact are Prose — **mechanizable** (could be rejected by picking up `--*` declarations outside `tokens.css` that do not reference semantic; no rule exists))
- ❌ Writing breakpoint values (`rem` / `px`) in this ADR's body. Tiers are referred to only by name (`sm` to `2xl`), and the design tokens are the authority for the values (once both are written, swapping the tokens leaves only the ADR behind; §2) (Enforcement: Prose — **mechanizable** (could be rejected by picking up `rem` / `px` with numbers in this ADR's body; no rule exists))
- ❌ Writing the **day-to-day rules** of responsive (which band brings out the region permanently at the side, where always-reachable actions go, how the band vs container split is upheld in implementation, etc.) into this ADR or ADR bodies (rules go to `rules.md`; [0140](0140-documentation-operations.md)) (Enforcement: Prose — **not mechanizable**. Whether something is a rule or a decision is decided by the role of the statement, not by the shape of the sentence)
- ❌ Implementing motion without a `prefers-reduced-motion` branch (§3 / [0100](0100-accessibility-target.md)) (Enforcement: Prose — **partly mechanizable**. Whether `motion-safe:` / `motion-reduce:` sit alongside class strings containing `animate-*` / `transition*` could be rejected by a string-literal scan, but no rule exists. Whether the reduction is sufficient when branching with `@media` or `useReducedMotion` is decided by the meaning of the motion)
- ❌ Bringing out Framer Motion for simple motion that CSS transition / animation / View Transitions can handle (the default is the standard means; Framer is limited to the complex cases of exit / layout / gesture / orchestration / spring; §3) (Enforcement: Prose — **not mechanizable**. Whether the standard means suffice is decided by the requirements of the motion, not by the shape of the code)
- ❌ Adding an animation plugin on top of the default means, and expressing indeterminate with progress components (waiting is handled by skeleton displays; §3) (Enforcement: types (`value` of `ProgressNative` / `ProgressClient` is a required `number`) reject indeterminate on progress components. The animation-plugin side has none — a decision not to adopt. Adding one shows up in the diff as a dependency and a CSS `@import`)
- ❌ Scattering direct vendor references to Framer Motion (`motion.*` / `AnimatePresence`, etc.) across feature slices (vendor references are closed in the `components` layer, kept swappable; §3 / [0010](0010-standards-and-non-lockin.md)) (Enforcement: Prose — **mechanizable** (could be rejected by putting imports of `motion` / `framer-motion` into `no-restricted-imports` outside `src/components`, the same way as `iconVendorImports`; no rule exists))
- ❌ Letting another motion library besides Framer Motion (GSAP / React Spring, etc.) coexist on one's own initiative (adoption is unified on Framer Motion; if an addition is needed, the user settles it through an ADR revision) (Enforcement: none — a decision not to adopt. GSAP / React Spring, etc. are not among the dependencies; adding one shows up as a `package.json` diff and an ADR revision)
- ❌ Bringing in an implementation that generates PDFs on the server in the presentation layer (crosses the backend boundary seam; §4) (Enforcement: none — a decision not to adopt. The presentation layer has neither a dependency nor an endpoint for server-generating PDFs; adding them shows up in the diff as a dependency and a Route Handler)
- ❌ Putting the layout shell's navigation (header / footer / skip link) on paper, and having the layout shell judge which contents a screen drops (§4) (Enforcement: Prose — **partly mechanizable**. That the layout shell's header / footer / skip link carry `print-hidden` could be pinned by component tests of the shell, but no test exists. Not having the layout shell judge which contents a screen drops is a judgment about responsibility, not decided by shape)
- ❌ Resolving order within the same band with a new step value, and letting values used for overlaps inside a component take effect outside it (§Stacking-Order Bands) (Enforcement: ESLint `project-rules/no-arbitrary-z-index` rejects steps with arbitrary values (`z-[…]`). Using an existing step value with a meaning outside its band, and letting a component's inner values take effect outside, are Prose — **not mechanizable**. Which band something belongs to is decided by the meaning of the surface it is placed on, not by the shape of the class)
- ❌ Dropping the safe-area padding from a surface fixed to the bottom edge of the viewport, or changing a component depending on whether the viewport declaration is present (§Stacking-Order Bands)

## Notes

- **Figma → CSS variable synchronization is outside this ADR's range**. This ADR defines only the **system** of tokens (naming layers, scale axes); the **synchronization method** with design tools (generating / importing Figma variables → CSS) is not settled here and is outside this ADR's range. Stepping into the synchronization method in this ADR could contradict later decisions, so it was deliberately limited to the system.
- **Where the adoption of a motion library belongs**: the ranges of the 0050 line (this ADR) and [0052](0052-ui-component-policy.md) (UI library) overlap. **This ADR owns the adoption decision** for the means of motion (default = CSS / View Transitions, complex cases = Framer Motion). Its concern differs from the UI component libraries 0052 handles (shadcn/ui, etc.), so motion is managed in one place on this ADR's side.
- **The level of authority behind making `prefers-reduced-motion` mandatory** is stated explicitly in this ADR. Respecting reduced-motion corresponds to WCAG SC 2.3.3 (**Level AAA**), and there is no directly applicable SC at AA — therefore [0100](0100-accessibility-target.md) (the a11y AA target) does not hold respecting motion preferences as a direct obligation. Independently of AA conformance, this ADR takes the position of making `prefers-reduced-motion` mandatory out of consideration for user experience, and states the level of authority behind that enforcement (AAA) on this ADR's side, leaving no inconsistency.
- **An expression that reduced-motion decides to "stop" includes ensuring it still conveys something when stopped.** An expression that shows progress only through motion (a flowing band, etc.) is designed on the premise of pairing it with an alternative cue when stopped (a skeleton display, waiting text).
- In the taxonomy of [0140](0140-documentation-operations.md), this ADR belongs to the **decision** class (it is a decision about the system; the rules enforced day to day = Tailwind class order, what to show per band, etc. are on the [`docs/rules.md`](../rules.md) side). **Values** are separate again: breakpoint widths are held by `tokens/primitives.json`. Putting the three in the same body would leave only the ADR's text behind when the tokens are swapped.

## Related ADRs

- [0050-styling-strategy.md](0050-styling-strategy.md) — this ADR's parent. Defines the frame: Tailwind as the main axis + a limited allowance for CSS Modules (styled-components / emotion not adopted) / token = CSS variable / dark mode = token switching (this ADR makes its contents concrete)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the meta decision axis of standards conformance / non-lock-in (the two token layers, `@container`, View Transitions and `@media print` all ride on CSS standards that hold with Tailwind taken out / adopting Framer Motion is also backed by §1 de facto conformance + §2 vendor-independent justification + localization to `components`)
- [0004-library-management.md](0004-library-management.md) — library policy (`motion` is exact-pinned + `pnpm audit` / major updates in a separate PR; §3)
- [0100-accessibility-target.md](0100-accessibility-target.md) — the a11y target (WCAG AA). Respecting reduced-motion corresponds to WCAG SC 2.3.3 (AAA) and is not a direct AA obligation, so its level of authority is stated on this ADR's §3 side (equally mandatory when Framer Motion is used)
- [0052-ui-component-policy.md](0052-ui-component-policy.md) — adopting UI component libraries (shadcn/ui, etc.). Where the adoption of a motion library belongs is unified on this ADR's side (see Notes)
- [0045-fonts-and-images.md](0045-fonts-and-images.md) — how `next/font` is loaded (the counterpart of §5's Japanese body typeface)
- [0055-design-system-export.md](0055-design-system-export.md) — the direction in which tokens and components are handed to design tools (one-way, repo → tool; the counterpart of "the synchronization method is out of range" in Notes)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) / [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — the locality principle / the layout shell (the foundation for §2's viewport vs container query split; the party in §4 whose layout shell keeps things off paper)
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — the backend boundary that cuts out server-side PDF generation (§4)
