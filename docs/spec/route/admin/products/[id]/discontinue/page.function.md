# `/admin/products/[id]/discontinue` Discontinuing a Product (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../../../layout.function.md`](../../../layout.function.md).

Shows what discontinuing one product would affect, takes the conditions of the replacement coupon, and discontinues it.
Discontinuation cannot be undone, and this screen offers no way back from it.

## Actor and Ownership

**Requires the admin role.** The outer frame decides whether the screen can be reached.

**The backend owns everything that decides the outcome** — which carts hold the product, who receives a coupon, whether a purchase
in progress blocks the discontinuation, and which conditions are acceptable. This screen builds the conditions, sends them, and
shows what came back ([0070](../../../../../../adr/0070-backend-role-separation.md)).

## The Product Is Read Including Unpublished Ones

**The product is read from the population that includes unpublished products.** A discontinued product becomes unpublished, so
reading only published products would turn this screen into not-found the moment the product is discontinued, and for every product
already discontinued. An identifier that does not exist is not-found.

## Fetching

| What | When | If it fails |
| --- | --- | --- |
| The product | Always | The whole screen |
| The estimate | Only when the product is not discontinued yet | The whole screen |
| The purchases in progress | Only when the estimate counts at least one | Only that region; the estimate stays |

**A product already discontinued gets no estimate.** Running the discontinuation again changes nothing and reports zeros, so there
is nothing to estimate and nothing to offer.

**The estimate is a snapshot, not a promise.** It is read without locking anything and is stale as soon as it returns. It carries
a freshness note and a path to read it again, and **it is never shown as the result** — what actually happened comes only from
the response to the execution.

**The purchases in progress are fetched separately and fail separately.** They answer "what is blocking it", which is secondary to
the estimate; a failure to read them does not take the estimate away
([0080](../../../../../../adr/0080-error-handling.md)).

## Three Standings

| Standing | What is shown | Execution |
| --- | --- | --- |
| Can be discontinued (the estimate counts no purchase in progress) | The estimate and the coupon conditions | Offered |
| Purchases in progress remain | The estimate and those purchases | Not offered |
| Already discontinued | When it was discontinued | Not offered |

**While a purchase in progress remains, the execution is not offered.** The contract rejects the discontinuation while one remains,
so an action known to be rejected is not placed. What the screen shows instead is those purchases, because finishing them is what
makes discontinuation possible.

**"Empty" means the product is in no cart** — all three counts are zero. The execution is still offered; it simply issues no
coupons.

**The three standings are switched without discarding what was submitted.** After a submission the screen is fetched again, and
the standing it lands in may differ from the one it started in. The result of the submission survives that switch.

## The Purchases in Progress

**The population is the estimate's own: purchases of every user that contain this product and are neither completed, cancelled
nor delivered.** The count in the estimate and the rows listed beside it must come from the same population, or the two numbers
read as contradicting each other. The narrowing is sent to the backend as conditions; the screen does not filter rows it received.

**At most 20 are listed, with no pagination.** When there are more, or when fewer are listed than the estimate counted (a purchase
added after the estimate, or a status the screen does not know), the screen says that not all of them are listed.

**A row leads nowhere.** The admin side has no screen for a single purchase, and a row that does nothing when pressed is not
offered as a link.

## Coupon Conditions

**Both conditions start empty and are required.** How much to compensate and for how long is a business decision; a value placed
in advance cannot be told apart from a value someone chose.

**The discount rate is typed as a percentage** (`10` for 10% off) **and sent as the contract's multiplier, a decimal string.** The
screen moves the decimal point two places as text and never converts it to a number
([`docs/rules.md`](../../../../../../rules.md#formatting): decimals are carried as strings). Before that, the text is checked
against the shape the contract declares; whitespace, signs, exponents, full-width digits and a `%` sign do not read. The number of
digits is not limited.

**The range of the rate (greater than 0, at most 1) is not checked on the screen.** The contract states it only in prose, so the
screen sends `0` and anything above 100, and the rejection comes back to the field.

**The validity is a whole number of days within the range the contract declares,** and is checked on the screen against that
declaration, without a limit of the screen's own.

**Conditions that do not read stop the confirmation from opening.** The reason is given at each field.

## Confirmation

**Discontinuation is sent only from inside a confirmation.** The submission carries a signal that the confirmation was passed, and
the submission target refuses a submission without it — the target can be called without going through this screen. A submission
missing the product, the idempotency key or the signal is answered by asking the user to open the screen again; none of them is
something the user can fix in place.

## Submission

**What is sent is the two conditions, with an idempotency key.** The key is made once each time the screen is assembled and is
kept for as long as the screen stays mounted, so a resent submission folds into the first one.

**On success, stay on this screen.** The counts of what the execution did — carts that now show a reason, users who received a
coupon, coupons issued — exist only in its response; the contract has no endpoint to read them back, and running it again reports
zeros. Moving to another screen would lose them. The screen is fetched again and shows the product as discontinued, with the
response above it.

**This departs from "once it succeeds, move to another URL" ([`docs/rules.md`](../../../../../../rules.md#forms)) only in what a
reload loses.** The completion itself does not disappear: a reload still shows when the product was discontinued. Only the counts
disappear, and the screen says so.

## Failures

| What happened | Handling |
| --- | --- |
| A purchase in progress appeared after the estimate (409) | A message only this screen can give. The screen is fetched again, so the current estimate and the remaining purchases appear |
| The backend named the conditions it refused (422) | Shown at those fields. A refusal naming no field this screen has gets the generic message |
| The conditions do not read | Stopped before the confirmation opens |
| The product, key or confirmation signal is missing | Asks the user to open the screen again |
| Temporarily not accepted, or any other failure | The catalog's wording for that category |
| The purchases in progress cannot be read | Only that region says so, with a path to read it again |
| Insufficient role | Does not appear on this screen, because the layout shell stops it at the entry point |

## Related

- [`../../page.function.md`](../../page.function.md) — the list whose row actions lead to this screen
- [`../edit/page.function.md`](../edit/page.function.md) / [`../stock/page.function.md`](../stock/page.function.md) — the other
  screens for one product
- Contract: `GET /v1/products/{productId}` / `GET /v1/products/{productId}/discontinue-impact` /
  `POST /v1/products/{productId}/discontinue` / `GET /v1/purchases` in `openapi/api.gen.yaml`
- [`src/features/admin/README.md`](../../../../../../../src/features/admin/README.md) — the implementation
