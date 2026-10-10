# `/admin/analytics` Summary by Period (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).
>
> The layout shell's promises are held by [`../layout.function.md`](../layout.function.md).

## Actor and Ownership

Only administrators can open it. The layout shell holds that check. There is no notion of an owner.

## The URL holds the period

**The period in effect is carried in the URL.** A shared link, the back action and a reload must all give the same result,
and holding it in client state would make none of them work.

| Condition | Value |
| --- | --- |
| Period kind | `today` (default) / `month` / `range` |
| Start date | Only for `range`. A calendar date |
| End date | Only for `range`. A calendar date. This day is included |

**Use the contract's key names, and do not rename them on the sending side.**

**Do not carry dates for anything other than `range`.** The contract declares that it ignores them, but if they are not sent, the suspicion that "a value
that should have been ignored took effect" never arises in the first place.

## Validating Conditions

A period read from the URL is passed on only after going through **the reading side's schema**. The reading side is placed separately from the side that builds the URL
(`docs/rules.md#url`) — what builds it is client components such as the period options and the date overlay, and
mixing them in the same module lets the reading rules move for rendering's convenience. The kind is vocabulary the screen holds, not something
received from the contract.

A period that could not be carried over is not discarded; that fact is shown in place of the summary. Falling back from an unreadable period to the default and showing today's summary
would have the user read numbers for a period different from the one they meant to specify, without being able to tell they differ.

## The screen checks whether the period is valid

The contract returns 400 both for **a `range` missing a date** and for **a `range` with start and end reversed**. But both
have the same URL shape as **the state of being about to pick dates**. So as not to make them a shape that is rejected after a round trip, the screen
checks before sending ([0062](../../../../adr/0062-form-input-validation.md)).

| State | Handling |
| --- | --- |
| The dates are not both present | Do not request the summary. Prompt to pick both |
| The end date is before the start date | Do not request the summary. Prompt to pick again |

**Compare dates as strings.** The `YYYY-MM-DD` the contract receives has fixed digits, so lexical order is
calendar order as is. Converting to `Date` would compare values whose calendar dates have shifted by the browser's time difference.

## The target calendar dates are a copy

**The backend decides the boundaries, and they are not in the response.** To show on screen which days are being looked at,
the only way is to follow the same rules on this side too. Being a copy, it drifts silently if the backend's settings change.

The summary itself shows the backend's values as they are; **what drifts here is only the accompanying text**. The permanent
fix is for the contract to return the resolved period.

**The current time is read by the layer that interprets the URL.** A component that reads the real clock on every render would make the baseline images depend on the time
they were captured.

## Refetch Scope

Fetching is split in two, and each is a unit of loading and of failure.

| Area | Fetch | Follows the period |
| --- | --- | --- |
| Summary | `GET /v1/dashboard/summary` | Yes |
| Best sellers | `GET /v1/products/ranking/quantity` | **No** |

**The layer that interprets the URL does not fetch.** If it did, the whole screen, options included, would be replaced by the loading UI.

**Give the summary's loading a key.** When the period changes, the numbers are replaced wholesale. Without a key, the previous period's numbers remain until
the next summary arrives. Build the key in a form that represents the value uniquely — joining with a delimiter means that once the delimiter appears in a value,
a different period gets the same key.

## Best sellers do not follow the period selection

The contract accepts any interval, so they could be fetched for the same period as the summary. **Even so, they are fixed to the last 30 days,
and that is written in the heading.** Best sellers are read as "what is moving now", and if choosing a past month showed
the rankings of that time, they could not be used for judging the current assortment.

**Take the quantity axis.** The contract splits quantity order (`ranking/quantity`) and amount order (`ranking/amount`) into separate endpoints.
What this screen shows is quantity sold, so the heading names it by that axis too.

The populations differ as well. The ranking is limited to published products and sums line items (unit price × quantity). `salesAmount` is the
total of purchases (subtotal + tax + shipping) and does not look at products' publication state. **Adding them up does not match.**

## Fetch Failures

Received by the `/admin` error boundary. There is exactly one boundary, directly under the layout shell, and which screen failed does not reach it.

## The period is sent as a half-open interval of instants

What the contract receives is `[orderedAfter, orderedBefore)`, and it has no role in resolving calendar kinds (today, this month, range).
**Resolving them is the screen's side, and the calendar and time zone are held by `model/time-window.ts`** (ADR 0120).

**Both ends are sent as RFC3339 with an offset.** A string without an offset leaves its interpretation to implementation differences in the connection target.

**The upper bound is exclusive.** Putting 23:59:59 of the end date as the upper bound drops orders placed in the last second of that day.

**The breakdown of sales amounts cannot be obtained.** The ranking returns only quantity sold and holds no amounts.
