# `/checkout/complete` Purchase Complete (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen that tells the user the purchase succeeded and shows the receipt and contents.

## What It Shows

| Area | Content |
| --- | --- |
| Success notice | That the order was received |
| ご注文の控え (Order receipt) | Order number, order date and time, status |
| 内訳 (Breakdown) | Subtotal, tax, shipping and total, and the reference converted amount toggle for the total |
| ご購入いただいた商品 (Purchased products) | Product name, unit price at the time of purchase, quantity |
| Next links | Back to shopping / check the receipt later |

**Success comes first, followed by the receipt and contents.** What the user wants to know first is whether it went through; the breakdown is
something to check after that.

## What Is Not Shown

**No per-row amount.** Multiplying unit price by quantity would mean the screen creating an amount. The summed values are held
by the breakdown.

**The reference converted amount is added only to the total.** Adding it to each item in the breakdown would make it unreadable which one is
the amount charged.

**The purchase identifier is not shown.** What the user can bring to an inquiry is the order number; the value used for fetching is not
put on the screen.

## Placement

The breakdown is not stuck to the side. **This screen has no submit operation**, so there is no operation to keep on screen while
reading on. The receipt and the breakdown sit side by side on wide widths and stack on narrow widths.

## Not a dead end

Two next links are placed: a way back to shopping, and a way to check the receipt later. Without them, the user would try to
return to the pre-confirmation screen with the back operation.
