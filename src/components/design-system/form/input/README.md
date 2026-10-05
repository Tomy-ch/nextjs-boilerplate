# Input

## Purpose

Shows and submits a single-line native `input`.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Input` | An SSR-first single-line input that unifies the look while keeping the native `input` attributes and form submission. |

## Use Cases

Use it for ordinary form input that uses `name`, `type`, `autoComplete` and `required`.

## Responsibility Boundaries

The item name comes from `Label`, and the description and validation errors are composed by `Field` or the feature. The caller also makes the `aria-invalid` and `aria-describedby` associations.

## Storybook and Tests

Storybook checks label, email, password, file, disabled and invalid; the tests check the native attributes and a11y.
