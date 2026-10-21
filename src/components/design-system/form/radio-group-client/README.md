# RadioGroupClient

## Purpose

Provides, as a client island, custom interaction that native radios cannot meet.

## Role and Public Components

| Component | Role |
| --- | --- |
| `RadioGroupClient` | A client-side group built on Radix that manages the value of an exclusive selection and keyboard operation. |
| `RadioGroupClientItem` | The interactive element representing a choice within the group. Keeps its selected display in sync with the group's value. |

## Use Cases

Use it only when custom keyboard / focus interaction is actually needed.

## Responsibility Boundaries

It is not the default for the initial render. Prefer `RadioGroupNative` for a static single selection; the feature manages state and business data.

## Storybook and Tests

Storybook checks the client island and disabled with the same items and layout as the native side; the tests check the initial value and a11y.
