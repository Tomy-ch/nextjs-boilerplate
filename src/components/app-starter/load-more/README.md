# LoadMore

## Purpose

Placed at the end of a list that accumulates as you read on, it shows how loading the next part is going right now.

## Role and Public API

| Component / Type | Role |
| --- | --- |
| `LoadMore` | A Server Component that renders fetching, failure and the end differently. |
| `LoadMoreState` | A discriminated union representing the state of loading the next part. |

## The reload action appears only after a failure

While reading on, simply approaching the end starts the next part, so placing an entry point that does the same thing only adds choices. Only after a failure is the situation different: detection of reaching the end never fires again as long as the user stays put, so the action becomes the only way to recover.

Even in this form, means other than scrolling are not lost. Keyboard scrolling and reading through with assistive technology both move the display position, and detection of reaching the end fires on that. **Placing the action only where moving does not fix the failure** is the flip side of this property.

At the end, nothing is rendered. That reading is finished is conveyed by the list running out; an empty frame left there reads as if there were more.

## `CursorPagination` vs This Component

| | `LoadMore` | [`CursorPagination`](../cursor-pagination/README.md) |
| --- | --- | --- |
| How it advances | **Accumulates** as you read on | **Replaces** one page at a time, back or forward |
| Can you go back | What was accumulated stays | Moves to the previous page |
| Action | Only on failure | Always two, previous and next |

Both are cursor-based, but the way the list grows differs, so neither is used in place of the other.

## `failed` represents only retryable failures

What `LoadMoreState`'s `failed` carries is `onRetry`, meant for failures where **redoing the same action can change the result**. Sign-in required (401), insufficient permission (403) and not found (404) do not change on retry, so **they must not be put in this state**. It would show an action that does not fix anything when pressed.

Those are handled by
[`auth-state-feedback`](../auth-state-feedback/README.md). How credentials expiring partway through incremental fetching is handled is set by [0073](../../../../docs/adr/0073-pagination-fetch-boundary.md).

## Responsibility Boundaries

It owns no fetching. Fetching the next page and watching for reaching the end are the caller's. It only receives `sentinelRef`, where the marker is placed; how to watch (subscribing to `IntersectionObserver`) is owned by [`capabilities/use-on-visible`](../../../capabilities/use-on-visible.ts).

It does not own announcing the count either. "Showing N items" is shown by the list side, because whether a total exists differs per contract.

## Storybook and Tests

Storybook checks the 4 states: more to come, fetching, failed, and end. Tests check the rendering for each state, that the action appears only on failure, that nothing is rendered at the end, replacing the copy, and automated a11y checks.
