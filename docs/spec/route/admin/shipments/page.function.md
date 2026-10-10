# `/admin/shipments` Shipping (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).

## Actor and Role

**Requires the admin role.** The definitive authorization of whether one can enter is held by the layout shell
(`app/admin/layout.tsx`), and the shipping submission checks the role again on receipt. The submission can be called without going
through the screen, so it is the last line of defense ([0079](../../../../adr/0079-auth-frontend-seam.md)).

## Fetching

Two sources are fetched in parallel. They do not depend on each other, so waiting in sequence would only queue the faster one behind
the slower one.

| Region | Fetch | Population |
| --- | --- | --- |
| Shipments awaiting dispatch | `GET /v1/purchases/shippable` | Purchases that are paid and not yet shipped |
| Awaiting delivery confirmation | `GET /v1/purchases` (`statusCodes=8` + `includeOtherUsers=true`) | Purchases that are shipped and not yet delivered |

**A failure of only one is not tolerated.** Both are used in succession by the same person in charge, and a screen showing only one
conveys nothing beyond "something is broken".

The `GET /v1/purchases/shippable` side. Shippable means paid and not yet shipped.

**The contract does the grouping.** Orders to the same buyer form one shipment; within a shipment, orders are sorted oldest order
date first, and shipments are sorted by their oldest order. The screen does not re-sort. Re-sorting would layer the screen's judgment
on top of the contract's judgment of "the unit that may be shipped together".

**The number of items read is left to the contract's default.** Grouping happens within that range, so if the screen decided the
count, it would also decide where shipments break. Orders from the same buyer outside the range become a separate shipment.

**There is no pagination.** The contract has none.

**Only the buyer's identifier arrives.** The contract does not include a name.

### Awaiting Delivery Confirmation

`GET /v1/purchases` is called with `includeOtherUsers=true`, so other users' purchases are included in the population. Only actors
with the admin role can specify it; otherwise the contract returns 403.

**There is no axis to group by.** The contract's delivery confirmation is per purchase, and whether something arrived also differs
per order. No shipment groups like those for dispatch are built.

**No pagination.** Adding it would need an incremental fetch endpoint ([0073](../../../../adr/0073-pagination-fetch-boundary.md)).
When the limit is reached, the rest appear as confirmations proceed.

## Dispatch

`PATCH /v1/purchases/{purchaseCode}/ship`. It goes through only from paid, and shipping twice is a conflict.

**Sent one at a time, in order.** The contract's shipping is per purchase, and there is no endpoint that instructs a batch. They are
not sent in parallel because that would make it impossible to count how far it got when rejected midway.

**Shipping one order and shipping a whole shipment are received by the same submission.** Expressing the grouping unit as a
difference in submission shape would give the receiving side two forms.

### When Rejected Midway

| How it is rejected | Handling |
| --- | --- |
| Cannot go through in the current situation (conflict) | Count it and continue |
| Anything else (no role, the connection target is down, etc.) | Stop there |

Stopping on a conflict means that merely because one order in a shipment was already shipped, orders that should go through advance
only one per re-press. Other failures recur the same way on the next order, so continuing to send would only increase the count.

**When everything has been sent to the end, it is a failure only if none went through.** Returning a partially successful
submission as a failure would make the shipments that went through look as if they never happened.

**When cut off midway, only the reason for cutting off is returned as the failure.** The number that went through is not reported.
Orders that went through show by disappearing from the refetched list (below).

### Refetch if even one went through

A shipped order is no longer awaiting dispatch. Leaving it would keep listing an action that is certain to conflict when pressed.
What remains in the refetched list is exactly "the orders not yet shipped".

**Refetch also when cut off midway.** Reporting why it was cut off and reflecting the shipments that succeeded up to then in the list
are separate matters; dropping the latter keeps shipped orders listed as unshipped.

## Delivery Confirmation

`PATCH /v1/purchases/{purchaseCode}/deliver`. It goes through only from shipped, and confirming twice is a conflict.

**Always received one at a time.** A shape that allows batch confirmation creates a path to marking even unchecked orders as
confirmed. A submission shape that can list several is not built at all.

**The shop side confirms that something arrived.** The contract has no carrier tracking, so the only basis this action rests on is
the confirmation of the person on the other side of the screen.

**Refetch when it goes through.** An order marked delivered is no longer shipped. Leaving it would keep listing an action that is
certain to conflict when pressed.

## Failures

A fetch failure affects the whole screen, showing a generic message regardless of classification, an inquiry number, and a retry
link ([0080](../../../../adr/0080-error-handling.md)). Zero orders awaiting dispatch is not a failure.

## Related

- Contract: `GET /v1/purchases/shippable` / `GET /v1/purchases` /
  `PATCH /v1/purchases/{purchaseCode}/ship` / `PATCH /v1/purchases/{purchaseCode}/deliver` in `openapi/api.gen.yaml`
- Implementation: `src/features/admin/shipments/` — [README](../../../../../src/features/admin/shipments/README.md)
