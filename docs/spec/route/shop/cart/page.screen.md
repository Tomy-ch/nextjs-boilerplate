# `/cart` Cart (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen where the user checks the cart's contents full-screen, changes quantities, removes items and proceeds to checkout.

## What It Shows

| Area | Content |
| --- | --- |
| Line items | Thumbnail, product name (a link to the detail), unit price, quantity increase / decrease, removal, and the conditions flagged on that row |
| Summary | Subtotal, a note on what the amount sums, and the link to checkout |
| Undo | A notice for returning a removed line item, inserted where the vanished row used to be |

The unit price is shown as the amount per item.

**The thumbnail is shown as decoration.** Its alternative text is empty and it carries no link to the detail. The adjacent text already
holds the same product name, so giving the image a name too would read the same name twice in a row, and giving it a link would
put two links to the same destination on one row.

**A line item without an image falls back to a substitute image.** A product that has no image at all and a line item whose product could not be fetched
are both the same state — "there is no picture to show" — and the response cannot tell them apart either. The frame is not dropped because the row
height would then vary per line item and the rows would no longer align.

**Product status is not shown.** It is not in the line items the contract returns, and showing it would mean fetching a product per line item.

## How Operations Look

**At the maximum, the increase operation becomes unpressable.** Leaving an operation that does nothing when pressed means the user cannot tell
whether it failed to respond or hit the limit. The same goes for the decrease operation when the quantity is 1.

**Only emptying the cart asks for confirmation.** Removing one row can be undone, but undoing a full clear means
remembering which products to put back, so the cost of a mispress grows with the number of rows. The confirmation runs as a submit inside the dialog,
and the dialog does not close when pressed (otherwise the in-flight display and the failure text would appear where the user is not
looking).

**A state that cannot proceed is not left as a link.** A link always navigates when pressed, and a link that does not navigate is, to
assistive technology, a broken link. When no line item is buyable, it becomes an unpressable button.

While sending, that operation is unpressable. On failure, the reason is shown **next to that operation**. The cart has
several operations, and a single line somewhere else cannot point to which one did not go through.

## How Undo Looks

A removed row is replaced in place by 「〈商品名〉 を削除しました ［カートに戻す］」 ("〈product name〉 was removed [Return to cart]").

- **It appears in the same place as the vanished row.** If where the user pressed and where the notice appears differ, the user has to
  trace back by eye which row vanished
- **The place is remembered by the order the screen showed, not by an index.** An index points somewhere else every time other rows
  are added or removed, and drifts when items are removed in succession
- **As many appear as were removed in succession.** If a later removal replaced the earlier notice, the way back would be lost for the earlier one alone
- **It does not remove itself when pressed.** If it collapsed itself mid-submission, the form would disappear before it finished sending
- The notice is announced without interrupting the screen reader
- The operation's name includes the product name. Several notices can appear at once, so the text alone cannot tell which one an operation returns

## How Conditions Are Shown

Conditions are listed without collapsing. A changed value and insufficient stock are separate decisions for the user.

| Condition | Sentence shown |
| --- | --- |
| `notFound` | この商品は取り扱いが終了しました。 |
| `unpublished` | この商品は現在購入できません。 |
| `discontinued` | この商品は廃番になりました。 |
| `outOfStock` | 在庫がありません。 |
| `insufficientStock` | 在庫が 〈n〉 個までです。(If the maximum is unknown, 「在庫が足りません。」) |
| `priceIncreased` | カートに入れたときより価格が上がっています。 |
| `priceDecreased` | カートに入れたときより価格が下がっています。 |

**Condition strength is shown in three levels.** Unbuyable conditions use the cancel color scheme and a circle glyph, value changes use the warning
color scheme and a triangle glyph, and the sentence the screen adds is shown weakly as a supplement. Making a value change as weak as the supplement lets
the amount change be skipped over; making it as strong as an unbuyable condition makes it unreadable which one to deal with. The glyphs differ too
because a distinction by color alone does not reach users who have trouble telling colors apart.

**If even one condition is flagged, the row notes that it is not included in the subtotal.** Why a row's amount and the subtotal
disagree can only be explained on that row.

**An unbuyable line item is shown dimmed, but its remove operation is not dimmed.** That is the action the user can
take on an unbuyable line item.

**A line item with insufficient stock shows, on that row, an operation that adjusts to the quantity buyable now.** What the user wants to know is
"how many can I buy," and with only increase / decrease operations they would have to count how many times to press. The operation's name includes
the target quantity and the item's name so that it is clear which row the operation belongs to. It is not shown on a line item with no stock at all
— there is nothing to adjust to, and the action available there is removal.

**A line item whose product could not be fetched lacks both name and unit price.** A substitute is shown in place of the name, and the detail is not reachable. The
substitute is also used in the operations' spoken names so that it is clear which row an operation belongs to.

## Responsive Layout

| Width | Line items and summary | Where the summary goes |
| --- | --- | --- |
| `lg` and up | Two columns side by side | Stuck beside the body |
| Below `lg` | Stacked | A drawer that comes up from the bottom of the screen |

Only one of the two appears, and the content exists only once. **The switch is done with CSS**. Waiting for hydration
would make a container appear at the bottom of the screen after the user has started reading, shifting the content.

The drawer **appears only while reading downward**. The more content there is, the farther the trailing summary moves off-screen,
and the user has to scroll to check it. When going back up, what the user wants to read is the body, so it hides by being left behind.
While hidden, a handle stays at the bottom edge of the screen, and **a state opened with the handle takes precedence over scroll direction**
(left to direction alone, there would be no way to reach it at a position where the page cannot scroll down). While hidden, its contents are
removed from the tab order. If focus entered somewhere invisible, input would be received there.

Space for the drawer is left below the line items. Without it, the last row's operations are hidden by the drawer.

## Loading

Only frames are shown, in the same column layout as the finished screen. If line items appeared first and the summary later, the reading
position would move. The frames show three rows; too many would look like more is in the cart than there is.

## Empty State

Only 「カートに商品が入っていません。」 ("Your cart is empty.") and a link back to browse products are shown. Neither line items nor the summary are shown.

**While returnable line items are held, undo is shown even when empty.** If the notice vanished right after removing the last
item, the way back would vanish with it.

## How Failure Looks

When fetching fails, a generic message regardless of classification, an inquiry number and a retry link are shown. The raw error body is
not shown (in production only `digest` reaches the boundary).

## Breadcrumbs

None. The header's entry point and the cart container's secondary link (「カートを見る」, "View cart") point directly at this screen, and
the hierarchy is one level deep ([0026](../../../../adr/0026-layout-shell-mount.md)).

## Related

- Implementation `src/features/cart/` — [README](../../../../../src/features/cart/README.md)
- The cart in the outer frame (sidebar / drawer / count) [`../layout.screen.md`](../layout.screen.md)
- Next: `/checkout` (purchase confirmation; inside authentication) / Back: `/products` (product list)
