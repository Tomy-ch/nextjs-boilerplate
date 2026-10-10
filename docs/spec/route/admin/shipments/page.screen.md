# `/admin/shipments` Shipping (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen for checking paid but not yet shipped orders shipment by shipment and dispatching them, and for marking shipped orders as delivered.

## What It Shows

| Region | Content |
| --- | --- |
| Heading | The screen's name, and one sentence on what is listed |
| Shipments | The recipient, and the orders that may be grouped to that recipient |
| Shipped | Orders awaiting delivery confirmation |

**Shipments are stacked vertically.** The number of orders in a shipment varies, and laying them out horizontally creates columns of
uneven height.

**Both regions sit on one screen.** Both are viewed by the same person at the same time, and orders proceed from dispatch straight to
delivery. Splitting the screen would require navigating to see orders just shipped.

**Shipped sits below the shipments.** Dispatch is cleared first, and delivery confirmation happens after word of arrival comes in.
Reversing the order puts the region looked at first each day at the bottom.

## How Shipments Look

| Row | Content |
| --- | --- |
| Heading | 「宛先」 (recipient) and the buyer's identifier |
| Order | Order number, order date and time, total, and the action that ships that one order |
| End | The action that ships the whole shipment |

**The heading says 「宛先」 explicitly.** Buyers and orders are both shown by identifier, so listing them together makes similar-looking
strings run down the page, and it cannot be read which one is the shipment's key.

**The buyer is shown as the identifier.** The contract does not include a name ([`page.function.md`](page.function.md)). The purpose
is to tell shipments apart, so the identifier is enough.

**A shipment with only one order does not show the group action.** It would only put two actions that send the same order side by
side and make the user think about which to press.

## Interaction

**No confirmation step.** Shipping is assembly-line work, pressed dozens of times a day. Inserting a confirmation for each only builds
the habit of pressing without reading it and does not reduce mistaken presses. The target (recipient and orders) is on screen before
pressing.

**Disabled while pressing.** This both stops double submission and shows that the pressed action is in progress
([0061](../../../../adr/0061-form-mutation-ux.md)).

## How Results Are Shown

Results are shown per shipment. The submission unit is the shipment, so gathering results at the top of the screen would make it
impossible to read which shipment a result belongs to.

| Result | Text shown |
| --- | --- |
| All went through | 「N 件を発送しました。」 (shipped N orders) |
| Some went through | 「N 件を発送しました。M 件はいまの状況では発送できませんでした。」 (shipped N; M could not be shipped in the current situation) |
| None went through | The reason for rejection (that it cannot be shipped in the current situation) |

**Show both the number that went through and the number that did not.** The contract's shipping is per order, so a grouped shipment
can go through partway. Folding it into a single success or failure would hide what went through.

**Shipments that went through disappear from the list** ([`page.function.md`](page.function.md)). A shipment where everything went
through disappears along with its result text, but the shipment's disappearance itself shows it went through. A shipment where only
some went through remains, and the breakdown of counts appears there.

## How Shipped Orders Look

| Row | Content |
| --- | --- |
| Heading | 「発送済み」 (shipped) |
| Order | Order number, order date and time, total, and the action that marks that one order as delivered |

**No group action.** Whether something arrived differs per order ([`page.function.md`](page.function.md)). A shape that allows batch
confirmation creates a path to marking even unchecked orders as confirmed.

**Only one result is shown in this region.** Showing it beside the pressed row would mean holding submission state per row; the
states multiply with the number of identical actions, and which result is the latest becomes unreadable.

| Result | Text shown |
| --- | --- |
| Went through | 「注文 &lt;注文番号&gt; を配達済みにしました。」 (marked order &lt;order number&gt; as delivered) |
| Did not go through | The reason for rejection (it was already confirmed between loading and now) |

**Write which order was confirmed.** The list disappears on refetch, so with only "confirmed" the sole remaining clue is that the
pressed row vanished.

**When no orders await confirmation, say so inside this region.** Removing the whole region would make it unreadable that delivery
confirmation exists on this screen at all.

## When there is nothing to list

**Only when both regions are empty**, show just 「発送を待っている注文はありません。」 (no orders are awaiting shipment). The contract
returns this not as a failure but as an empty sequence, so the screen treats it as normal too. No next destination is placed (there is
nothing to do but wait).

One region alone being empty is a state where the work is done; it does not mean the screen has nothing.

## Loading

Show only shipment frames at the same height as the finished result. Substituting a single spinner changes the height the moment
content renders and moves the position where reading started.

## Related

- Implementation: `src/features/admin/shipments/` — [README](../../../../../src/features/admin/shipments/README.md)
