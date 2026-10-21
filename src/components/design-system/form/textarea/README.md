# Textarea

## Purpose

Shows and submits a multi-line native `textarea`.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Textarea` | An SSR-first multi-line input that unifies the look while keeping the native `textarea` attributes and form submission. |

## Use Cases

Use it for multi-line form input that uses `name`, `rows`, `required`, `value` and so on.

## Responsibility Boundaries

The item name, description and validation errors are composed by `Label` / `Field` or the feature. The caller also makes the `aria-invalid` and `aria-describedby` associations.

## Storybook and Tests

Storybook checks normal, row count, disabled and invalid; the tests check the native attributes and a11y.
