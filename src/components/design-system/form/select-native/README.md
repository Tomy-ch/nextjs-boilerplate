# SelectNative

## Purpose

Chooses one of a few static options and submits it as a native form.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SelectNative` | An SSR-first control that keeps the native `select` and submits the selected value as a form. |
| `SelectNativeOption` | A native `option` representing one choice. |
| `SelectNativeOptGroup` | A native `optgroup` that gathers related choices under a label. |

## Use Cases

Use it for selections that need no browser JavaScript, such as display format or sort order.

## Responsibility Boundaries

It holds no search, custom popup or custom keyboard interaction. Consider `SelectClient` only when those are needed.

## Storybook and Tests

Storybook checks normal, disabled and invalid; the tests check the form attributes and a11y.
