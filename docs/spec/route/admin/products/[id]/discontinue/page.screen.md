# `/admin/products/[id]/discontinue` Discontinuing a Product (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).
>
> The layout shell's promises are held by [`../../../layout.screen.md`](../../../layout.screen.md).

A screen for seeing what discontinuing one product affects, and deciding whether to do it.

## What It Shows

From the top, in this order:

| Region | Content | When |
| --- | --- | --- |
| Heading | The screen's name, and that discontinuation cannot be undone | Always |
| Result | What the execution did | Only right after a successful execution |
| Estimate | The three counts, their freshness, and a path to read them again | While the product is not discontinued |
| Already discontinued | When the product was discontinued, and a link back to the list | When the product is discontinued |
| Rejection reason | Why the last execution was refused because of a purchase in progress | Only right after that refusal |
| Purchases in progress | The purchases blocking discontinuation | While the estimate counts at least one |
| Conditions and execution | The coupon conditions, 「廃番にする」 (discontinue) and 「キャンセル」 (cancel) | While the estimate counts none |

**The order follows the order of judgment:** what happened, what would happen, what stands in the way, and what to decide. The
result sits on top because it is the newest fact; the rejection reason sits directly above the purchases it is about.

## The Estimate

**The three counts are lined up at the same rank, each with its own note on the population it counts.** Carts holding the product
include carts with no owner; users who would receive a coupon exclude carts with no owner and closed accounts; and a single purchase
in progress is enough to block discontinuation. Numbers side by side read as coming from the same population unless they say
otherwise.

**State that the counts are the values as of loading and may not match the result.** The path to read them again is always present.

**When all three counts are zero, say that the product is in no cart and no coupon will be issued.** A row of zeros alone does not
say whether the execution will do anything.

## The Purchases in Progress

**Say what blocks discontinuation and what ends it:** it is possible once each purchase is completed, cancelled or delivered.

**Each row shows the purchase code, the status name, when it was ordered and the total.** Rows are not links.

**When not all of them are listed, say how many are shown and that more exist.**

**While they are loading, placeholder rows stand in their place, with the estimate already shown.** When they cannot be read, the
region says so and offers a path to read the screen again; the estimate stays.

## Coupon Conditions

**Two fields, discount rate and validity, with no values filled in.**

**The discount rate is labeled as a percentage, with a hint that `10` means 10% off.** The field is a text field that opens a
decimal keypad, not a numeric input — a numeric input would carry the value as a number.

**The validity carries a hint that it is counted from the day of issue, with the longest validity the contract allows.**

**Errors appear when trying to open the confirmation, next to each field, not when leaving a field.** Leaving a half-typed field is
not a mistake. **Changing a condition clears the previous messages.**

**When the outcome of the last execution is not known, the conditions cannot be edited.** The values stay as sent, and a line at the
top of the conditions says to discontinue again with the same conditions.

## Execution and Cancel

**「廃番にする」 (discontinue) has the destructive appearance and does not send — it opens the confirmation.** 「キャンセル」 (cancel)
sits next to it and returns to the list, for the path where someone looks at the impact and decides not to.

## Confirmation

**The title names the product.** The product name wraps rather than stretching the dialog.

**The body states:** that it cannot be undone; that the product becomes unpublished and can no longer be bought; that lines already
in carts stay, showing why they cannot be bought; and how many users would receive a coupon as of the estimate, with the rate and
validity as typed.

**The choices are 「やめる」 (stop) and 「廃番にする」 (discontinue), the latter with the destructive appearance.** Pressing the
background does not close it.

**Pressing 「廃番にする」 does not close it.** While sending, the button says so and cannot be pressed again.

| Outcome | The confirmation | Where the message appears |
| --- | --- | --- |
| Success | Closes | The result, at the top of the screen |
| Refused because a purchase in progress appeared | Closes | Directly above the purchases in progress |
| Conditions refused by the backend | Stays open | Inside the confirmation, and at the named fields |
| Any other failure | Stays open | Inside the confirmation |

**A refusal over a purchase in progress closes the confirmation** because the screen is read again and the execution is no longer
offered; left open, the message would float above an action that no longer exists. Other failures keep it open so the message
appears where the user is looking.

## The Result

**Shown at the top of the screen, outside the confirmation:** when it was discontinued, how many carts now show a reason, how many
users received a coupon, and how many coupons were issued.

**State that the counts exist only in this response and that reloading leaves only the date and time.** Below it, the screen
already shows the product as discontinued.

## Already Discontinued

**Show only that the product is discontinued and since when, with a link back to the list.** No estimate, no conditions, no
execution.

## Loading

**The loading UI shows the frame of the estimate and the height of the region below it, without promising which standing follows.**
Whether conditions or purchases appear is unknown until the estimate arrives.

## How Failure Looks

**When the product or the estimate cannot be read, only the main content is replaced, with the layout shell kept.** When only the
purchases in progress cannot be read, only that region says so.

## Differences by Band

**The three counts sit side by side from `sm` up, and stack below it.** The two condition fields do the same. A row of the
purchases in progress wraps its date and total under its code and status on narrow bands.

## Breadcrumbs

**商品一覧管理 > 商品名 > 廃番** (Product list management > product name > Discontinue).

## Checking in the Catalog

Storybook's `Page/Admin/Products/Discontinue` holds: can be discontinued (with tablet and smartphone), in no cart, purchases in
progress remain, not all of them listed, they cannot be read, the confirmation open, sending, unreadable conditions, conditions
refused by the backend, refused because a purchase in progress appeared, temporarily not accepted, the conditions held after that, the result after success, already
discontinued, and a product name of the contract's maximum length.

## Related

- [`../../page.screen.md`](../../page.screen.md) — the list whose row actions lead to this screen
- [`../stock/page.screen.md`](../stock/page.screen.md) — the other screen that shows a value as of loading with a path to read it
  again
