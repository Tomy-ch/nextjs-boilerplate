# Spinner

## Purpose

Shows, in place, that a short process with no visible end is in progress.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Spinner` | Rotating in-progress indicator. By default it is treated as decoration, and it is announced only when `label` is given. |

## Use Cases

Use it for waits where the shape of the final content cannot be shown: inside a submitting button, as an auxiliary indicator while retrying, as a local fetching indicator.

## Responsibility Boundaries

It does not own state decisions, fetching, timeouts, or retries. The feature decides when to show it. It represents neither progress nor remaining time, so for a process whose ratio can be obtained, choose a different UI.

Adjust size and color with `className`. Without a color it inherits `currentColor`, so it blends into the text color of the context it is placed in.

## Skeleton / FeedbackState vs This Component

| | When to use | Announcement |
| --- | --- | --- |
| `Skeleton` | A wait where **the shape of the final content is known**. Before a list, card or text block is filled in | Decorative. Conveys nothing |
| `Spinner` | A **local** in-progress process whose shape cannot be shown. A submitting button, a partial refetch | Decorative by default. Conveys only when `label` is given |
| `FeedbackState` | The state of **a region or the whole screen**. Switches loading / empty / error / success in the same frame | Carries `role="status"` / `alert` and `aria-live` itself |

There are two axes for choosing: **scope** (local, or a whole region) and **whether the final shape is predictable**.

The announcement responsibility also differs. `Spinner` and `Skeleton` convey nothing by default, so **they must never be the only cue** for users of assistive technology. Place them on the premise that the surrounding text or a `FeedbackState` conveys the state. Conversely, `FeedbackState` carries `aria-live` itself, so do not stack another announcing element inside it (the loading state of `FeedbackState` uses `Spinner` internally as decoration).

## Accessibility

By default it is decoration with `aria-hidden`. When placed inside a button or next to a loading message, the surrounding text conveys the state, and if the spinner also announced it, the same information would be conveyed twice.

Give `label` only when the spinner alone must convey the state. With it, the spinner becomes `role="status"` and its text is announced. So that `label` cannot be combined with `role` / `aria-hidden`, the latter are excluded from the public API.

Under `prefers-reduced-motion` the rotation stops. Position and size do not change when it stops, so the layout does not break.

## Storybook and Tests

Storybook covers the default decorative display, the case with `label`, size adjustment, inheriting `currentColor`, and placement in a submitting button. The tests cover that by default nothing is conveyed to assistive technology, that with `label` it is announced as `status`, that rotation stops under reduced motion, overriding with `className`, and the automated a11y check for both the decorative and the announcing case.
