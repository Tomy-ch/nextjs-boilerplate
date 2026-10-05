# FeedbackState

## Purpose

Conveys the loading / empty / error / success display states consistently.

## Role and Public Components

| Component | Role |
| --- | --- |
| `FeedbackState` | A view-state component that displays the heading, description and auxiliary actions for `loading`, `empty`, `error` and `success`. |

## Use Cases

Used where a state display accompanied by the next available action is needed, for the whole screen or a local region.

## Responsibility Boundaries

State decisions, retry, navigation and business copy are passed in as props by the feature. Do not add a separate empty-only component.

It is a component that handles the state of a region or the whole screen. Use `Spinner` for a local in-progress indicator and `Skeleton` for loading where the shape of the final content is known, and do not nest this component. It owns `role="status"` / `alert` and `aria-live` itself, so the responsibility for announcing the state is gathered here. The `loading` icon uses `Spinner` internally as decoration and stops rotating under `prefers-reduced-motion`.

## Storybook and Tests

Storybook checks each state and the auxiliary actions; tests check the display for each state and a11y.
