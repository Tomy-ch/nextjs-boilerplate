# ScrollArea

## Purpose

Scrolls only part of the content locally, so long lists or statements can be read while the surrounding content stays in view.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ScrollArea` | A scroll region that combines `overflow`, keyboard reachability and region semantics. The direction is chosen with `orientation`, and the size is given through `className`. |

## Use Cases

- When you want to scroll only the list, as in a statement, while keeping headings and actions on screen
- When you want to fit a region whose interactive items grow vertically, such as a filter panel with many options, into a fixed height
- When you want to scroll unwrapped content horizontally

Not used when scrolling the whole screen is enough. Choose local scrolling only when it matters that the surrounding content stays in view.

## Responsibility Boundaries

In the SSR-first selection it falls under `◎`. It works with `overflow` and the browser's standard scrollbar alone, so it has no `"use client"`, React state or browser API.

It does not own the region's size. Give `max-h-*` or `max-w-*` through `className`. Without one, the content just grows and does not scroll. It does not own fetching content, controlling the count, or loading more on reaching the end either.

A scrollable region must be reachable by users who operate with the keyboard alone, so `tabIndex` is `0`. The element is a `section`, and giving it `aria-label` or `aria-labelledby` exposes it as a `region`. **Always give it an accessible name.** Without a name, the `section` does not become a landmark, and when focused you cannot tell what region you entered.

When the content consists only of focusable elements, pass `tabIndex={-1}` to remove it. The browser scrolls automatically as the children are traversed, so the region's own tab stop would only add one more. Conversely, removing it for read-only content makes it impossible to scroll with the keyboard alone. The caller, who knows the content, decides; the default is the safe side, `0`.

By default, scrolling is not chained to the parent (`overscroll-contain`). If the whole screen kept moving after scrolling to the region's end, it would be unclear which one is being operated. This default assumes surfaces layered over a background, or regions meant to be read apart from their surroundings.

Regions placed in the flow of body content are the exception: pass `overscroll-auto` in `className` to chain scrolling ([`Table`](../../display/table/README.md) does this). Stopping at the edge partway through the body content would freeze the whole page while a finger rests on that region. The criterion is whether what should keep moving after reaching the end is a lower surface or the same body content.

The scrollbar is rendered by the browser and OS, so its look varies by environment. **There is no client island that draws a unified scrollbar.** The only client-island condition the catalog lists here is a custom scrollbar, and no screen requires one at present. When the requirement is settled, add it as `scroll-area-client` and rename this directory to `scroll-area-native`.

## Storybook and Tests

Storybook checks vertical, horizontal, both directions, content that fits, and using a heading as the name through `aria-labelledby`.

Tests check that it is exposed with the `region` role, that it is keyboard-reachable, that an accessible name can be given through both `aria-label` and `aria-labelledby`, that `tabIndex={-1}` removes the region's own tab stop, switching direction with `orientation`, that scrolling is not chained to the parent, that the size can be given through `className`, and automated a11y checks.
