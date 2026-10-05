# Row Actions Sugar

## Purpose

Builds the action menu repeated on each row of a list from row action definitions.

## Role and Public Components

| Component / Type | Role |
| --- | --- |
| `rowActionsColumn` | Builds the actions column of a `StaticDataTable` from the row action settings. |
| `RowActionsMenu` | Expands row action definitions into a DropdownMenu. It can also be used on its own without a table. |
| `RowAction` | A row action definition. A discriminated union of `link` / `command` / `separator`. |
| `ROW_ACTION_KIND` | Constants for the kinds of row action. `row-actions.definition.ts` is the owner. |

## Use Cases

Use it in admin lists to group per-row actions such as navigating to an edit screen or deleting. The same set of actions repeats on every row, so a single definition expands into the column (width, header, alignment) and the menus for all rows.

## Responsibility Boundaries

It does not own fetching, saving, deciding the destination, or confirmation UI. The caller handles what a `command` does and the confirmation (`AlertDialog`) for irreversible actions such as deletion. Binding to the row is also the caller's responsibility: `actions` returns, for the row it receives, an already-settled `href` and `onSelect`.

Business types stay with the caller as the `Row` generic, so this sugar holds no specific type, API or vocabulary.

**A row with no actions gets no trigger at all.** A row for which `actions` returned empty has no menu, so there is never a surface where something pressable is shown but opens empty. In lists where whether a row has actions depends on the row (rows already done, rows whose actions are closed by their state), returning empty is the natural way to express it.

`triggerLabel` becomes the trigger's only accessible name. The trigger is icon-only, so unless it returns text that identifies the row (such as including the item's name), assistive technology sees as many identically named actions as there are rows.

The actions column's header is visually hidden by default. A visible header is not needed, but an empty column header breaks the table's semantics, so the text for screen readers is kept.

To make the same actions reachable from a right-click as well, a [`ContextMenu`](../../../design-system/overlay/context-menu/README.md) can be layered onto the row. A context menu shows no trigger on screen, so it cannot be the only path; the visible trigger this sugar renders remains the primary means of reaching the actions.

## The Server / Client Boundary

Built from `link` only, it can be used from a Server Component. A `command` holds a function, so the caller passing `actions` must be a Client Component. A definition containing functions cannot be passed from a Server Component.

A list centered on paths to edit or restock screens is complete with `link` alone. A list that runs destructive actions from a row has the caller own the client boundary, including the confirmation UI.

## Storybook and Tests

Storybook covers an actions column built only from navigation, one that includes actions run in place, and standalone use without a table. The tests cover that each row's trigger name identifies its target, that the actions column header is kept for screen readers, that `link` expands into each row's destination, disabling by row state, that `command` runs the caller's handler with the target row, distinguishing destructive actions, expanding `separator`, and the automated a11y check.

The automated a11y check excludes `region`. Radix renders the menu into a Portal directly under `document.body`, so it falls outside any landmark; this is a constraint common to UI that uses Portals, and `region` carries axe's `best-practice` tag, outside the repository's target level (WCAG 2.x AA).

jsdom lacks `ResizeObserver` and `scrollIntoView`, which Radix uses for position calculation, so the tests stub them. The trigger opens on `pointerdown`, not `click`, so the tests also operate it through that path.
