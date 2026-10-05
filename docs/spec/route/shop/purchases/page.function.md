# `/purchases` Purchase History (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**It sits inside the registered-user area.** Opened unauthenticated, it sends the user to login with an instruction to return to this screen.
An actor that is authenticated but not registered as a user is sent to registration (`/onboarding`) with an instruction to return to this
screen. This route makes the decision (the outer frame's pre-check is not the line of defense; [0079](../../../../adr/0079-auth-frontend-seam.md)).

Only the authenticated actor's own purchases are returned; the contract owns filtering by ownership.

## Fetching

A single line: `GET /v1/purchases`. Results come in descending order of order date and time, and no sort condition is accepted.

**The list returns only summaries, without line items.** Neither product names nor item counts are on this screen. When line items are needed,
the detail is fetched.

### Filtering by Period

The URL holds a period type (all time / calendar month / date range / last N days) and that type's values. **The contract accepts not that
but only an instant half-open interval `[orderedAfter, orderedBefore)`.** Resolving the period type on the calendar is the screen side's job, and
the calendar and time zone are owned by `model/time-window.ts` ([0120](../../../../adr/0120-locale-aware-formatting.md)).

**Both ends are sent as RFC3339 with an offset.** A string without an offset leaves its interpretation to differences in the connected implementation.

**The upper bound is exclusive.** The end date is closed at the start of the next day. What the user chooses is a day, not an instant, so
all 24 hours of the chosen day are covered. Putting 23:59:59 as the upper bound would drop orders placed in that day's last second.

**The URL keeps the period type.** Putting the resolved interval in the URL would freeze a shared link at "the interval resolved
then," so opening it the next day would show yesterday's last 30 days. The form the user can read is also the period type.

**Filtering is always passed to the server as a query.** Date conditions must not be applied to already-fetched pages.
What is loaded is only a few pages from the newest, and applying conditions there yields a list missing "older purchases
that match the conditions."

**A request missing the required values for its period type is not sent.** Sending it would have the contract reject it, leaving a screen that cannot show the list at all.
Whether the assembly holds up as a condition is checked before sending.

**Unreadable conditions in the URL fall back to all time.** The URL can be edited directly by the user, so a form with only the period type
and no required value, and values unreadable as dates, both arrive. Passing them on as is would leave the list unable to show at all.
The fallback result appears in the inputs as is, so that it can be read from the screen that the specification is not in effect.

### Pagination

Cursor-based: the key carried on the previous page's response is passed to the next fetch. No total count is returned.

**The same interval is passed throughout pagination.** The contract guarantees continuity on that premise, and if the conditions
changed midway some purchases would be skipped.

**A relative period is resolved only once.** "Last N days" has a different answer at each moment of resolution, so resolving it again per page would
skip orders at the boundary. The interval resolved when fetching the first page is passed as is to the subsequent fetches.

**The interval's lower bound and the pagination key are different things.** The contract does not call both of them `after` — the former is
`orderedAfter`, the latter `after`. Spreading the interval as is when assembling fetch conditions would swap the key without the types
stopping it.

**The server fetches the first page, and the client fetches only the rest.** The client's incremental fetches are limited to a thin
same-origin endpoint ([0073](../../../../adr/0073-pagination-fetch-boundary.md)). Calling the backend directly from the client
would create another line of credential handling and timeout / retry.

The number loaded at once is the same for the first page and the rest. If they differed, the amount added at once would change each time the user reads on.

When the period changes, the accumulation is discarded and refetched. Reading the rest of the previous conditions would mix in purchases that do not match.

## Status

A status arrives with its business key and name already resolved, and neither needs re-fetching.

**The "successful terminal / cancelled / in progress" classification is made by business key.** The name is text shown to the user and is
rewritten for backend reasons. **An unknown business key is not assigned to any category.** Assigning it would assert a meaning that has not been
checked. It is shown in a form without a category, and since the name appears as text, the list stays readable even when the master
grows.

## Navigating to the Detail

The purchase code the list holds is itself the value passed to the detail fetch. The value shown to the user as the order number and
the value used for the next fetch are the same, so no separate identifier is carried around to assemble a row's destination.

## Failures

A fetch failure affects the whole screen. A generic message regardless of classification, an inquiry number and a retry link are shown
([0080](../../../../adr/0080-error-handling.md)). In production the body of a failure that occurred on the server is
hidden, and only the inquiry number reaches the boundary, so the classification cannot be read. The outer frame (header, nav) remains.

A failure fetching the rest does not bring down the whole list. What has been read stays, and only the end offers a reload.
Abortion due to changed conditions is not treated as a failure (there is no one left to tell).

## Related

- Contract: `GET /v1/purchases` in `openapi/api.gen.yaml`
- Implementation `src/features/purchases/` — [README](../../../../../src/features/purchases/README.md)
