# `/admin/users/[id]/coupons/new` Issuing a Coupon to One User (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../../../../layout.function.md`](../../../../layout.function.md).

Issues one coupon to one named user: its discount, the products it applies to, when it expires, and optionally when it becomes
usable and the minimum purchase it needs.

## Actor and Ownership

**Requires the admin role.** The outer frame decides whether the screen can be reached, but **the submission endpoint checks for
itself too**. The submission is an entry point separate from the screen and can be called without going through the screen.

**The recipient is decided by the URL, never chosen on this screen.** The way in is a row of the user list; the screen shows who
will receive the coupon and offers no control that changes it. An issuance cannot be undone, so choosing the recipient on the
same surface as the content would widen the room for sending it to the wrong person.

**The backend owns business validity.** This screen checks shape and the order relation it can see — that the usable-from date
comes before the expiry. Whether the recipient can still receive a coupon, whether the scope's target exists, and whether the
content is acceptable as a whole, is judged by the backend ([0070](../../../../../../../adr/0070-backend-role-separation.md)).

**An issuance cannot be undone or edited.** The contract has no path to revoke or change an issued coupon.

## Who Can Receive

**Only a user who has not closed their account.** A user that does not exist is the not-found surface. A user who has closed their
account is shown as such, with no form — there is nothing this screen can send for them.

## What Is Sent

| Field | Required | Notes |
| --- | --- | --- |
| Recipient | ○ | The user the URL names. Not an input |
| Discount | ○ | A kind (a fixed amount or a rate) and its value. A cap applies only to a rate |
| Scope | ○ | Every product, one category, or one product |
| Expiry | ○ | The first moment the coupon can no longer be used |
| Usable from | — | If empty, the coupon can be used from the moment it is issued. Before the expiry |
| Minimum purchase | — | If empty, any purchase amount qualifies |

**Amounts, dates and the scope follow the same rules as defining a campaign** — amounts are not converted through a number, dates
are typed in the typist's time zone and sent as instants, and a scope carries exactly one target
([`../../../../campaigns/new/page.function.md`](../../../../campaigns/new/page.function.md)).

## One place owns input validation

**The same validation runs both before sending and after receiving**, from the same module.

## Submission

**An issuance is sent only from the confirmation**, which names the recipient. It cannot be undone, so the content and the person
are read back once before it leaves.

**A resend carries the same idempotency key until the outcome is known.** The contract requires the key and replays the first
result for a resend under it; a different key is a different issuance. **While a failure leaves the outcome open (the connection
dropped, the service is unavailable), the content cannot be changed**, only sent again as it is. **A conflict is read as the same
key's request still being processed**: the key and the content stay held, and the message asks to send the same content again
later. Once a response settles the outcome — success included — the next submission carries a new key. A screen opened again
carries a new key.

## On success, stay

**On success the screen stays and says who received what.** No screen on the management side shows a user's coupons, so a
destination could not show that the issuance happened. The form is emptied and hidden behind 「続けて発行する」, so a second
issuance is never sent by pressing the same control again without noticing; it carries a new key.

## Failures

| What happened | What is shown |
| --- | --- |
| A shape or order error | Per-field messages, before sending |
| The recipient closed their account or no longer exists | The form is replaced by a surface that says so and leads back to the list. Nothing can be resent |
| The scope's category or product no longer exists | On that target's field. The rest is kept and can be sent again |
| Which of the two was not found cannot be told | One message naming neither, in the confirmation |
| A conflict | In the confirmation; the content stays held for sending again |
| The backend named fields | On those fields |
| The backend rejected the content without naming a field | One message for the whole, in the confirmation |
| The outcome is open (connection dropped, service unavailable) | In the confirmation; the content is held until it is sent again |
| Insufficient role | Only that the submission itself did not go through |

**The two "not found" answers are told apart by the screen, not by the response.** The contract returns the same status for a
missing recipient and a missing scope target. A scope of every product has no target, so a not-found there is the recipient. Otherwise
the recipient is read again: absent or closed means the recipient; present means the target.

**Rejections that name fields close the confirmation.** The fields to fix are on the screen, not in the confirmation.

## Not Reached Without a Backend

**That the issued coupon appears in the user's own coupon list** cannot be shown against the mock: the mock keeps no state between
requests, and the user signed in on the shopper side is not the recipient. The journey stops at the screen's success report.

## Related

- [`src/features/admin/README.md`](../../../../../../../../src/features/admin/README.md) — the implementation
- [`../../../page.function.md`](../../../page.function.md) — the user list this screen is entered from and returns to
- [`../../../../../shop/mypage/coupons/page.function.md`](../../../../../shop/mypage/coupons/page.function.md) — where a user sees the coupons they hold
