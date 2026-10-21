# ActivityTimeline

## Purpose

Displays events that happened in time order. Change histories, operation logs and audit logs fall under this.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ActivityTimeline` | The `ol` that lays out events. Always give the history a name. |
| `ActivityTimelineItem` | One event. A marker can be placed at its start. |
| `ActivityTimelineTime` | The time the event happened. It holds both a display string and a machine-readable value. |

The content is built with `ListItemContent` / `ListItemTitle` / `ListItemDescription`.

## `Stepper` vs This Component

| | `Stepper` | `ActivityTimeline` |
| --- | --- | --- |
| Subject | Known, finite steps | A history of unknown length |
| Focus | The current position and the steps not yet reached | What happened in the past |
| Order | Defined order. Does not grow or shrink | Time order. Keeps growing |
| Count | Fixed | Comes with pagination / lazy load |

They are different concepts that **only look alike** in laying out timestamped items vertically. They are not merged. "The next available action" and pagination have contradictory premises, so putting them into one component would produce an API that breaks under either premise.

## How It Reaches Assistive Technology

As an `ol`, it conveys that the order is meaningful. When there are several histories on the same screen, they cannot be told apart without a name, so `label` is required.

**`role="feed"` is not used.** That role would promise per-article keyboard interaction and management of `aria-busy`, which this component does not have.

The leading marker is decorative (`aria-hidden`). Who did what is conveyed by the `ListItemTitle` copy. The marker is never the only thing indicating the actor.

## Handling Time

`ActivityTimelineTime` always receives both a display string and `dateTime`. With the display alone, a relative expression such as "3 days ago" loses the exact time; with `dateTime` alone, nothing reaches the reader.

This component does not own formatting. The per-locale notation is decided by the formatters in `model`.

## Responsibility Boundaries

It does not own the order, the meaning of events, fetching, or loading more. Whether to list newest first or oldest first is decided by the caller.

Loading the next part composes [`cursor-pagination`](../../../app-starter/cursor-pagination/README.md) next to it. Building the URL is the caller's responsibility.

## Storybook and Tests

Storybook checks newest first, the case with no marker passed, a single item, combined with pagination, and oldest first. Tests check the `ol` and its name, that the given order is laid out as is, that it has no role that promises keyboard interaction, that the marker is decorative, that the time holds both values, and automated a11y checks.
