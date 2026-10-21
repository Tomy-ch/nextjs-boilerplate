# Label

## Purpose

Conveys the item name of a form control to the user.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Label` | Shows the control's item name as a native `label` and associates it with the target input through `htmlFor`. |

## Use Cases

Use it by matching `htmlFor` to the unique `id` of the target control.

## Responsibility Boundaries

It holds no description, required indicator, validation error or layout of the whole field. `Field` or the feature composes those.

## Storybook and Tests

Storybook checks the normal display and the display linked to a disabled control; the tests check the association with the item name and a11y.
