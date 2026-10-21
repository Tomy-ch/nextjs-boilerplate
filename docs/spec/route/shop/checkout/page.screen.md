# `/checkout` Purchase Confirmation (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen where the user checks the shipping address and the order contents and places the order.

## What It Shows

| Area | Content |
| --- | --- |
| お届け先 (Shipping address) | Name, address and phone number, and a link to go change the registered information |
| ご注文内容 (Order contents) | The line items restated (product name, unit price, quantity, and the conditions flagged on that row), and a link back to the cart |
| クーポン (Coupon) | The coupons usable on the current cart, each with its face value, scope, discount amount and expiry, and the choice not to use one |
| Summary | Subtotal, the reference converted amount toggle, the estimated coupon discount when one is chosen, notes, and the confirm operation |

## Restating the Line Items

**No operations.** Changing quantities and removing items belong to the cart, and placing the same operations on two screens means
neither the user nor the implementation can trace on which one a change was made.

**When there are many, they are collapsed at 10.** They are not split into pages and sent to another screen — being able to check all of them before
paying is this screen's job. The count is shown in the heading even while collapsed.

**The expand / collapse operation is placed below the line items.** Where the user is right after expanding is then the same place they press to collapse.
At widths where the summary fits beside, it sticks to the bottom edge of the container so that the means of collapsing stays reachable even when the line items exceed the screen height.
At narrower widths it does not stick (the confirm band occupies the bottom edge of the screen).

**Unbuyable line items and line items whose value merely changed are written differently.** The former are excluded from the purchase; the latter are included.
Both are shown without dropping either (line items seen in the cart do not silently vanish). Conditions are worded the same as in the cart,
and the only thing this screen adds is a single sentence, "excluded" or "checked when placing the order."

**Only the product name is dimmed; the row is not faded as a whole.** Applying transparency to the row would also fade the text giving the reason it is not included,
and its contrast against the background would fall below what [0100](../../../../adr/0100-accessibility-target.md) requires.

## How Amounts Are Shown

**The amount in the base currency always stays shown.** That is the amount charged, and replacing it with the toggle would make it unreadable
which one is charged. The toggle only adds one reference row.

**When there is no reference converted amount, the toggle is not shown either.** An operation that makes nothing appear when pressed leaves the user unable to tell whether it failed
or is not supported. The rate and the reference date are added because an estimate is no use as a reference unless it says which day's
rate it is based on.

## Choosing a Coupon

**At most one is chosen, from a list.** Each candidate shows the discount amount it would give on this cart next to its face value, so candidates
can be compared without opening anything. The amount is the one the backend returned; the screen does not compute it from the face value.

**"Do not use" comes first, and nothing is chosen at the start.** A radio cannot be cleared once chosen; without an option to not use one,
a user who chose a coupon could not go back to buying without it. The choice takes effect when made — there is no separate "apply" operation.

**The summary shows the chosen coupon's discount as an estimate, and does not subtract it.** A row labelled as an estimate carries the
amount listed for the chosen candidate, in both the side summary and the bottom band, so the choice is confirmed where the amounts are read.
The subtotal stays as the backend returned it: the amount can change by the time the order is placed, and a subtracted figure would be an
amount this screen cannot promise. One sentence under the field says so, and one beside the estimate row says the discount is decided at
confirmation, so the band at narrow widths carries the reason next to the amount. The completion screen shows the amount actually applied.

**The field is placed once, at the end of the body column.** Placing it in the summary would put the same choice in both the side summary and the bottom band.

When the candidates cannot be read, the field's place holds a single sentence saying so and that the order can be placed without a coupon.
No retry operation is placed there.

## The Confirm Operation

**When no amount has changed, it is sent as is.** When one has changed, it is checked after pressing, offering three exits: **proceed, review and
fix**. Without an operation that just closes, there would be no way back from the check to the original screen.

Within the check, **every operation fits the width of its text**. The confirm in the summary is the screen's primary operation and so takes the full width, but
widening just one of the side-by-side operations would make the shorter text look larger and its weight would not match its text.

**When the chosen coupon is refused at confirmation**, the reason is shown next to the confirm operation and the order is not placed.
The candidates are fetched again, so the refused coupon is no longer listed and nothing is chosen. When other candidates remain,
the field also carries the error until another choice is made; when none remain, the field disappears and only the reason stays.
Choosing again also clears the reason next to the confirm operation, so a corrected choice does not look as if it fixed nothing.

**While a confirmation is in flight, and while the outcome of the last one is unknown, the coupon cannot be chosen again.** The field
stays reachable and says, in one sentence, that the coupon can be chosen again once the outcome is known and that the same order can be
confirmed again. Before the page is interactive the choices are disabled, and without JavaScript one sentence says the order can still
be placed without a coupon.

While sending, only the glyph is swapped and **the visible text stays put**. Lengthening the text would move the container's width, and in a stuck
summary or a fixed band even the surrounding positions would move.

## Responsive Layout

| Width | Content and summary | Where the summary goes |
| --- | --- | --- |
| `lg` and up | Two columns side by side | Stuck beside the body (bottom edge of the header + margin) |
| Below `lg` | Stacked | A band fixed to the bottom edge of the screen |

Only one of the two appears, and the content exists only once. **The switch is done with CSS**. Waiting for hydration
would make a container appear at the bottom of the screen after the user has started reading, shifting the content. Space for the band is left at the bottom of the body.
The coupon field stays at the end of the body column at every width; below `lg` it follows the line items.

## Empty State

When the cart has no products, it says there is nothing to confirm and shows only a link to browse products.

When the cart has no usable coupon, the coupon field is not shown at all. An empty choice offers nothing to decide.
