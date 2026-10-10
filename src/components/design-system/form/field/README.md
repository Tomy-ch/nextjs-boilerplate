# Field

## Purpose

Composes a label, input, description and error into one form field.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Field` | The outer frame that groups one input item. |
| `FieldGroup` / `FieldSet` | Group several related fields. |
| `FieldLabel` / `FieldLegend` | Show the item name or the name of a group of choices. |
| `FieldContent` / `FieldDescription` / `FieldError` | Hold the content, supplementary text and errors around the control. |
| `FieldTitle` | Shows the heading of an item that has no control. Use `FieldLabel` for the name of an input. |
| `FieldSeparator` | Places a visual separator between groups of fields. |

[`field.definition.ts`](./field.definition.ts) holds the spelling of the `id` given to `FieldDescription` / `FieldError` (`toErrorId` / `toDescriptionId`). The input's `aria-describedby` points at that `id`, so it is the receiving side's needs that decide the spelling. [`patterns/form-field`](../../../patterns/form-field/README.md), which builds the item's outer frame, also imports it from here.

It is not placed on the assembling side (`patterns/form-field`). The layer direction is one-way, `patterns → design-system`, so placing it there would keep catalogs and screens that assemble a bare `Field` directly from reaching up to it, and they would write the same spelling by hand.

## Use Cases

Use it to compose native form inputs, choices, descriptions and Server Action validation results.

## Responsibility Boundaries

It is a Server Component and does no value state management, validation or formatting of error arrays. The feature passes `aria-invalid`, `aria-describedby` and the error text.

## Storybook and Tests

Storybook shows normal, invalid and separators separately; the tests check the label association, alert and a11y.
