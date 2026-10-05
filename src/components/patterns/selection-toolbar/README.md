# SelectionToolbar

## Purpose

Groups the number of items selected in a list with the actions that can be taken on that selection.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SelectAllCheckbox` | Selects or clears every item in the list. It becomes indeterminate when only some are selected. |
| `SelectionToolbar` | Region that groups the selection count with the actions on the selected items. |

## Use Cases

Place `SelectAllCheckbox` in the list's header row and `SelectionToolbar` above the list. The caller lays out the per-row checkboxes with `CheckboxClient`. Neither holds selection state, so pass the selected count and the total count.

## Handling Partial Selection

When `selectedCount` is neither 0 nor the total, `SelectAllCheckbox` becomes indeterminate. With only the two values checked and unchecked, "some selected" would look the same as "none selected", and which way a press would go could not be predicted.

Pressing it from the indeterminate state selects all. Someone who has selected some items more often wants to select all including the rest next than to start over.

## Placement

`position` selects one of three values.

| Value | Behavior |
| --- | --- |
| `inline` (default) | Placed in the flow of the list. Separated by a border and the surface color. |
| `sticky` | Sticks to the bottom edge of the scroll region. |
| `fixed` | Fixed to the bottom edge of the viewport. |

On screens with a long list, use `sticky` / `fixed` so the actions are reachable while scrolling. Both overlap the content, so the background is the opaque `bg-background` rather than the surface color, and only a top border separates it from the list.

The stacking order of `fixed` is below overlays (`z-50`) and above any stacking within the list. The bottom padding takes the larger of its own value and the safe area, to avoid the iOS home bar.

**Putting bottom padding on the body so the last item is not hidden behind the fixed bar is the caller's responsibility.** The bar's height changes with the number of actions, so the component cannot decide it.

With no selection it does not overlap, whatever the position, because it then has neither a frame nor a height.

## How It Reaches Assistive Technology

The `SelectionToolbar` element remains even with no selection. The count is conveyed through `aria-live`, so if the whole region appeared only once selection started, the first item would not be announced. While its contents are empty it has neither a frame nor a height.

The region grouping the actions gets a name that includes the count, such as "選択した 3 件への操作" ("actions on the 3 selected items"). "削除" ("Delete") alone does not say how many items it acts on, and cannot be distinguished from another delete action somewhere in the list.

The name is given as a `fieldset` group. `role="toolbar"` is not used because it would promise arrow-key movement.

## Responsibility Boundaries

It does not own selection state, executing business actions, authorization decisions, or the confirmation dialog before execution. The caller passes the count and passes the actions as `children`.

The count's unit is swapped with `unit`. When the total is known, passing `totalCount` shows "全 340 件中 3 件を選択中" ("3 of 340 selected"), because what a selection means depends on its ratio to the whole.

## Storybook and Tests

Storybook covers a state with a selection, without one, without a total, with a different unit, fixed to the bottom edge, stuck to the scroll region, and combined with a list. The tests cover the three states of the select-all checkbox and the direction of a press, the case with nothing selectable, not showing actions with no selection, that the live region exists from the start, the count text, the name of the action group, whether selection can be cleared, specifying the three positions, and not overlapping with no selection.
