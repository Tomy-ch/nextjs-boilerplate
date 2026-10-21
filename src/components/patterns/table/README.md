# Table Columns Sugar

## Purpose

Expands column definitions into a `colgroup` and column headers, and provides the single source of truth (SSOT) for width and alignment.

## Role and Public Components

| Component / Type | Role |
| --- | --- |
| `TableColumnGroup` | Expands column widths into a `colgroup`. |
| `TableColumnHeaders` | Expands headers and alignment into column headers. |
| `TableColumnDefinition` | Column settings shared by the static / editable sugar. |
| `rowActionsColumn` | Builds the actions column from row action definitions. See [`row-actions/README.md`](./row-actions/README.md) for details. |

## Use Cases

Use it to align column widths and placement across both read-only and editable tables. Per-row action menus are built with `row-actions`.

## Responsibility Boundaries

It does not own row data, cell display, saving, or validation.

## Storybook and Tests

The expanded result is checked through the stories and tests of StaticDataTable / EditableDataTable.
