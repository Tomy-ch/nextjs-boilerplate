# `/checkout` Purchase Confirmation (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**It sits inside the registered-user area.** Opened unauthenticated, it sends the user to login with an instruction to return to this screen.
An actor that is authenticated but not registered as a user is sent to registration (`/onboarding`) with an instruction to return to this
screen. The decision is made before rendering the actor's information (the outer frame does not protect; [0079](../../../../adr/0079-auth-frontend-seam.md)).

**The backend owns both the line items and the amounts.** What this screen owns is having the user confirm whether to place the order, and
sending the confirmation exactly once.

## The content shown is refetched on this screen

The content as of viewing the cart is not carried along. **Every refetch re-evaluates each line item**, so line items that became
unbuyable or whose values changed may first appear here.

The shipping address is taken from the registered information. **It is not edited on this screen** — purchase creation receives only products and
quantities, and the backend decides the shipping address at purchase time. Placing an editing endpoint would have the user edit a value that is never
sent.

## Line Items Included in the Purchase

**Only line items with an unbuyable condition are excluded.** Line items whose value merely changed are included. Excluding them would silently drop
what the user meant to buy.

**When an amount has changed, the confirm operation checks it.** Only a submission that carries the acknowledgment signal goes through,
and a submission without the signal is stopped on the Server Action side too (because there are calls that do not go through the screen).
The acknowledgment reaches the backend by setting that line item again at its current quantity. Setting it replaces the presented
price with the current price, so the condition disappears on the next fetch.

**If no line item is buyable, the order cannot be placed.**

## Amounts

The subtotal is shown exactly as the backend returned it. **It is a reference value summing only line items with no condition**, and
this screen does not re-add it.

**Tax, shipping and total cannot be shown until the order is placed.** They are decided only in the response that creates the purchase. What is unknown is not
listed as 0; when it will be decided is noted instead.

The reference converted amount in the display currency **does not stop the purchase even if it cannot be read**. What is charged is the amount in the base currency,
and the converted amount is an accompaniment that helps the reader grasp the magnitude.

## Coupons

**The backend decides which coupons can be used and how much each discounts.** This screen lists what it returned and computes neither.
Used, expired and zero-discount coupons are not in the list. A cart with no usable coupon, or no cart at all, is an empty list rather than an error.

**The candidates are not locked.** The discount is decided again when the order is placed, and it can differ from what was listed.
A coupon that would discount nothing at that moment refuses the order rather than being dropped from it.

**At most one coupon goes with an order.** When none is chosen, the submission carries no coupon at all.

**The candidates do not stop the purchase even if they cannot be read.** A coupon is not a required part of buying.

## Submitting the Order

**The line items sent are rebuilt from the cart at the moment of submission.** Sending back what the screen showed would let an order be placed on
stale premises even if stock or prices changed while the screen was left open.

**One idempotency key is created each time the screen is opened.** Pressing twice or resending after a failure whose outcome is
unknown still leaves one purchase. Reopening the screen with the intent to buy again gives a different key. **Once the order is refused — a coupon that cannot be used, or a
conflict in stock or price — the next submission takes a new key**, since it may carry different content. A failure whose outcome is unknown
(the backend unavailable, an internal error) keeps the key so the same submission can be resent. **While that outcome is open, the
submission's content does not change**: the backend replays the first result for a repeated key, so a different coupon under it would
silently return the purchase made with the earlier one. This holds even when the candidates were fetched again
meanwhile and no longer list the chosen coupon: it is still sent.

**A coupon refused at confirmation refetches the candidates.** Every reason the backend refuses one for (expired, used, not held, zero
discount) is a coupon the next fetch no longer lists, so the user chooses again from what is current. The next submission takes a new
idempotency key, as above.

If stock runs short at the moment of placing the order, it comes back as a failure. This margin remains even after passing the cart's
re-evaluation.

## After It Succeeds

**Send the user to the completion screen.** Showing completion on the same screen would make completion vanish on reload, and the back operation would
return to the pre-confirmation screen.

**Remove the purchased line items from the cart.** A purchase does not empty the cart. Even if they cannot be removed, completion is
still shown (the purchase has already succeeded, and hiding completion because of a cleanup failure would make it look as if the purchase failed).
The cart shown in the outer frame is refetched too.

## Failure Semantics

| Failure | How it is shown |
| --- | --- |
| The content cannot be fetched | The whole screen falls to the `error` boundary (there is nothing to confirm) |
| The reference converted amount cannot be fetched | Only the converted amount row is absent. Placing the order still works |
| The usable coupons cannot be fetched | The coupon field says so in one sentence. Placing the order without a coupon still works |
| The chosen coupon is refused at confirmation | The reason is shown next to the confirm operation and on the coupon field. The candidates are fetched again and nothing is chosen |
| The order does not go through | The reason is shown next to the confirm operation. The screen is kept |
