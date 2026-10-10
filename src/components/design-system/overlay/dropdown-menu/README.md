# DropdownMenu

## Purpose

Opens a list of operations from a trigger and presents together what can be done to a target.

## Role and Public Components

| Component | Role |
| --- | --- |
| `DropdownMenu` | The client-side root that manages the open state, roving focus, Escape and outside clicks. |
| `DropdownMenuTrigger` | The trigger that opens the menu. When using `Button`, compose it with `asChild`. |
| `DropdownMenuContent` | The menu body shown in a Portal. Its position is adjusted with `side` / `align` / `sideOffset`. |
| `DropdownMenuPortal` | The Portal it renders into. `DropdownMenuContent` uses it internally. |
| `DropdownMenuItem` | An item that closes the menu and runs the operation when selected. `variant` distinguishes destructive operations. |
| `DropdownMenuCheckboxItem` | An item that toggles a selection state. Several can be toggled while the menu stays open. |
| `DropdownMenuRadioGroup` | Groups single-choice items and handles the selected value. |
| `DropdownMenuRadioItem` | An item chosen exclusively within its group. |
| `DropdownMenuGroup` | Groups related items. |
| `DropdownMenuLabel` | The heading of a group. Not selectable. |
| `DropdownMenuSeparator` | Separates groups of items visually and semantically. |
| `DropdownMenuShortcut` | Shows a keyboard shortcut at the item's right edge. Built on `KbdGroup`, with each key as a `Kbd` child. Display only; it registers nothing. |
| `DropdownMenuSub` | The root grouping a nested menu. |
| `DropdownMenuSubTrigger` | The item that opens a nested menu. |
| `DropdownMenuSubContent` | The body of a nested menu. |

`dropdown-menu.definition.ts` is the owner of `DROPDOWN_MENU_ITEM_VARIANT`. It has two values, `default` and `destructive`; use `destructive` only for operations that cannot be undone, such as deletion.

## Use Cases

Use it where operations on a target should be gathered, such as auxiliary per-row operations in a list, an account menu, or switching display settings.

The content is limited to operations. To show reading material or a form, use `Popover`; for editing that covers the screen, `Dialog`; to confirm an operation that cannot be undone, `AlertDialog`.

To also open the same operations from a right-click, a [`ContextMenu`](../context-menu/README.md) can be placed alongside. A context menu shows no trigger on screen and cannot be the sole path, so this component, with its visible trigger, remains the primary means of reaching them.

## Responsibility Boundaries

It is a client island that needs hydration for opening / closing, roving focus, moving between items by typeahead, Escape and outside clicks. It holds no display text, fetching, saving, business decisions, or showing items by permission.

When the trigger is icon-only, the caller gives it an accessible name, such as with `sr-only` text. When placing a menu on every row of a list, make the name say which row the operations are for.

Menus are costly to reach on touch devices and with screen readers, so do not put main-flow operations only inside a menu. Keep nesting shallow too; if it gets deep, consider a `Dialog` or navigating to a dedicated screen first.

`destructive` differs only by color, so use text that makes the operation clear even where color is not a cue. When confirmation is needed before running it, opening an `AlertDialog` after selection is the feature's responsibility.

`DropdownMenuShortcut` handles only the placement at the right edge; the semantics of the keys belong to `Kbd` / `KbdGroup`. It registers no shortcut, and is not shown for operations that cannot be performed from the keyboard.

By default, the menu closes every time an item is selected. To keep operating in a row, as when switching which columns to show, call `event.preventDefault()` in `onSelect` of `DropdownMenuCheckboxItem` / `DropdownMenuRadioItem` to keep it open; it then closes on an action outside the frame or Escape. Which is appropriate depends on the use, so the component side does not change the default.

Focus / hover on items is shown with `bg-accent` / `text-accent-foreground`. These semantic tokens are defined in `tokens/themes/<family>/<color scheme>.json` and use a pale surface one step away from the ground. It is the only cue to the current position when moving between items by keyboard, so do not cancel this styling with `className`.

The vendor is currently Radix, but the public API contains no vendor name. Icons come from [`icon.ts`](../../../icon.ts) in `components`.

## Storybook and Tests

Storybook checks the default opening / closing, a row of items including disabled ones, combinations of headings, groups, separators, shortcut display and destructive operations, an icon-only trigger, multiple and single choice connected to real state, staying open after selection, and nested menus. The tests check that items are not rendered until opened, the semantics of `menu` / `menuitem` / `menuitemcheckbox` / `menuitemradio`, running and closing on selection, disabled, the distinction by `variant`, closing with Escape, opening / closing nested menus, explicit `DropdownMenuPortal`, and the automated a11y check.

The automated a11y check excludes `region` (all page content must be contained in landmarks). Radix renders the menu into a Portal directly under `document.body`, so it falls outside the landmarks; this is a constraint shared by all UI that uses a Portal, and `region` is tagged `best-practice` in axe and is outside the repository's target level (WCAG 2.x AA).

jsdom lacks `ResizeObserver` and `scrollIntoView`, which Radix uses for position calculation, so the tests stub them. Removing that dependency from the implementation is not the approach taken.

Closing on an action outside the frame is not included in the tests. jsdom does not implement `PointerEvent` and cannot reproduce Radix's detection mechanism, so it is checked in a real browser with Storybook's `WithSelectionKeptOpen`.
