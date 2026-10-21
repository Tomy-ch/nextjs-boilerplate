# `/admin` Dashboard (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The layout shell's promises are held by [`layout.function.md`](layout.function.md).

## Actor and Ownership

Only administrators can open it. The layout shell owns the check; this screen does not. There is no notion of an owner, and the
same numbers appear whoever opens it.

## What appears

`GET /v1/dashboard/summary` is called exactly once with the half-open interval representing today's calendar date
(`orderedAfter` / `orderedBefore`), and the returned values are shown as is.

| Value | Meaning |
| --- | --- |
| `salesAmount` | Total sales for the period. An integer in the smallest unit |
| `salesCount` | Number of purchases counted toward sales |
| `purchaseStatusCounts` | Counts by status. In the master's display order |
| `totalProductCount` | Number of registered products. Includes unpublished ones |
| `publishedProductCount` | Number of published products |

## Aggregates are not built in the frontend

**The backend has already done the composition.** If this screen held calculations spanning several fetch endpoints, the same
metric would be defined in two places, the backend and the screen ([0070](../../../adr/0070-backend-role-separation.md)).

**Neither totals nor ratios are built.** The response contains no combination that may be added together.

- Sales (`salesAmount` / `salesCount`) exclude cancellations and include unpaid purchases
- `purchaseStatusCounts` includes cancellations as one status
- Product counts are the master's current values, independent of the period

**Adding up the counts by status does not give `salesCount`.** The populations differ.

**Rank, ratio and bar length are not recounted by the screen.** The rendering side decides bar length from the counts it is given.

## Asking with an explicit period

**Resolving "today" on the calendar is the screen's job.** The contract has no "today" in its vocabulary; it only accepts a
half-open interval of instants, and omitting both ends aggregates the whole period. Without sending an interval, the whole
period's numbers appear as today's numbers.

## Not a separate endpoint from aggregates by period

It uses the same `GET /v1/dashboard/summary`. The only difference is **whether the user chooses a period**; there are two screens
because the viewpoints of the display differ ([`analytics/page.function.md`](analytics/page.function.md)).

## When a number may lead to a list

**A link is added only where the number and the destination share the same population.** If the count at the destination differs
from the number, one of them reads as wrong.

| Number | Destination | Basis |
| --- | --- | --- |
| Published products | None | There is no list of only published products. The admin list returns unpublished ones too, so it shows more than this number |
| Registered products | `/admin/products` | The admin list returns unpublished ones too. The unfiltered list matches this number |
| Sales / sales count | None | The contract has no fetch endpoint that lists purchases across customers. `GET /v1/purchases` returns only one's own purchases |

## Fetch Failures

The `/admin` error boundary catches them. There is exactly one boundary directly beneath the layout shell, and which screen failed
does not reach it. In production the message body is hidden and no classification reaches the boundary, so the text is generic
regardless of classification ([0080](../../../adr/0080-error-handling.md)).

## Refetch Scope

Since the user does not choose a period, there is no trigger for a refetch. The loading boundary covers only the aggregates
region, and the heading stays shown while loading.

## What the current contract cannot do

**No list of low-stock products.** `GET /v1/products/low-stock` is implemented, but this screen's subject is "how things stand
now", and a list of products to restock is a different subject.

**No sales breakdown (which product sold for how much).** The endpoint that ranks by amount
(`GET /v1/products/ranking/amount`) accepts the same half-open interval, but its population is limited to line items of published
products and does not match `salesAmount` (the sum of purchases' paid amounts regardless of publication state). Placing it here
would make a screen whose breakdown does not add up to the sales.
