---
test-requirement: unit
---

# design tokens

`tokens/` is the SSOT for design tokens.

## Test Responsibilities

The frontmatter `test-requirement: unit` applies to the output written by [`scripts/`](scripts/README.md)
([0090](../docs/adr/0090-testing-strategy.md)). The JSON is SSOT data and holds no decisions.

## Structure

- `primitives.json`: base values for color, spacing, radius, typeface, steps, letter spacing, blur and font weight
- `themes/<family>/<color-scheme>.json`: semantic tokens that reference primitives

It uses W3C Design Tokens `$type` / `$value` and aliases (`{...}`). **Components never reference primitives directly; they use the generated semantic tokens.**

A reference can also be written as part of a value. Some values, such as `color-mix()` or `box-shadow`, assemble a primitive as one of their ingredients; writing a raw color there cuts the path from the semantic layer to the primitive, and swapping the theme stops working for that declaration alone.

**A token whose reference target does not exist fails generation.** Letting it through would emit a `var()` pointing at a variable that does not exist, and that declaration becomes wholly invalid without an error, so surfaces and text silently disappear ([`docs/design/design-system.md#unresolved-css-variables-break-more-quietly-than-classes`](../docs/design/design-system.md#unresolved-css-variables-break-more-quietly-than-classes)). The reference separator is `.`, but even when a step's own name contains `.`, as in `{spacing.0.5}`, it is resolved by matching against the declared primitives.

The reason for a value itself can be written in that token's `$description`. It is a W3C field and does not appear in the generated artifacts.

## There are two switching axes

**Color scheme** (`light` / `dark`) is a document-wide axis and is emitted on `:root`. **Family** (`user` / `admin`) is a subtree axis and is emitted on `[data-surface]`.

> Across the repo, "surface" is the word for the area a `bg-*` paints, so this axis is called the "family". The attribute and
> directory spelling is `surface`.

| | Default | Where a non-default takes effect |
| --- | --- | --- |
| Color scheme | `light` | Two paths: the OS setting (`prefers-color-scheme`) and `:root[data-theme]` |
| Family | `user` | A subtree carrying `[data-surface="<family>"]` |

The generated output is six blocks, family × color scheme. Selector specificity stacks up — `(0,1,0)` for `[data-surface]`, `(0,2,0)` for `:root[data-theme]`, and `(0,3,0)` where both apply — so within the same tree **a declaration that specifies both family and color scheme always wins**. The default family is emitted first for the same reason: **source order settles specificity ties, so the order is part of the generated output's meaning**.

Between the two color-scheme paths, **an explicit setting beats the OS setting**. The OS-side block is applied to `:root:not([data-theme="<default>"])`, excluding documents that explicitly set the default color scheme. Non-default color schemes are limited to `screen`, and printing always uses the default color scheme ([0051](../docs/adr/0051-styling-system.md)). `@custom-variant dark` in `globals.css` holds the same trigger condition, so **when changing the condition, move both places together with the generator**.

`color-scheme` is a declaration of the color-scheme axis, so it is emitted only on the `:root` side. Emitting it on the family side too would hold the same condition twice. Without it, scrollbars, form controls and the canvas keep their default rendering in the default color scheme even after the color scheme is switched.

### Where the attribute goes must contain the Portal

`Dialog` / `Popover` / `DropdownMenu` / `Sheet` / `Tooltip` / `ContextMenu` render through a Radix Portal
**directly under `document.body`**. If the family attribute is placed on an element inside the body content, their contents fall outside
the attribute and render in the default even when the family is switched.

The attribute needs to either sit **at a position that contains the Portal's exit** (equivalent to `body`), or have the Portal's `container`
point inside the family. **Placing it partway down the subtree is not enough.**

The catalog (`.storybook/preview.tsx`) puts it on `body`. The real application uses the former shape: the layout shell puts the attribute on the subtree's outer frame, and `SurfacePortalBridge` delivers the same family to `body`. The division of work and the reasons are owned by [`src/components/design-system/foundation/surface/README.md`](../src/components/design-system/foundation/surface/README.md).

### Adding and removing a family

Creating a directory under `themes/` adds a family. The only names the generator knows are **the default family and the default color scheme** (constants in `scripts/gen-tokens.ts`); everything else it finds by scanning the directories. Deleting `admin/` entirely returns the generated output to a single color-scheme axis. The default family cannot be deleted; to rename it, move the generator's constants along with it.

Color schemes are added the same way. **Generation fails unless every family has a file for the same color schemes** (the default color scheme is required). The OS path uses the color scheme's name as the `prefers-color-scheme` value as-is, so a name other than the values the OS has takes effect only through the explicit `data-theme` path.

**Generation fails unless every family and color scheme declares the same tokens.** A missing token is not merely an absent declaration: through the cascade it inherits the value of the default family or default color scheme as-is, so only the places where you believed you switched the family stay in the original color.

## Separate lightness by surface and text

`primary` / `emphasis` / `success` / `warning` / `destructive` / `info` **reference primitives of different lightness** in light and dark. Unlike other semantic tokens, they do not reuse one color across both color schemes.

The reason is that these are **surface colors and text colors at the same time**. `destructive-foreground` sits on a `bg-destructive` surface, while `text-destructive` sits as text on the background and on its faint surface (`bg-destructive/10`). A single intermediate lightness cannot satisfy both.

Sharing an intermediate lightness across both color schemes lets white text sit on it as a surface, but as text it falls below WCAG AA's 4.5:1. Shifting it away from the ground per color scheme and inverting the paired `*-foreground` makes both surface and text work.

**Do not align steps by name; measure and choose.** When the hue changes, the same step has a different luminance, so copying the corresponding step number does not give the same ratio. In fact, light `success` at the same step as `destructive` falls below AA as text. In this repo the lightness is derived from contrast requirements, so the step numbers are a generated result, but this pitfall returns when you edit `themes/` by hand.

**When adding a new semantic token of the same kind, follow this shape too.** `text-*` and `bg-*` read the same CSS variable, so swapping the variable alone cannot separate surface from text.

### Requirements differ by role

WCAG requires **4.5:1 for text and 3:1 for UI components and graphics**. The ratio a token aims for depends on which role it is placed in.

| Role | token | Target |
| --- | --- | --- |
| Also placed as text | `foreground` `muted-foreground` `secondary` `success` `warning` `destructive` `info` | 4.5:1 |
| Placed only on surfaces and graphics | `primary` `emphasis` `input` `active` | 3:1 |

**Do not place `primary` or `emphasis` as text.** Binding these two to the text requirement costs them their brightness as surfaces (in light they sink to a dark blue-green). Where text is needed, use `secondary` and the ones below it.

### Five grounds to measure against

Every token meets its target **on all of** `background` / `card` / `popover` / `muted` / `accent`. Measuring against the background alone breaks on combinations where colored text sits on a faint surface, such as `text-destructive` on a hovered menu item. `card` is translucent, so it is measured using the color composited over the background.

For lines, the requirement depends on whether WCAG 1.4.11 applies. The details are under "Boundary Lines" in [`src/components/README.md`](../src/components/README.md#boundary-lines).

## Glow Layers

Glow is placed in the shadow namespace, not in color. Emitted as a color, Tailwind would generate `bg-*` / `text-*`, growing utilities that can apply shadow values to surfaces and text.

| token | Namespace | What it makes |
| --- | --- | --- |
| `glow-inner` / `glow-primary` / `glow-outer` | `shadow` | The light source. Three layers stacked make something look "emitting light" |
| `glow-edge` | `shadow` | A blurred outline. Fits the outward bleed and the inner reflection into one token |
| `glow` / `glow-strong` | `text-shadow` | Glowing text |

### Whether and when to glow

**Which colors may glow, and how strongly, is fixed. A color without it has no token** (`shadow-glow-secondary` does not exist, so it cannot be written).

| Color | Strength | When |
| --- | --- | --- |
| `primary` | Main | May glow from rest |
| `info` / `success` | Subdued | May glow from rest |
| `warning` / `destructive` | Main | **Only on action** (`hover:` / `focus-visible:`) |
| `secondary` / `emphasis` | — | Never glows |

Whether is carried by **the presence of the token**, and when by **where it is used**. Making `warning` and `destructive` glow from rest would make dangerous operations read as permanently "pressable now".

**Do not make glow the only cue for a state.** In forced-colors mode the UA sets `box-shadow` to `none`, so `shadow-glow-*` disappears entirely. Show `Live` / `Running` / `Selected` together with color or wording.

**A blurred outline does not serve as a focus indicator.** `outline` cannot be blurred, and focus needs to be an `outline` (「focus 表示」 in [`src/components/README.md`](../src/components/README.md)). The blur is decoration layered on top.

## card sits translucently on the background

Only `card` is translucent, so that it looks like "just a frame sitting there" rather than a painted surface. `popover` / dialog overlap arbitrary content and **have no fixed compositing target**, so they stay opaque.

Contrast is measured using the color of `card` composited over the background. When changing `card`'s opacity, the composited result changes, so measure again.

## Typefaces

Typefaces hold primitives by origin, and semantics hold the roles.

| semantic | user | admin |
| --- | --- | --- |
| `sans` (body) | **The Japanese gothic bundled with the OS** (`system-ui` → Hiragino → Yu Gothic → …) | Same as left |
| `brand` (wordmark) | Michroma | Michroma |
| `mono` | Geist Mono | Geist Mono |

**No Japanese web font is loaded** ([0051](../docs/adr/0051-styling-system.md)). A Japanese web font puts `@font-face`
declarations into the CSS in units of over 100, and that blocks rendering. Instead of paying that cost for body text that affects every screen,
web fonts are kept only for Latin (the wordmark and monospace).

**The difference between families is carried by color scheme, glow, spacing and the emphasis step.** The body typeface is not part of that axis — the cost differs by
an order of magnitude, and even with surfaces separated, people who open the admin side would still pay it.

The Latin and monospace typefaces are loaded by `next/font` in [`src/app/fonts.ts`](../src/app/fonts.ts) and distributed as `--typeface-*`.
The primitive spelling is kept separate from `--font-*` because a declaration with the same name as the generated alias would point at
itself. `next/font` distributes the variable on a class, so an ancestor of the reading element needs a `FONT_VARIABLES` class
(the real application's `<html>` and the catalog both use the same definition).

### Only one emphasis step

Typefaces have different weights available, so writing weight numbers into components collapses the steps when the typeface is swapped.

| semantic | user | admin |
| --- | --- | --- |
| `emphasis` (stronger than body) | 700 | 500 |

**There is only one step.** It holds only the difference from body (400) and creates no further hierarchy.

**There is only one step because a second step does not show up in many environments.** Measured by rendering the same string at each step and comparing the amount of ink
(macOS / Chromium):

| Typeface | Distinguishable steps |
| --- | --- |
| Hiragino Kaku Gothic | **All** of 400 / 500 / 600 / 700 / 800 |
| Yu Gothic | **400 and everything else** (500, 600, 700 and 800 render identically) |
| `system-ui` | 400 / 500=600 / 700 / 800 |

The difference from body (400) survives in every typeface, but any further split above it disappears in Yu Gothic. The steps are folded into one so that the system does not carry **a distinction
components choose between but users never receive**. The difference between headings and body comes from size and
position ([0051](../docs/adr/0051-styling-system.md)).

Components write `font-emphasis`. **Do not specify the weight directly** — specifying a step the typeface does not have is only rounded and does not produce emphasis. `eslint-rules/no-raw-font-weight` checks this mechanically (`font-normal` is exempt, as it cancels emphasis).

**`brand` has only Latin glyphs.** Applied to a string that may contain Japanese, the typeface changes within a single word. Its use is limited to wordmarks such as the site name.

`font-family` is an inherited value, so swapping the variable alone does not reach a subtree. `[data-surface]` in `globals.css` reapplies each family's body typeface.

## Shape

`radius` leans toward right angles and is set one step smaller than Tailwind's default (this repo's `md` corresponds to the default `sm`, and `lg` to the default `md`). Rounded surfaces push themselves too far forward in a system where glow is the lead. `tracking` defines only `normal` and the wide side (`wide` / `wider` / `widest`), leaving the narrow side to Tailwind's defaults. `blur` has a single step, `panel`, which blurs what is behind a `card`.

## Adding a Token

1. If a raw value is needed, add a step to `primitives.json`. A step number is a measured result, not a name ([Separate lightness by surface and text](#separate-lightness-by-surface-and-text))
2. Add the semantic token under the same name to **every family × color scheme** in `themes/`. A surface color comes with its paired `<name>-foreground` — the color of text on a surface is decided per surface, and reusing `foreground` does not work for every color scheme
3. Run `pnpm gen:tokens` and include the generated artifacts in the same change. The catalog receives the names from the generated artifacts, so there is no inventory to add to by hand

**The namespace decides which utilities grow.** Placed in `color`, Tailwind generates `bg-*` / `text-*` / `border-*`; in `shadow`, only `shadow-*`. This is why surface and text read the same variable, and placing a color that is never used as text in `color` grows utilities that let it be placed anyway ([Requirements differ by role](#requirements-differ-by-role) / [Glow Layers](#glow-layers)).

**Hand-written CSS reads `--semantic-*`.** The generated aliases `--color-*` / `--font-*` are already resolved at `:root`, so reading `var(--color-primary)` in a subtree with a switched family still gives the default value. Utilities follow along because `@theme inline` expands the alias's contents.

## Seeing the Values in Effect

Storybook's **`Tokens/Catalog`** shows every token. The names are held by the inventory generated from this SSOT (`src/model/generated/design-token.ts`), and **the catalog reads the values from CSS at runtime**. No values are copied into the table, so the inventory does not go stale when tokens are added or changed.

Switching `Theme` and `Surface` in the toolbar swaps what the same token resolves to. The contrast ratio against the ground is shown too, so whether AA is met can be read on the spot.

## What to Change When Adopting

**The visual design is owned solely here.** Components reference only semantic tokens, so replacing color, typeface and shape
requires no change to `src/`.

| What | Default | Where to change it |
| --- | --- | --- |
| Base values | Primitives for color, spacing, radius, font, steps, letter spacing, blur and font weight | `primitives.json` |
| Values per role | Four files, family × color scheme, reference primitives | `themes/<family>/<color-scheme>.json`. [Generation fails unless every family and color scheme declares the same tokens](#adding-and-removing-a-family) |
| Number of families | Two: `user` and `admin` | Add or remove directories under `themes/` ([above](#adding-and-removing-a-family)). Keep the default family |
| Typefaces | The OS-bundled gothic for Japanese, and bundled Latin typefaces for headings and monospace | Both the primitive `font` and `src/app/fonts.ts`, which holds the `next/font` implementation |
| Color scheme captured | VRT captures only the default color scheme, and for the other checks only that it reaches `:root` | [`vrt/README.md`](../vrt/README.md#what-to-change-when-adopting) |

After replacing, rebuild with `pnpm gen:tokens`; `pnpm check:tokens` checks that the generated artifacts match the declarations
([below](#generation-and-checking)). The generated artifacts (`src/app/generated/tokens.css` and `breakpoint.ts` / `design-token.ts`
under `src/model/generated/` — three files in all) are never fixed by hand.

How lightness, contrast and glow layers are decided is owned by the other sections of this README. **Replacing the values
does not require discarding those judgments** — the judgments are tied to roles, not to the colors
themselves.

## Generation and Checking

```sh
pnpm gen:tokens
pnpm check:tokens
```

The former updates `src/app/generated/tokens.css` and `breakpoint.ts` / `design-token.ts` under `src/model/generated/`. The latter does not update anything and fails if there is a difference from the generated result. **Never hand-edit the generated artifacts.**

`breakpoint.ts` is emitted from the same SSOT as the CSS because Tailwind builds variants such as `lg:` from `--breakpoint-*` in `@theme`, while the path that builds media queries from JS cannot read it. Writing either side by hand makes the boundaries drift between CSS and JS when the steps are replaced, creating widths where both appear or both disappear. `design-token.ts` holds only names, not values — values vary with color scheme and family, so the displaying side reads them from CSS at runtime ([above](#seeing-the-values-in-effect)).

`src/**/generated/**` is excluded from biome's formatter (an override in `biome.json`). Declarations containing `color-mix()` and long arrays wrap past 100 columns, so including them would make the formatter and `pnpm check:tokens` overwrite each other's output. **The spelling of generated artifacts is decided by the generator.**

`scripts/gen-tokens.test.ts` is included in what `pnpm test` runs and is also subject to the coverage gate. Regressions in the generated result itself are guarded in CI by `pnpm check:tokens`.

## Steps with Decimals

A name containing `.`, such as `--spacing-0.5`, is invalid as-is as a CSS custom property name (ident). The generator escapes it to `--spacing-0\.5`, and the references Tailwind emits use the same spelling. When searching built CSS as a string, assume this spelling.
