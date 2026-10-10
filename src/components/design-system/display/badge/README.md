# Badge

## Purpose

Visually supports a short category or status.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Badge` | A `span` that displays a short category or status. `variant` chooses the visual treatment, and `asChild` applies the look to elements such as links. |

## Use Cases

Used for short labels and auxiliary status displays. When used as a link, the caller gives the destination.

## Colors come in pairs of meaning

`success` and `destructive` are a pair indicating the desirable end (established, completed) and the undesirable end (failed, invalid). Using only one makes only the colored side look special. Use `secondary` / `outline` for in-progress states and categories, and do not assign the paired colors to things that are not ends.

**Meaning must not be conveyed by color alone.** Green and red cannot be told apart by some types of color vision. This component always has copy, so color is only reinforcement, but do not erase the copy with `aria-label` or similar.

## Responsibility Boundaries

Business state transitions, copy and the meaning assigned to colors are owned by the feature. Deciding which state is a "desirable end" belongs to the backend's state transitions; this component only renders the `variant` it is given. It is not used as an interactive element either.

## Storybook and Tests

Storybook checks the variants and the link treatment; tests check the basic display of the public API.
