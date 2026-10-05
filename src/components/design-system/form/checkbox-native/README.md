# CheckboxNative

## Purpose

Submits a binary consent, setting or multiple selection as a native form.

## Role and Public Components

| Component | Role |
| --- | --- |
| `CheckboxNative` | An SSR-first checkbox that keeps the native `input[type="checkbox"]`. It can be submitted as a form value. |

## Use Cases

Use it for ordinary checkbox input, giving it `name` and `value`.

## Responsibility Boundaries

It has no indeterminate state or custom interaction. Consider `CheckboxClient` only when those are needed.

## Storybook and Tests

Storybook checks normal, checked, disabled and invalid; the tests check the form attributes, selection and a11y.
