# EditableTable

## Purpose

Places native form controls such as `Input` in table cells and edits through a Server Action or URL submission.

## Role and Public Components

| Component | Role |
| --- | --- |
| `EditableTable` | Wraps the whole `Table` as one native `form`. |
| `EditableTableHeader` / `EditableTableBody` / `EditableTableFooter` | The table areas that hold the headers, the editable rows and the totals rows. |
| `EditableTableRow` / `EditableTableHead` / `EditableTableCell` / `EditableTableCaption` | Make up the rows, column headers, editable cells and the table description. |

## Use Cases

Use it to edit a small number of settings or managed items in table form, either all at once or row by row.

## Responsibility Boundaries

It holds no edited values, Server Action, field names, validation results, unit of saving, or adding and removing rows. The feature composes it with `Input`, `FieldError` and a submit button. Immediate saving and draft state across multiple rows are the responsibility of a client island.

## Storybook and Tests

Storybook separates normal editing, the invalid display, cells that fold units and in-row actions inside the value frame with `InputGroup`, and inline editing at the same density as DataTable. The tests check the semantics of the form, table, controls and errors, and a11y.
