# CheckboxClient

## Purpose

Provides custom checkbox interaction, including indeterminate, as a client island.

## Role and Public Components

| Component | Role |
| --- | --- |
| `CheckboxClient` | A client-side checkbox built on Radix that can be operated through checked, unchecked and indeterminate. |

Indeterminate is shown with a mark (a horizontal bar) distinct from checked. With the same mark, the two states would differ only in background fill, and "partially selected" and "selected" could not be told apart at a glance.

## Use Cases

Limit it to cases with state representation or interaction requirements that a native checkbox cannot meet.

## Responsibility Boundaries

It is not the default for the initial render. Give the item name with `Label` or `aria-label`; the feature manages state, submission and validation.

## Storybook and Tests

Storybook checks normal, checked, disabled and invalid; the tests check the selection state, disabled and a11y.
