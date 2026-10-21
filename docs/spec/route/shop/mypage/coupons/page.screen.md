# `/mypage/coupons` Coupons (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen where the user checks the coupons they hold, with the status of each, and claims a new one with a campaign code. A route
independent of my page.

## What It Shows

Below the page header, top to bottom: the breadcrumbs, the claim field, then the list of held coupons.

**The claim field is placed above the list.** A successful claim adds one row to the list; with the field below it, the field would move
every time a row appears.

Each row of the list shows:

| Line | Content |
| --- | --- |
| Title | The status marker, then the discount (with its cap when it has one) |
| Condition | What it applies to (all products / a category / a product), and the minimum purchase amount when there is one |
| Timing | The time worth checking for that status — used: when it was used / not yet usable: when it becomes usable and when it expires / otherwise: when it expires |

The four statuses are **未使用 / 使用済み / 期限切れ / 利用開始前** (unused / used / expired / not yet usable). **The marker's text carries the
meaning, and its color only supports it.** The status is that of the coupon itself; whether it can be used with the current cart is not
said here — the purchase procedure answers that.

Rows are not pressable. The list is for reading.

## How Claiming Looks

| Moment | Display |
| --- | --- |
| `[受け取る]` ("Claim") pressed with the field empty (or whitespace only) | Nothing is sent. A message beside the field asks for the code, and goes away once typing resumes. The button is never made unpressable, so the reason is always reachable |
| While sending | The button shows that it is in progress |
| Claimed | A toast reports it, the field is cleared, and the list, fetched again, has one more row |
| The code was not accepted | One message beside the field, the same whatever the reason. The input stays so it can be fixed rather than retyped |
| The claim conflicted (`409`) / temporarily unavailable / the request could not be read | A message beside the form, with the input kept |

**Even on success the screen does not move.** The proof of the claim is the row that appears in the list, which stays after a reload
([0063](../../../../../adr/0063-mutation-result-notification.md)).

## Empty State

When no coupon is held, the list's place says so and points at the claim field above. The claim field stays.

## Loading

The page header stays. Everything below it — the breadcrumbs, the claim field and the list — is replaced by a placeholder until the list
arrives. The placeholder keeps the claim field's place, so the field does not move when the list arrives.

## How Failure Looks

When the list cannot be fetched, the area below the header is replaced by the failure display with a retry. The claim field is not
shown alone: without the list there is nowhere to see the result of a claim.

## Responsive Layout

| Width | Claim field |
| --- | --- |
| `sm` and up | The input and the button side by side |
| Below `sm` | Stacked |

The list is one column at every width.

## Breadcrumbs

`マイページ > クーポン` is placed. It has an ancestor that cannot be reached in one step from the global nav
([0026](../../../../../adr/0026-layout-shell-mount.md)).

## Checking in the Catalog

The list comes from the fixture, so all four statuses can be seen at once. The claim results are replaced inside each story of the claim
field. See the [feature README](../../../../../../src/features/coupons/README.md) for the story ids.

## Related

- Implementation `src/features/coupons/` — [README](../../../../../../src/features/coupons/README.md)
- Entry point [`/mypage`](../page.screen.md)
