# TableViewOptions

## Purpose

Gathers a table's display settings in one place. Settings the user chooses come from the menu; responsive visibility by screen width and pinned columns come from classes applied to columns.

## Role and Public Components

| Component / Value | Role |
| --- | --- |
| `TableViewOptions` | Menu that switches the visible columns and the display density. |
| `TABLE_DENSITY` / `TABLE_DENSITY_CLASS` | How tightly rows are packed, and the class that applies it to `Table`. |
| `TABLE_COLUMN_PRIORITY` / `TABLE_COLUMN_PRIORITY_CLASS` | The priority for keeping a column on a narrow screen, and the class that applies it to the column. |
| `TABLE_STICKY_COLUMN_CLASS` / `TABLE_STICKY_ROW_CLASS` | The class for a column that stays at the left edge during horizontal scroll, and the class for the rows of that table. |

## Where Settings Are Applied

The menu holds no state, so pass it the current state and receive changes. The caller applies the received state to the table.

| Setting | Applied to |
| --- | --- |
| Display density | `TABLE_DENSITY_CLASS[density]` on `Table`'s `className` |
| Visible columns | Do not render the column at all |
| Screen-width priority | `TABLE_COLUMN_PRIORITY_CLASS[priority]` on the column's `TableHead` / `TableCell` |
| Pinned column | `TABLE_STICKY_COLUMN_CLASS` on the column's `TableHead` / `TableCell`, `TABLE_STICKY_ROW_CLASS` on `TableRow` |

The feature decides whether to put the settings in the URL or keep them in the browser.

## The menu and screen width are separate

The menu is **the user's choice**; the priority class is **the default visibility by screen width**. A column hidden on a narrow screen does not appear even if shown in the menu. A column appears only when both are satisfied.

Specify `locked` for columns that cannot be hidden. If even the column that identifies the item could be hidden, it would be unclear which row the table refers to.

## How the Look Is Decided

**Density** tightens only the height and the vertical padding. Tightening the horizontal padding too would make column boundaries hard to read, and shrinking the text would go below the minimum body size.

**Priority** is named by meaning, not by screen width, because which columns to keep is decided by "can the item be identified". Tables grow horizontally, so on a narrow screen reducing the columns reads better than horizontal scroll.

The background of a **pinned column** is inherited from the row. A pinned cell overlaps other cells, so it cannot be transparent; but if its color were fixed, only the row's hover and selected colors would fail to reach the pinned column, and the row would look cut off partway.

Rows have no background by default, so without `TABLE_STICKY_ROW_CLASS` on `TableRow` the pinned column inherits transparency and the horizontally scrolled content shows through. **Use the two as a pair.**

The selected color is opaque, so it matches as is. The hover color is semi-transparent, so only the pinned column becomes slightly darker. This difference is accepted, because a row color that did not reach the pinned column would stand out more as a break in the row.

`Table` already has a horizontally scrolling container, so the caller does not add one.

## Responsibility Boundaries

It does not own data fetching, sorting, filtering, or business types. It only receives the list of columns and the current settings, and returns changes.

**Column order cannot be changed.** The goal of bringing a wanted column near the identifying column is met by hiding unrelated columns and pinning the identifying column. Column order is the screen's decision to put the identifying column first and order the rest by important attributes; letting users rearrange it would demote that design to a default value.

Revisit this if a screen actually appears with many columns, where the column users want next to the identifying column differs per user. Even then, start not with drag but with up/down movement completed by keyboard alone inside the menu.

## Storybook and Tests

Storybook covers a table whose columns and density are switched from the menu, and the compact display. The tests cover the columns' checked state, columns that cannot be hidden, notification of column and density changes, and the contents of the classes applied to the table.
