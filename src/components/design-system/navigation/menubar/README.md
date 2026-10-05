# Menubar

## Purpose

Gathers operations on the whole screen into menus by category and presents them as an always-visible horizontal row.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Menubar` | The client-side root that groups a horizontal row of menus. Manages movement with the left and right keys and switching the open menu. |
| `MenubarMenu` | Bundles a trigger and its content as one menu within the menubar. Identified by `value`. |
| `MenubarTrigger` | The always-visible trigger of a menu. Has `aria-haspopup` and `aria-expanded`. |
| `MenubarContent` | The menu body shown in a Portal. By default it opens aligned to the trigger's left edge. |
| `MenubarPortal` | The Portal it renders into. `MenubarContent` uses it internally. |
| `MenubarItem` | An item that closes the menu and runs the operation when selected. `variant` distinguishes destructive operations. |
| `MenubarCheckboxItem` | An item that toggles a selection state. |
| `MenubarRadioGroup` | Groups single-choice items and handles the selected value. |
| `MenubarRadioItem` | An item chosen exclusively within its group. |
| `MenubarGroup` | Groups related items. |
| `MenubarLabel` | The heading of a group of items. Not selectable. |
| `MenubarSeparator` | Separates groups of items visually and semantically. |
| `MenubarShortcut` | Shows a keyboard shortcut at the item's right edge. Built on `KbdGroup`, with each key as a `Kbd` child. Display only; it registers nothing. |
| `MenubarSub` | The root grouping a nested menu. |
| `MenubarSubTrigger` | The item that opens a nested menu. |
| `MenubarSubContent` | The body of a nested menu. |

`menubar.definition.ts` is the owner of `MENUBAR_ITEM_VARIANT`. It has two values, `default` and `destructive`; use `destructive` only for operations that cannot be undone, such as deletion.

## Use Cases

Use it where there are many operations on the whole screen rather than on a single target, as on edit or admin screens, and you want to present them at all times under categories such as "File / Edit / View".

It is distinguished from similar-looking components by **what the operation targets** and **whether it is navigation or an operation**.

| Situation | What to use |
| --- | --- |
| The operation targets the whole screen, with several categories shown at all times | `Menubar` |
| The operation targets individual rows or items, with a single trigger | [`DropdownMenu`](../../overlay/dropdown-menu/README.md) |
| A visible path already exists and you want to speed it up with a right-click | [`ContextMenu`](../../overlay/context-menu/README.md) |
| Navigation that follows the site hierarchy | [`NavigationMenu`](../navigation-menu/README.md) / [`Breadcrumb`](../breadcrumb/README.md) |

Failing to respect the last row is the most common misuse. A menubar is a structure of operations; mixing in navigation links takes away the user's distinction between "operation" and "navigation".

The core of this component is that while one menu is open, the left and right keys and hover move straight to the neighboring menu. If this movement across menus is not needed, placing a standalone `DropdownMenu` gives a simpler structure.

## Responsibility Boundaries

It is a client island that needs hydration for opening / closing, roving focus, moving between items by typeahead, Escape and outside clicks. It holds no display text, fetching, saving, business decisions, or showing items by permission.

Menus are costly to reach on touch devices and with screen readers, and a menubar permanently occupies the top of the screen. Do not put main-flow operations only inside a menu, and keep nesting to one level.

When a screen has several menubars, distinguishing each with `aria-label` is the caller's responsibility.

`destructive` differs only by color, so use text that makes the operation clear even where color is not a cue. When confirmation is needed before running it, inserting an `AlertDialog` after selection is the feature's responsibility.

`MenubarShortcut` handles only the placement at the right edge; the semantics of the keys belong to `Kbd` / `KbdGroup`. It registers no shortcut, and is not shown for operations that cannot be performed from the keyboard.

By default, the menu closes every time an item is selected. To keep operating in a row, as when switching which columns to show, call `event.preventDefault()` in `onSelect` of `MenubarCheckboxItem` / `MenubarRadioItem` to keep it open. Which is appropriate depends on the use, so the component side does not change the default.

Focus / hover on items and triggers is shown with `bg-accent` / `text-accent-foreground`. It is the only cue to the current position when moving by keyboard, so do not cancel this styling with `className`.

The vendor is currently Radix, but the public API contains no vendor name. Icons come from [`icon.ts`](../../../icon.ts) in `components`.

## Storybook and Tests

Storybook checks the basic composition with several menus side by side and a `disabled` trigger, the state opened with `defaultValue`, combinations of headings, groups, separators, shortcut display and destructive operations, multiple and single choice connected to real state, nested menus, and aligning the left padding with `inset`. The tests check `menubar` and its accessible name, that items are not rendered until opened, opening / closing by pressing the trigger and `aria-expanded`, the semantics of `menu` / `menuitem` / `menuitemcheckbox` / `menuitemradio`, that shortcuts are shown with `kbd` semantics, running and closing on selection, disabled, the distinction by `variant`, closing with Escape, moving from an open menu to the neighboring menu with the left and right keys, opening / closing nested menus, and the automated a11y check.

The automated a11y check excludes `region` (all page content must be contained in landmarks). Radix renders the menu into a Portal directly under `document.body`, so it falls outside the landmarks; this is a constraint shared by all UI that uses a Portal, and `region` is tagged `best-practice` in axe and is outside the repository's target level (WCAG 2.x AA).

jsdom lacks `ResizeObserver` and `scrollIntoView`, which Radix uses for position calculation, so the tests stub them. Removing that dependency from the implementation is not the approach taken.

Closing on an action outside the frame is not included in the tests. jsdom does not implement `PointerEvent` and cannot reproduce Radix's detection mechanism, so it is checked in a real browser in Storybook.
