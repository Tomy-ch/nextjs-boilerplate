# `/purchases/[code]` Purchase Detail (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**It sits inside the registered-user area.** Opened unauthenticated, it sends the user to login with an instruction to return to this screen.
An actor that is authenticated but not registered as a user is sent to registration (`/onboarding`) with an instruction to return to this
screen.

**Someone else's purchase and a nonexistent purchase are not distinguished.** The contract returns both as not found, keeping existence secret.
Even if the target is rewritten, this screen never shows someone else's purchase. The screen does not need to check the
owner.

## Fetching

Two lines: `GET /v1/purchases/{purchaseCode}` and the reference converted amount for the total.

**The purchase is fetched first, then the converted amount.** They could run in parallel, but starting the conversion fetch when the purchase is not found
is wasted and sends an extra request to the external rate provider.

### Identifiers

**What this screen receives in the URL is the purchase code.** The value shown to the user as the order number is itself
the fetch key, so the number the screen shows can be matched against as a receipt.

## Amounts

**All are the charged amounts as confirmed.** Subtotal, tax, shipping and total are all values the backend decided, and the screen does not
re-add them ([0070](../../../../../adr/0070-backend-role-separation.md)).

**A line item's unit price is the value at the time of purchase**, and does not move even if the product's current price changes. **Only the product name
arrives resolved to the current name**, so the name and the unit price refer to different points in time.

The reference converted amount is not the charged amount. What is stored is the amount in the base currency, and this value is used only for display.

## Advancing the Status

The user can do two things: pay and cancel. Shipping and delivery completion belong to admin and do not appear on this screen.

| Operation | Contract | Statuses where it goes through |
| --- | --- | --- |
| Pay | `PATCH /v1/purchases/{purchaseCode}/pay` | 未処理 / 受付中 / 確認中 (unprocessed / accepted / under review) |
| Cancel | `PATCH /v1/purchases/{purchaseCode}/cancel` | 未処理 / 受付中 / 確認中 / 処理中 / 支払い済み (unprocessed / accepted / under review / processing / paid) |

**Payment is not possible while processing.** Processing is the state "payment is done and processing toward shipping is under way," and the payment date and time
are already recorded. Sending a payment here would overwrite the recorded date and time with the current time, so the contract rejects it as a double
payment. Cancellation goes through from processing as well.

**Eligibility is judged by business key, not by name.** The name is text shown to the user and is
rewritten for backend reasons. The contract carries both the business key and the name on a status, and defines the business key as the one to branch on.
No operation is shown for an unknown business key (when the master grows, that would offer an irreversible operation for a state whose eligibility has not been
checked).

**The authority for the decision is the backend** ([0070](../../../../../adr/0070-backend-role-separation.md)). What the screen
decides is only whether to show the operation, and room remains for the submission to be rejected. The status can advance between loading
and pressing, and in that case it comes back as a conflict.

**Payment is simulated.** There is no payment SDK / PSP integration; this operation alone makes it paid
(the exclusions in `docs/spec/screens.md`).

### No actor assertion

The contract targets only the user's own purchases and keeps others' purchases secret down to their existence, so there is no path by which this operation reaches
someone else's purchase ([0079](../../../../../adr/0079-auth-frontend-seam.md)). That is where it differs from admin-side operations, which check
the role.

### Refetch on success

It is an operation that stays on the screen, so the state after advancing (the status display and the operations available from it) is redrawn by the same screen.
Without refetching, only the user who pressed would keep seeing the old state.

**The response is not passed to inner layers.** The transition response carries no product names on its line items and falls short of the purchase shape the screen shows.
Only that a response matching the contract came back is checked, and the refetched content is used.

**No resending.** If the same request arrives twice, the second is a conflict, so transitions are not idempotent. Resending a request cut off
mid-communication would make a transition that succeeded look like a failure.

### Conflict (409)

**The screen distinguishes "it does not go through in the current status."** The body the contract returns does not distinguish an invalid transition from a double
execution (both have the same classification and the same text). Only this screen can say why it was rejected per operation, so the classification
(`conflict`) is the signal for applying the screen's text. Using the text itself as the signal would silently break the distinction the moment the text
was edited.

## Failures

Not found brings the whole screen down to the not-found display. Other fetch failures affect the whole screen, showing a generic message
regardless of classification, an inquiry number and a retry link ([0080](../../../../../adr/0080-error-handling.md)).

**A failure to fetch the reference converted amount is not thrown.** What was charged is the amount in the base currency, and the converted amount is an accompaniment that helps
the reader grasp the magnitude. Throwing here would make the receipt itself unreadable while the external rate provider is down
(a partial error does not bring the whole down). That it could not be read is expressed by not showing the yen display.

**Even a nonexistent purchase returns a success status.** The response streams from the static shell, so by the time `notFound()` is reached the
headers have already gone out with 200. This cannot be solved by how it is written (under Cache Components a dynamic route streams from the static shell; [0041](../../../../../adr/0041-cache-components-decision.md) / [0080](../../../../../adr/0080-error-handling.md)). That it was not
found is conveyed by the not-found screen and `noindex`.

## Related

- Contract: `GET /v1/purchases/{purchaseCode}` / `PATCH …/pay` / `PATCH …/cancel` in `openapi/api.gen.yaml`
- Implementation `src/features/purchases/` — [README](../../../../../../src/features/purchases/README.md)
