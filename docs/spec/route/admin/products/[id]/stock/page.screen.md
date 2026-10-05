# `/admin/products/[id]/stock` Restocking (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen for entering one number and sending it.

## Three Tiers

Arranged in the order **how many there are now → which way and how many to move → send**. The order of judgment becomes the
vertical order as is.

## How many there are now is shown with its freshness

**Show the current stock as a number, and state that it is the value as of loading.** Stock moves at any time through other
actors' sales and restocking, so the number shown here is a copy taken the moment the screen was opened.

**A refetch link is always present.** Looking for it after realizing the number is off is too late, and there are always people who
want to check before sending.

**The product name wraps and is cut off at 2 lines.** Squeezing it into one line means forbidding wrapping, and a name of the length
the contract allows stretches the whole frame sideways.

## Direction is a choice of two

**An exclusive choice of 「補充する」 (restock) and 「差し引く」 (subtract). The default is restock.** Since the screen is named
restocking, it starts on the increasing side.

**The options stay shown.** If they were collapsed, a quantity could be typed without noticing that the opposite direction is
currently selected.

## Showing the projection after sending

**From the chosen direction and the typed quantity, show what the stock will be once sent.** Instead of having a person write the
sign, this lets them confirm on the spot which way it takes effect.

**It is premised on being a reference value.** Since the current stock is a copy, this number may not match the actual result.

**Input is not stopped even if it goes negative.** The only basis for stopping it is the stale stock, so whether it is rejected is
known after sending ([functional requirements](page.function.md)). **When negative, only state that the request cannot be accepted.**

**Not shown while the quantity cannot be read.** The number would move with every keystroke and be unreadable.

## How Errors Are Shown

**Input errors appear next to the field. No summary.** There is only one input field, so a summary would only repeat what the text
next to the field says.

**A failure of the submission itself appears at the top of the form.** There is nothing in the input to fix.

**Once the input is corrected, the previous result is cleared.** The result persists until the next submission, so keeping it shown
makes a fix look unfixed. **If resent after being cleared, it appears again.**

**Only when rejected because of a concurrent move, attach a link to reload.** Attaching it to permission or network failures as well
would read as if retrying fixes them.

## A way to not send

**Next to the submit button, place a link back to the list.** There is a path where someone opens the screen and then decides "I
won't touch it after all", and they should not have to look for the breadcrumbs.

## Differences by Band

**It stays a single vertical column.** There are only three inputs, and no reason to lay them out horizontally on wide bands. The
direction options wrap on narrow bands.

## Breadcrumbs

**商品一覧管理 > 商品名 > 在庫補充** (Product list management > product name > Restock).

## Checking in the Catalog

Storybook's `Page/Admin/Products/Stock` holds: just opened, with a quantity entered, with subtract selected, a negative projection,
a product out of stock, rejected input, rejected by a concurrent update, temporarily not accepted, a product name of the contract's
maximum length, tablet and smartphone.

## Related

- [`../../page.screen.md`](../../page.screen.md) — the list from which pressing the stock number leads to this screen
- [`../edit/page.screen.md`](../edit/page.screen.md) — the screen that fixes everything other than stock
