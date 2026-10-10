# Tooltip

## Purpose

Attaches a short note to an element whose meaning is not self-evident on its own, such as an icon or an abbreviation, so it can be read without leaving the screen.

## Role and Public Components

| Component | Role |
| --- | --- |
| `TooltipProvider` | Boundary within which the Tooltips below it share the display delay. `Tooltip` requires this Provider as an ancestor. |
| `Tooltip` | Client-side root that manages the open state in response to hover and keyboard focus. |
| `TooltipTrigger` | Trigger that opens the Tooltip. When using a `Button` or a link, compose it with `asChild`. |
| `TooltipContent` | Note shown in a Portal. Adjust its position with `side` / `align` / `sideOffset`. |

## Use Cases

- Adding a short explanation to an icon-only button, or to a number with a unit or abbreviation
- Placing a note that helps understanding when read but is not needed to complete the action, such as how a value was calculated

Do not use it for content that includes actions — use `Popover` — nor for a substantial block of supplementary information — use `HoverCard` — nor to confirm an irreversible action — use `AlertDialog`.

## Responsibility Boundaries

In the SSR-first selection it is rated `△`. The default is static supplementary text, the `title` attribute, focus-aware CSS, and an explicit details link; choose this client island when position calculation, display delay or hover interaction become necessary. It needs hydration to compute the position and control the delay, and cannot be rendered directly from a Server Component. When the content itself needs no client runtime, pass elements assembled in a Server Component as `children`.

It does not own the text it displays, fetching, or business decisions. Where to mount `TooltipProvider` is also the feature's decision. Mount it once, outside the screen that uses tooltips, and do not nest one per `Tooltip`. Splitting the Provider loses the continuity that skips the delay when moving between triggers.

**However, a component that holds several tooltips internally owns its own Provider.** `RichTextEditor` is the precedent: if the Provider were left outside, the moment a caller forgot to mount it, rendering would throw. In this case only the tooltips inside that component share the delay continuity. The "feature's decision" above refers to the case where a feature lays out `Tooltip`s itself.

`TooltipContent` carries `role="tooltip"` and is a **description** referenced from the trigger's `aria-describedby` only while open. It does not become the trigger's accessible name, so an icon-only trigger must always get an `aria-label` or visually hidden text on the trigger side. Do not put focusable elements such as links, buttons or inputs in the content. It closes when the pointer leaves, so actions inside a tooltip cannot be reached.

A tooltip opens only on pointer hover and keyboard focus, and cannot be reached in touch environments. Do not put information essential to an action or a decision only in a tooltip; the feature also provides an always-visible display or an explicit path to it.

The surface is rendered in the inverted colors `bg-foreground` / `text-background`, with an arrow pointing at the trigger. It sits on top of the page content, so the surface must be opaque, and the inverted colors at the same time distinguish a transient tooltip from always-visible supplementary text. `sideOffset` defaults to `0` so the arrow touches the trigger.

The vendor is currently Radix, but the public API carries no vendor name.

## Storybook and Tests

Storybook covers the default open and close, the description in the open state, placement with `side` / `align`, giving a name to an icon-only trigger, sharing one Provider to group the delay, and specifying a wrapping width when the content does not fit on one line.

The tests cover that the content is not rendered until opened, that `aria-describedby` is absent while closed, opening and closing with keyboard focus, closing with Escape, that the Portal content becomes the trigger's description as `role="tooltip"`, that the trigger's accessible name does not depend on the tooltip content, and the automated a11y check. The hover path involves the display-delay timer, so it is checked in Storybook.

The automated a11y check disables `region` in addition to `color-contrast`. `region` is a page-level best-practice rule checking that all page content is contained in landmarks, and it structurally does not fit either a standalone component render with no landmark or content placed directly under `body` through the Portal. It is not a rule about the component's semantics, so disabling it does not narrow what is checked.
