# RadioGroupNative

## Purpose

Chooses one of a set of static options and submits it as a native form.

## Role and Public Components

| Component | Role |
| --- | --- |
| `RadioGroupNative` | An SSR-first group that gathers related choices as a `fieldset`. |
| `RadioGroupNativeItem` | A choice that keeps the native `input[type="radio"]`. One of the items sharing the same `name` can be submitted. |

## Use Cases

Use it for an exclusive selection sharing the same `name`, such as sort order or display format.

## Responsibility Boundaries

It holds no custom keyboard interaction or client state. Consider `RadioGroupClient` only when those are needed.

## Storybook and Tests

Storybook checks normal and disabled with the same items and layout as the client side; the tests check selection and a11y.
