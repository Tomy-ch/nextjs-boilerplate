# ActionBar

## Purpose

A region that groups actions. It owns only position and stacking order.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ActionBar` | Region that lays out actions. It does not know what its contents are. |

## Use Cases

Use it to put actions that must always be reachable at the bottom edge of the screen. The caller passes the contents.

## Placement

`position` selects one of four values.

| Value | Behavior |
| --- | --- |
| `inline` (default) | Placed in the flow of the body. Separated by a border and the surface color. |
| `sticky` | Sticks to the bottom edge of the scroll region. |
| `fixed` | Fixed to the bottom edge of the viewport. |
| `fixed-without-aside` | Fixed to the bottom edge only on bands with no room for a side region; at widths that have room, it returns to the flow. |

The fixed positions overlap the content, so the background is opaque and only a top border separates it from the body. The stacking order is
below overlays and above any stacking within the body. The bottom padding takes the larger of its own value and the safe area,
to avoid the iOS home bar.

The width at which `fixed-without-aside` returns to the flow is the same as the lower bound at which a permanent side region is shown
([`docs/rules.md`](../../../../docs/rules.md#layout)). At widths where actions line up at the side, there is no longer a reason
to overlay them at the bottom edge.

## Responsibility Boundaries

It carries no meaning for its contents. It neither shows counts nor manages selection state; when those are needed, use
[`SelectionToolbar`](../selection-toolbar/README.md). The position values themselves are declared solely by
`action-bar.definition.ts`, and `SelectionToolbar` references them there as well.

## Storybook and Tests

`Container/ActionBar` lays out the four positions and how they look at a narrow width. The tests check the stacking order per position,
the safe-area padding, and merging the caller's classes.
