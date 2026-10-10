# `/purchases/[code]` Purchase Detail (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen for checking one purchase's receipt, the breakdown of the charged amount, and the products bought.

## What It Shows

| Area | Content |
| --- | --- |
| Breadcrumbs | Purchase history → order number. The print operation at the right end of the same row |
| Receipt | Order number, order date and time, status, and what can be done with the purchase now |
| Breakdown | Subtotal, tax, shipping and total, and the yen reference converted amount toggle |
| Line items | Product name, unit price at the time of purchase, quantity |
| Links | Back to purchase history / Continue shopping |

**The current location is shown by the order number.** It is the user's cue for telling this screen apart, and is also used for matching against the receipt.
The contract returns a long identifier, so it is truncated by width within the breadcrumbs (the full text is in the receipt).

**The status is shown in the same color as the list's row.** If a purchase that had the cancel color scheme in the list became plain text in the detail,
it would be unreadable whether they are saying the same thing. The grouping is the same as [`../page.screen.md`](../page.screen.md).

**The order number wraps within the receipt.** Truncating and hiding it would keep the full text from being read when making an inquiry.

**No per-row amount.** Multiplying unit price by quantity would mean the screen creating an amount. The summed values are held by
the breakdown.

## What Can Be Done with This Purchase

Placed inside the receipt, right below the status. **What can be done is decided by the very status the receipt shows**, so
separating the basis from the operations would send the user looking elsewhere on the screen for why the pressable operations changed.

| Status | Operations shown |
| --- | --- |
| 未処理 / 受付中 / 確認中 (unprocessed / accepted / under review) | 支払う (Pay), キャンセルする (Cancel) |
| 処理中 / 支払い済み (processing / paid) | キャンセルする (Cancel) |
| 発送済み / 配達済み / 完了 / キャンセル (shipped / delivered / completed / cancelled) | None (the row itself is not shown) |

**Operations that cannot be done are not shown, rather than made unpressable.** An unpressable button reads as "pressable someday."
If a grayed-out 「支払う」 remained on a paid order, it would not convey what to wait for. For a purchase with nothing
that can be done, the row itself does not appear (no empty space is left behind).

**The advancing operation is shown as primary, and cancellation only as an outline.** The order is also pay, then cancel. That it cannot be undone
is conveyed by the red execute button inside the confirmation, so it is always seen at the moment of confirming.

### Confirmation

**Both interpose a confirmation.** Cancellation cannot be undone, and payment carries monetary meaning. Merely pressing the backdrop does not close it;
the user is made to choose the close operation explicitly.

The confirmation's body states what will happen and whether it can be undone.

| Operation | What it states |
| --- | --- |
| 支払う (Pay) | That there is no payment-method input and this operation alone confirms it / that it can be cancelled until shipped |
| キャンセルする (Cancel) | That it cannot be undone / that the products return to stock and buying again requires a new order |

### How Results Are Shown

| Result | Where it is shown |
| --- | --- |
| Did not go through | **Inside the confirmation.** The confirmation stays open after submitting, so showing it outside would put the text where the user is not looking |
| Rejected by status (409) | Same as above. A reload link is added as well |
| Succeeded | **The row where the operations are listed.** On an advanced purchase the confirmation vanishes along with its operations, so the remaining side carries the notice |

**The reload link is added only when rejected by status.** The reason for rejection is that "the purchase advanced between loading and
now," so the next thing to do is not to press the same operation again but to look at the current status.

## How Amounts Look

**The amount in the base currency always stays shown.** The yen toggle only adds one reference row; it does not replace anything.
Replacing would make it unreadable in which currency the charge was made.

**The reference converted amount is added only to the total.** Adding it to each item in the breakdown would make it unreadable which one is
the amount charged.

**When there is no reference converted amount, the toggle is not shown at all.** An operation that makes nothing appear when pressed cannot be told apart as
failed or unsupported. Neither 0 yen nor a substitute symbol is placed (leaving a form readable as an amount would make the failure to convert
be taken as "that is the amount").

The rate and reference date used for conversion are added. An estimate is no use as a reference unless it says which day's rate it is based on.

## What Goes to Paper

This purchase's receipt is something to keep at hand, so the print operation is placed at the right end of the same row as the breadcrumbs.

| Printed | Not printed |
| --- | --- |
| Receipt, breakdown, line items | Breadcrumbs, the next links, the print operation itself, the yen toggle, the operations on this purchase |

Operations that cannot be pressed only take up space on the page, so they are dropped.

## Responsive Layout

| Width | Receipt and breakdown |
| --- | --- |
| `lg` and up | Two columns side by side |
| Below `lg` | Stacked |

The line items are placed below at full width at either width. The row count is unpredictable, so putting them to the side would make product names keep wrapping
in a narrow column.

**The breakdown is not stuck to the side.** What the user wants to keep on screen while reading on is not the charged amount but the status on the receipt's
side and the operations available from it.

## Loading

Only frames are shown, in the same column layout as the finished screen. If the receipt appeared first and the breakdown later, the reading
position would move.

## When Not Found

It falls to the not-found display. Someone else's purchase and a nonexistent purchase are not distinguished
([`page.function.md`](page.function.md)).

## Headings

**Not shown on the screen.** The current location in the breadcrumbs (the order number) carries the heading, and overlaying one would put the same
identifier twice in a row.

**It is placed in the document, though.** If it were omitted, the only way for assistive technology to learn "which purchase am I looking at" would be
to trace the breadcrumbs. The order number is placed as an invisible heading, and the screen's appearance does not
change.

## Related

- Implementation `src/features/purchases/` — [README](../../../../../../src/features/purchases/README.md)
- Back: [`/purchases`](../page.screen.md) (purchase history)
- A screen showing the same receipt: `/checkout/complete` (purchase complete)
