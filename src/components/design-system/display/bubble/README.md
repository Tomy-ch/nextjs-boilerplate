# Bubble

## Purpose

Displays one chunk of speech or a notification as a speech bubble. It gives a surface that shrinks to the content's width, and when placed inside `Message` it follows the sender's direction.

## Role and Public Components

| Component | Role |
| --- | --- |
| `BubbleGroup` | The region that stacks consecutive bubbles vertically as one group. It holds only the spacing and has no role. |
| `Bubble` | The outer frame of the bubble. `variant` chooses how the surface looks and `align` which way it leans. |
| `BubbleContent` | The body the bubble conveys. The surface color and rounded corners are applied to this element. It can be composed into a button or link with `asChild`. |
| `BubbleReactions` | The row of reactions overlaid on the bubble's edge. `side` and `align` choose where it overlaps. |

`BUBBLE_VARIANT` / `BUBBLE_ALIGN` / `BUBBLE_REACTIONS_SIDE` and their corresponding types are exported from `bubble.definition.ts`. These definitions own the values that can be specified, and callers do not write strings such as `"ghost"` directly.

| variant | Look |
| --- | --- |
| `default` | Places background-colored text on a foreground-colored surface. The default. |
| `secondary` | Places a surface one step quieter. |
| `muted` | Places a surface close to the background. |
| `tinted` | Places a surface with a faded version of `default`'s hue. |
| `outline` | Makes the surface the background color and shows the outline with a border. |
| `ghost` | Has no surface, padding or max width, and places only the body. |
| `destructive` | Places a surface in the failure / cancellation color. |

| align | Look |
| --- | --- |
| `start` | Leans to the region's left edge. The default. |
| `end` | Leans to the region's right edge. |

| side | Edge where reactions overlap |
| --- | --- |
| `top` | Overlaps the bubble's top edge. |
| `bottom` | Overlaps the bubble's bottom edge. The default. |

## Use Cases

- Placing it as the body of `Message` and laying out bubbles split left and right by sender
- Splitting one utterance into several bubbles with `BubbleGroup` and showing them in succession on the same surface
- Composing it into a button or link with `asChild` to make the bubble itself a pressable action
- Overlaying reaction counts or names on the bubble's edge as `BubbleReactions`

The structure of one message, including the sender, time and avatar, is handled by `Message`. Use `Marker` for a one-line annotation one step quieter than the body, and `Alert` for notices that must not be missed.

## Responsibility Boundaries

In the SSR-first selection it falls under `◎`. It is a display-only Server Component that needs no hydration and has no client island.

It does not own aggregating reactions, incrementing or decrementing them on press, or the list of who reacted. The destination, what runs, and result notifications of actions composed with `asChild` are also owned by the caller.

`variant` changes only the surface's look and carries no semantics. Choosing `destructive` conveys nothing to assistive technology, so show meanings such as failure or cancellation in the body copy. For the same reason, do not represent reactions with emoji alone; state the count or the reaction's name as text alongside, or give the action an accessible name.

When placed inside `Message`, `Bubble` follows the parent's `align` and leans left or right. Only when used on its own outside `Message` is the direction specified with this component's `align`.

Only `ghost` has no bubble shape at all. In addition to removing the surface, padding and rounded corners, it lifts the 80% max width the other variants have, and also removes the left and right padding of `MessageHeader` / `MessageFooter` in the same message to align line starts. It is the state for letting guidance text or a long body be read as is, rather than fitting a short utterance into a bubble. When you need a bubble with a subdued surface, use `muted` / `secondary` / `outline`.

`BubbleReactions` overlaps the bubble's edge with absolute positioning. When space around it equal to this element's height is needed, the caller secures it.

Focus is made visible with an outline. A bubble composed into a button or link with `asChild` shows a foreground-colored outline on `focus-visible`.

The vendors are Radix's `Slot` (composition via `asChild`) and `class-variance-authority`.

## Storybook and Tests

Storybook checks the default bubble, the 7 surface treatments, `align` when used on its own, following left and right when placed inside `Message`, that the heading padding is removed when `ghost` is used, pressable bubbles composed into a button / link with `asChild` and how their focus looks, reactions overlapping with different `side` / `align`, consecutive display with `BubbleGroup`, and the max width and wrapping of continuous strings. Surface color, overlap position and the focus outline can all be judged only by actual rendering, so they are within Storybook's scope.

Tests check that the default is a `div` with `default` / `start`, that `variant` and `align` are exposed as data attributes, that `variant` conveys nothing to assistive technology, that several bodies can be placed, that it can be composed into a button / link with `asChild`, that the text remains in reading order even inside `Message`, that `BubbleGroup` contains several and has no role, the reactions' `side` / `align`, the handling of decorative emoji and the accessible name of the action, and automated a11y checks.
