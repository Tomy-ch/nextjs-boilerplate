# `/admin/campaigns/new` Defining a Campaign (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../../layout.function.md`](../../layout.function.md).

Defines one campaign: a code users type to receive a coupon, the period it can be received in, how many can be
received, and the coupon each receiver gets.

## Actor and Ownership

**Requires the admin role.** The outer frame decides whether the screen can be reached, but **the submission endpoint checks for
itself too**. The submission is an entry point separate from the screen and can be called without going through the screen.

**The backend owns business validity.** This screen checks shape and the order relations it can see — that a code is spelled as
the contract allows, that the dates follow one another, that the per-user limit does not exceed the total. Whether a code is
already used, and whether the definition is acceptable as a whole, is judged by the backend
([0070](../../../../../adr/0070-backend-role-separation.md)).

**Defining distributes nothing.** No coupon exists until someone receives one with the code, and what a receiver gets is fixed at
that moment. A definition cannot be edited afterwards; it can only be suspended from the list.

## What Is Sent

| Field | Required | Notes |
| --- | --- | --- |
| Campaign code | ○ | Leading and trailing spaces are dropped and letters are upper-cased before it is stored. The spelling the contract allows is held by the contract |
| Discount | ○ | A kind (a fixed amount or a rate) and its value. A cap applies only to a rate |
| Scope | ○ | Every product, one category, or one product |
| Distribution start / end | ○ | The end is exclusive: from the end itself the code can no longer be used |
| Coupon expiry | ○ | After the distribution end |
| Coupon usable from | — | If empty, a coupon can be used from the moment it is received. Before the expiry |
| Total limit / per-user limit | ○ | Whole numbers of at least one; the per-user limit does not exceed the total |
| Minimum purchase | — | If empty, any purchase amount qualifies |

**Amounts are not converted through a number.** A fixed discount, a cap and a minimum purchase are typed in dollars; a rate is
typed as a percentage. Each is turned into the contract's shape (a decimal string, or whole cents) from what was typed, so no
rounding enters before sending. A fixed discount is typed to at most two decimal places.

**Dates are typed in the time zone of the person typing, and sent as instants.** The screen settles the wall-clock value in that
time zone just before sending; what is received is read back as the same instant.

**A scope carries exactly one target.** Every product has none; a category or a product carries its identifier. A kind without its
target cannot be sent.

## One place owns input validation

**The same validation runs both before sending and after receiving**, from the same module. Copying it to both sides creates two
ways of saying the same error.

## Submission

**A definition is sent only from the confirmation.** It cannot be changed afterwards and the same code cannot be used again, so
the content is read back once before it leaves.

**A resend carries the same idempotency key until the outcome is known.** The contract requires the key, and a second submission
of a code already defined is a conflict that cannot lead back to the first result — so whether a resend repeats the first
submission is decided by the key. **While a failure leaves the outcome open (the connection dropped, the service is
unavailable), the content cannot be changed**, only sent again as it is: different content under the same key is rejected.
Once a response settles the outcome, the next submission carries a new key. A screen opened again carries a new key.

## On success, go to the list

**On success, the list is made to refetch, then the user is sent to it.** The list never shows a state without the campaign just
defined.

## Failures

| What happened | What is shown |
| --- | --- |
| A shape or order error | Per-field messages, before sending |
| The code is already used (conflict) | On the code field. The other fields are kept |
| The backend named fields | On those fields |
| The backend rejected the content without naming a field | One message for the whole, in the confirmation |
| The outcome is open (connection dropped, service unavailable) | In the confirmation; the content is held until it is sent again |
| Insufficient role | Only that the submission itself did not go through |

**Rejections that name fields close the confirmation.** The fields to fix are on the screen, not in the confirmation.

## Related

- [`src/features/admin/README.md`](../../../../../../src/features/admin/README.md) — the implementation
- [`../page.function.md`](../page.function.md) — the list this screen returns to, and where a campaign is suspended
- [`../../../shop/mypage/coupons/page.function.md`](../../../shop/mypage/coupons/page.function.md) — where a user receives a coupon with the code
