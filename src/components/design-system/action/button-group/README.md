# ButtonGroup

## Purpose

Groups several actions on the same target into one continuous strip whose adjacent rounded corners and borders are joined. It shows that the actions point at the same target through connection rather than spacing.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ButtonGroup` | The strip itself. `orientation` switches between a horizontal row and a vertical stack, and it joins the rounded corners and borders of adjacent children. It has `role="group"`, so pass `aria-label`. |
| `ButtonGroupText` | Shows a short, non-pressable word in the strip at the same height as the actions. Composed into a `label` with `asChild`, it becomes the name of the adjacent input. |
| `ButtonGroupSeparator` | Separates actions in the strip with a line. Its direction is perpendicular to the strip, and by default it is decorative and excluded from screen reader output. |
| `buttonGroupVariants` | A class-name generator for borrowing only the look of the arrangement where `ButtonGroup` cannot be rendered. |

## Use Cases

Used for switching display formats, split buttons that place a primary action next to its alternatives, inputs with a unit or item name, and formatting toolbars. Children are not limited to `Button`; `Input` and the trigger of `SelectClient` can be placed too.

## Responsibility Boundaries

It does not own the result of a press, which one is selected, or mutual exclusion. **To represent a state where one of them is selected, use [`ToggleGroupNative`](../../form/toggle-group-native/README.md) / [`ToggleGroupClient`](../../form/toggle-group-client/README.md)**; to simply lay things out with space between them, use `flex` and `gap-*`.

It does not join the children's sizes either. The caller aligns the `size` of the `Button`s it places. The separator's color is fixed to `bg-border` and does not look at the surface's fill, so on a strip of the `default` variant, which fills its surface, the caller passes a contrasting color.

It uses neither state nor browser APIs, so no hydration is needed and it can be rendered from a Server Component as is. What becomes a client island is only a child such as `SelectClient`, when one is placed.

## Storybook and Tests

Storybook (`Action/ButtonGroup`) checks the 2 orientations, inserting a word, split buttons, separator color, nesting, composition with selection components, and the case where sizes are not aligned. Tests check the name as `role="group"`, `data-orientation`, that words are not made into buttons, `label` composition with `asChild`, that the separator is not part of screen reader output, and the automated axe check.
