# Table

## Purpose

Shows structured data where the relationship between columns and rows is needed for the user to understand it. Do not use it merely for layout; limit it to cases where the relationships in the information are read as a table.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Table` | A native `table` with a [`ScrollArea`](../../container/scroll-area/README.md) that scrolls horizontally when the width is insufficient. |
| `TableHeader` | The `thead` area that holds the column headers. |
| `TableBody` | The `tbody` area that holds the table's main data rows. |
| `TableFooter` | The `tfoot` area that holds supplementary rows such as totals. |
| `TableRow` | A `tr` representing one row. |
| `TableHead` | A `th` representing a column or row header. |
| `TableCell` | A `td` representing data. |
| `TableCaption` | A `caption` describing the purpose of the table. |

## Use Cases

Use it for screens that compare several attributes in the same columns: lists, histories, statements, totals. Place a caption and column headers, and set `scope="col"` on `TableHead`.

The horizontally scrolling area receives focus so it can be scrolled with the keyboard alone. Pass the same words as `TableCaption` to `label` so that on focus it is clear which area has been entered.

## Responsibility Boundaries

It holds no fetching, sorting, filtering, pagination, per-row actions or business types. The feature implements these by composing Table. For wide content, the component's wrapper handles horizontal scrolling.

## Storybook and Tests

Storybook shows the basic table and the totals footer separately. The tests check the table / caption / column header semantics and the automated a11y check.
