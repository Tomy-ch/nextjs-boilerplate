# StaticData Sugar

## Purpose

Builds column widths, headers, rows and the empty display consistently from read-only column definitions.

## Role and Public Components

| Component / Type | Role |
| --- | --- |
| `StaticDataTable` | Builds a read-only table from column definitions. |
| `StaticDataTableColumn<Row>` | Defines the header, width, alignment, and the row's cell display. |

## Use Cases

Use it to display a list fetched on the server while keeping column widths and placement.

## Responsibility Boundaries

`design-system/display/table` handles the low-level structure of `Table`, and `patterns/table` the expansion of column definitions. Fetching, URLs, filters and row actions are the feature's responsibility.

## Storybook and Tests

Storybook shows the regular display, the empty display, pagination, and a search toolbar. The tests cover column widths, headers, empty, the toolbar, pagination, and a11y.
