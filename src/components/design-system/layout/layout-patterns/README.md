# LayoutPatterns

## Purpose

Shows composition examples for building a page's structure with Tailwind utilities alone. **It exports no component.** It has neither `.tsx` exports nor `.css`; there are only stories and this document.

## Role and Public Components

| Component | Role |
| --- | --- |
| — | None. It exports nothing, helpers included. |

The option of wrapping `stack` / `inline` / `grid` as components is **not taken**. There is no abstraction gain between `<Stack gap={4}>` and `<div className="flex flex-col gap-4">`, and wrapping does not add to Tailwind's expressiveness. All it adds is a surface where consumers have to decide every time whether to write a utility or a component.

This decision is not kept unless it sits where it can be seen. The next reader thinks "there is no stack, so let's make one". So **only an explanation is placed as a story**, serving as the home of the decision.

## Use Cases

- Checking which classes to write vertical stacking, horizontal rows and grids with when building a new page
- Deciding whether a switch across breakpoints branches on the viewport or on the container
- Checking how a sticky header / footer layers with [`ContentContainer`](../../../shell/content-container/README.md)

## Spacing Steps

The `gap-*` steps that tokens give names to are held by `spacing` in [`tokens/primitives.json`](../../../../../tokens/primitives.json), so they are not written here. These steps go through `var(--spacing-N)`, so their values can be changed in one place.

Other steps can also be written as multiples of Tailwind's base `--spacing`, but they expand to `calc(var(--spacing) * N)` and so take a different path from the token steps.

## viewport breakpoint vs container query

The criterion is held by ADR [0051](../../../../../docs/adr/0051-styling-system.md), and the shape to keep by [`docs/rules.md`](../../../../../docs/rules.md#layout).

| What the branch is based on | Where it is used |
| --- | --- |
| viewport breakpoint (`sm:` / `md:` / `lg:`) | The page structure, layout shells |
| container query (`@container` + `@md:`) | Reusable components whose allotted width changes with where they are placed |

Writing a reusable component against the viewport makes its specification disagree between placing it in the body and placing it in a narrow side area. Basing the branch on "the width of the container it is placed in" lets it be judged by looking only at the local context.

Breakpoints use Tailwind's defaults (`sm` / `md` / `lg` / `xl` / `2xl`) as they are, written **mobile-first** (unprefixed is the narrow screen, `sm:` and up override and add). The widths are held by `breakpoint` in [`tokens/primitives.json`](../../../../../tokens/primitives.json), so they are not written here.

## Layering Sticky Elements

**The band is full width; the content is reading width.** Wrapping the band itself in `ContentContainer` cuts the background and rules to the reading width too, leaving gaps at the screen edges. Placing `ContentContainer` inside a full-width band lets the background extend to the edges while only the content sits on the same vertical line as the body.

```tsx
<div className="sticky top-0 z-10 border-b border-border bg-background">
  <ContentContainer>…</ContentContainer>
</div>
```

Since it overlaps, the surface is opaque. `z-10` is a value placed above overlaps within a list and below overlays (`z-50`), the same step as the sticky in [`SelectionToolbar`](../../../patterns/selection-toolbar/README.md). z-index has no tokens and uses only Tailwind's step values ([`docs/rules.md`](../../../../../docs/rules.md#layout)). Steps follow this example.

## Responsibility Boundaries

**It supplies nothing.** Whereas each item in [`foundation/`](../../foundation/) has a supply such as `.css` or a bridge implementation, this is pure explanation. That is why it lives not in `foundation/` but in `layout/`, which deals with the page structure ([`components/README.md`](../../../README.md)).

It does not cover general Tailwind usage. That belongs to Tailwind's documentation. What this shows is only **the values and composition this repository chose**.

The outer frame with a sticky header / footer itself (the `main` element, skip link, navigation) is the responsibility of `app-shell`; here only the shape of the specification is shown.

## Storybook and Tests

The story title is `Layout/Layout`. It contains vertical stacking and spacing steps, wrapping horizontal rows, an equal-width grid and a two-column "content width and the rest", 1 → 2 → 3 columns by viewport breakpoint, the same switch by container query, a sticky header / footer, and the assembly of one whole page.

It has no public component, so the first segment of the title is `Layout`, the same as its home `layout/` ([`components/README.md` § Storybook Display Conventions](../../../README.md#storybook-display-conventions)).

The container query story lets you resize the frame by grabbing its bottom-right corner. This is to confirm that it switches without changing the window width.

**There are no tests.** There is no public implementation, and the only thing to verify is how the composition examples look. This is the same shape as the `foundation/` items that supply only `.css` and have only stories.
