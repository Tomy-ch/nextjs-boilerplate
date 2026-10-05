# ContextMenu

## Purpose

Brings up operations specific to a target, close at hand, when the target is right-clicked. It is an accelerator so that users who repeat operations on list or edit screens do not have to go through a visible menu.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ContextMenu` | The client-side root that manages the open state. |
| `ContextMenuTrigger` | The area that is the right-click target. The element passed as its child is itself the target. |
| `ContextMenuContent` | The menu body shown in a Portal. Has `role="menu"`. |
| `ContextMenuItem` | An item that runs an operation when chosen. `variant` distinguishes operations that cannot be undone. |
| `ContextMenuCheckboxItem` / `ContextMenuRadioItem` | Items with a selection state. Read out as `menuitemcheckbox` / `menuitemradio`. |
| `ContextMenuRadioGroup` | Groups single-choice items and handles the selected value. |
| `ContextMenuGroup` / `ContextMenuLabel` / `ContextMenuSeparator` | Make up the grouping, name and separator line of item groups. |
| `ContextMenuSub` / `ContextMenuSubTrigger` / `ContextMenuSubContent` | Make up a nested menu. |
| `ContextMenuShortcut` | Shows the corresponding keyboard shortcut at the item's right edge. |
| `ContextMenuPortal` | Used to replace where the menu renders. `ContextMenuContent` goes through a Portal internally, so it is normally unnecessary. |

`context-menu.definition.ts` exports the set of item appearance values as `CONTEXT_MENU_ITEM_VARIANT`.

## Use Cases

- Letting users quickly reach the same operations as a visible menu on list rows or an item grid
- When there are many targets and placing action buttons on every row would fill the screen

## Responsibility Boundaries

In the SSR-first selection it is `△`. The default is ordinary links / buttons and a visible menu; choose this client island when acceleration from a right-click becomes necessary. It needs hydration for opening / closing and focus management, and cannot be rendered directly from a Server Component. When the item content itself needs no client runtime, pass elements assembled in a Server Component as `children`.

**Do not put operations that exist only in this menu.** The only ways to open it are the pointer's secondary button, a long press on touch, and the keyboard's Context Menu key (Shift+F10); no trigger appears on screen. There is no cue to its existence, and `ContextMenuTrigger` does not receive focus, so it cannot be opened from the keyboard if the area contains no focusable element. Always provide a visible path on the feature side that reaches the same operations. For per-row operations `RowActions` plays that role, and for a menu with a trigger `DropdownMenu`.

Within the area covered by `ContextMenuTrigger`, the browser's default context menu no longer opens, and saving images or copying links becomes unavailable. Limit the covered area to the target element.

It holds no operation content, destination, permission checks or confirmation UI. `variant` can be set to `destructive`, but this changes only the colors. To confirm an operation that cannot be undone, open an `AlertDialog` after selection and commit there.

`ContextMenuShortcut` only displays; it does not assign keys. The caller implements the actual shortcut separately. Placing a notation that is not assigned turns it into guidance where pressing does nothing.

The vendor is currently Radix, but the public API contains no vendor name.

## Storybook and Tests

Storybook checks the basic composition, a composition placed alongside a visible `DropdownMenu`, headings and groups with unselectable items, checkbox / radio items with a selection state, and nested menus. Radix's context menu cannot fix the open state as a story's initial value, so each is checked by right-clicking the target area.

The tests check that the menu is not rendered until opened, that `contextmenu` brings up `role="menu"` and the items, that choosing an item runs the operation and closes, disabled items, closing with Escape, that a shortcut is display only and pressing those keys does not run the operation, the roles and selection states of checkbox / radio, expanding a nested menu, and the automated a11y check. For the keyboard's Context Menu key, the browser fires the same `contextmenu` event, so it is treated as the same path.

The automated a11y check disables `region` in addition to `color-contrast`. `region` is a page-level best-practice rule that checks "whether all page content is contained in landmarks", and is structurally incompatible both with rendering a component alone without landmarks and with content that goes directly under `body` through a Portal.
