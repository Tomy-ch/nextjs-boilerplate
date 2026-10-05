# EditableData Sugar

## Purpose

Builds a native form and a table consistently from column definitions that include editable cells.

## Role and Public Components

| Component / Type | Role |
| --- | --- |
| `EditableDataTable` | Builds an editable form table from column definitions. |
| `EditableDataTableColumn<Row>` | Defines the header, width, alignment, and the row's editable cell. |

## Use Cases

Use it to edit a small number of settings directly in a table.

## Responsibility Boundaries

`EditableTable` is the low-level form + table; this is the sugar for column definitions. The feature owns saving, validation, and draft state.

## Storybook and Tests

Storybook covers regular editing, invalid, per-row saving, and a column definition that returns an `InputGroup`; the tests cover column widths, alignment, the edit controls, and a11y.
