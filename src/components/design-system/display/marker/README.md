# Marker

## Purpose

Places a one-line annotation or divider label, one step quieter than the body. It adds a break in a timeline, a label marking the end of a list, or meta information such as the last update, without adding to the information density of the body.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Marker` | The display element that wraps a one-line annotation. `variant` selects how it separates from the surrounding content, and `asChild` composes it into another element. |
| `MarkerIcon` | A decorative icon placed at the start. It carries `aria-hidden` and is not read out to assistive technology. |
| `MarkerContent` | The text the Marker conveys. In `separator` it sits in the center between horizontal rules. |

`MARKER_VARIANT` and `MarkerVariant` are exported from `marker.definition.ts`. That definition is the owner of the values `variant` can take; callers do not write strings such as `"separator"` directly.

| variant | Appearance |
| --- | --- |
| `default` | Has no rule; places one line along the flow of the content. |
| `separator` | Extends horizontal rules to the left and right of the content and sits in the center as a divider heading. |
| `border` | Draws a rule underneath and marks the start of the content that follows. |

## Use Cases

- Inserting a break such as "shown up to here" into content arranged in time order
- Adding a single line of auxiliary meta information, such as the last update, under a list or card
- Marking the start of a group with a rule and placing a small label as its heading

Do not use it for notices that must draw the user's attention. For content that must not be overlooked, such as an API failure or the reason an action is unavailable, use `Alert`, which carries the semantics of `role="alert"`. For a purely decorative horizontal rule without a label, use `Separator`.

## Responsibility Boundaries

In the SSR-first selection it is `◎`. It is a display-only Server Component that needs no hydration and has no client island.

It owns neither the text, the decision of whether to show it, nor the formatting of dates and numbers. The caller decides all of these. Formatting dates and amounts is the responsibility of the formatters in `model/`; this component receives an already formatted string.

`Marker` itself has no `role`. `separator` is a purely visual expression that draws the horizontal rule with a CSS pseudo-element and has nothing to do with the semantics of `role="separator"`. When the meaning as a divider must reach assistive technology, the caller places a heading element as a child or composes with `asChild`.

`MarkerIcon` carries `aria-hidden`, so an icon alone cannot convey meaning. Always write the meaning in the text of `MarkerContent`.

The vendors are currently Radix `Slot` (composition for `asChild`) and `class-variance-authority`.

## Storybook and Tests

Storybook checks the default annotation line, adding an icon, the two dividers `separator` / `border` in context alongside surrounding content, a body containing a link, wrapping of an annotation that does not fit on one line, and composing into a heading element with `asChild`. How the rule looks and the centering can only be judged in real rendering, so the `separator` rule and wrapping are within Storybook's scope.

The tests check that the default is a `div`, that `variant` is exposed as `data-variant`, that the icon is hidden from assistive technology, that by default it has neither the `separator` nor the `alert` role, that it composes into a heading with `asChild`, that a link in the body remains an operable element, and the automated a11y check.
