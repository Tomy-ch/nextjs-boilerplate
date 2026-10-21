# `/products` Product List (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen for finding products, filtering them, and either proceeding to a detail or adding to the cart on the spot.

## What It Shows

| Area | Content |
| --- | --- |
| Search and sort | Keyword input, sort, the conditions currently in effect, and an operation that clears all conditions |
| Filters | Inputs for price, category and stock availability. Inside the overlay, an operation to apply them and the pre-confirmation matching count are added |
| List | The number loaded and the total count, product cards, and the loading status of the rest |

## Filtering

### Order of the Filters

Placed in the order price → category → stock availability. A budget is often decided before looking for products and applies across categories,
so it comes first; stock availability is less a narrowing condition than one that removes unbuyable items from the results that came up, so it comes last.

| Condition | How it is chosen |
| --- | --- |
| Price | A `［下限］〜［上限］` (min–max) selection, and a range slider pointing at the same range |
| Category | **Multiple selectable**. No "all" option |
| Stock availability | One of All / In stock / Out of stock |

**Category has no "all."** The state with nothing selected is itself "all," and listing it as an option
would make it unreadable whether selecting it or deselecting the others is what takes effect.

**Stock availability is mutually exclusive, so it is single-select.** It is not something that stacks like categories.

### The Two Price Controls

**The minimum and maximum can be chosen only on the scale's ticks.** The selection and the slider point at the same range, so allowing continuous values
would make the two controls express the same condition at different granularities. The two ends of the scale represent "unspecified" rather than a value, and
including the ends in the scale keeps the left-right orientation intact even with minimum and maximum on one control.

**The slider confirms nothing while sliding.** Only the moment the finger is lifted counts as confirmation. Confirming every tick
passed over would run a matching-count fetch on every confirmation. From the selection side it confirms immediately, and
the slider's position follows it.

**When a value not on the scale arrives via the URL, the control shows it at the "unspecified" end.** The condition itself stays in
effect, and the condition display conveys that it is in effect. The control is placed where it can show which value it will take the next time it is
moved.

### How Many Can Be Selected

**Categories have a limit on how many can be selected at once, and the contract decides it.** The display side does not copy the number; it receives it from the contract.

**Nothing is shown until the limit is reached.** It is a constraint reached only by operations with more categories than the limit, and always showing the remaining
count would occupy everyone's view for a constraint they never reach.

**Once the limit is reached, unselected categories become unselectable, and how many can be selected is shown at the end of the group.** A form that is pressable but
does nothing is read as "broken." **Making them unselectable is not `disabled`** — if focus could no longer
land on them, keyboard and assistive-technology users could not reach the reason. Deselecting always goes through.

### Applying the Conditions

**Whether a confirm step is interposed depends on whether the result of a selection is visible.**

**At widths where the list is visible alongside, a selection is reflected the moment it is made.** The result appears right there, so a confirm step would
make the user press once more just to see the result. The value range counts only the moment the finger is lifted as confirmation, so
even a sliding operation reflects only once.

**The inputs stay pressable while waiting for reflection.** Blocking them would halt each successive selection.
That it is waiting is conveyed with `aria-busy`.

**At widths where the list is hidden behind the overlay, conditions are assembled and then confirmed together.** The result of a selection cannot be checked,
so reflecting on every selection would only add steps.

**The side that confirms together shows the pre-confirmation matching count.** The size of the result is known without waiting for reflection, so
making confirmation explicit adds no steps for reselecting.

**While recounting, the previous count stays.** Clearing it would make the number appear and vanish with every selection, swapping
before it can be read.

**When it cannot be counted, it is cleared.** Leaving it would be read as the count for the current conditions. Not knowing the count does not
prevent confirmation, so the pressable state does not change.

**When the conditions in effect on the list change from outside, the conditions being assembled are discarded and aligned to those.** Operations that remove a condition
from the condition display, and the back operation, do not go through the inputs, so without aligning the screen's list and the inputs would point at different things.

**There are several triggers for reflection, but what is sent is one.** Submitting a search term, selecting a filter and confirming the overlay
all send the whole set of conditions being assembled. Holding them separately would discard the other's in-progress input the moment one is
pressed — selecting a filter and then typing and submitting a keyword would erase the selected filter.

**The overlay does not discard the conditions being assembled when it opens.** There is one draft per screen, and even while closed the keyword
input shows part of it. Discarding here would also erase the typed search term.

**The overlay does not close on confirmation; it closes when the confirmed conditions reach the list.** Firing the close operation and the navigation at the same
time would let the move that rewinds the history the overlay stacked for the back operation cancel the navigation that has not yet arrived. When the conditions
do not change, nothing is going to arrive, so it closes on the spot. **Confirmation replaces without stacking history** — the overlay
has already stacked one, and stacking another on top would make the back operation miss once.

## Where Things Stay While Reading On

While reading on through the list, three things compete for the top edge of the screen — the site header, the search bar and the side filters.

| Scroll direction | Search bar | Side filters |
| --- | --- | --- |
| Down (reading products) | Recedes | Stops right below the header |
| Up (trying to go back) | Stops right below the header | Stops below the bar |

**The search bar recedes while reading downward.** What the user wants to see then is products, not to get ready to search again.
It appears the moment the user tries to go back up, so it is within reach as soon as they want to change conditions.

**The bar's receding is expressed by "it stops sticking."** Hiding it by shifting its position would make it overlap the heading as it rises even when it is
still at its natural position (near the top of the screen). If it only stops sticking, **it never goes above its natural
position**.

**The filters stay at hand regardless of direction.** Changing conditions while looking at products is this screen's main flow, and
if the filters left the screen, every change would mean going back to the top. They stop below the bar, and while the bar has receded
they rise to right below the header. **The bar's height changes with the number of conditions in effect** (it grows when conditions wrap),
so the position is decided from a measured value.

**When the filters become too tall for the screen, they scroll within themselves.** The outer scroll is for the products, and
leaving it to that would make the bottom of the filters unreachable.

While sticking, products pass underneath, so both the bar and the filters get a background.

## Responsive Layout

| Width | Where the filters live | Confirm |
| --- | --- | --- |
| `lg` and up | Permanently beside the body (remains while reading on) | None. Reflected the moment selected |
| Below `lg` | An overlay that opens from the bottom edge of the screen | At the bottom edge of the overlay |

The switch is done with CSS. Switching something whose position moves by a width check would, since the server cannot make that check,
move the layout before and after hydration ([0051](../../../../adr/0051-styling-system.md)).

**How confirmation works changes with width because whether the result of a selection is visible changes.** The inputs themselves are
the same; only the trigger for reflection changes.

**Sort is reflected the moment selected, regardless of width.** It is single-select, so selecting is the same as confirming, and putting it on the overlay's
confirm-together side would make confirmation two steps. For the same reason it is not put on the filter side.

**The operation that opens the overlay shows the number of conditions in effect.** While it is closed the inputs are not visible, so
that anything is filtering at all cannot be read from the screen. Each input counts as one.

## Showing the Active Conditions

Conditions are listed in a form where each can be removed individually. At widths that cannot hold a side region, the inputs are inside the overlay, and while it is closed
what is filtering cannot be read from the screen. The more conditions, the wider this gap grows.

- **Categories are listed one per selection.** Combining them into one would allow only a "remove all" operation, so one of three
  selected could not be withdrawn
- **Price is combined into one with its minimum and maximum.** Removing just one side would not be a meaningful operation, and a range becomes one condition only
  when both are present
- **Sort is not listed.** It always has a value, so an unremovable display would sit there mixed in with removable ones
- **Categories are shown by their selected display names.** What is in the URL is the value itself, and showing it would not say what was selected.
  Values not among the options are skipped (they are values outside the contract or vanished categories, and showing them would read as if nonexistent conditions were
  in effect)
- **The clear-all operation is kept at the right end.** Flowing it after the conditions would move its position every time conditions increase and wrap,
  so it could not be pressed by aiming at the same place. It is not shown when only one condition is in effect (it would lead to the same place as
  the operation removing that condition)

## Search Field

**Keystrokes do not search.** If the search term took effect first, the list would swap while the user is assembling filters,
and they would see results for half-finished conditions.

**It can be submitted empty only when a search term is currently in effect.** Clearing an active search term requires an empty submission,
while submitting when nothing is in effect does not change the result. Leaving an operation that does nothing when pressed means the user cannot tell
whether it failed to respond or the result is the same.

**The reading position is not carried over.** "The rest" after searching again would point to the rest of the previous conditions.

## List

**Hovering over a card is answered on its surface.** The whole card is a link to the detail, but it is not wrapped, to avoid nesting
operations, so without that feedback the pressable area would look like only the product name's text. This is needed separately from the link's own
focus indicator.

**Out-of-stock products get an inquiry entry point alongside.** The add-to-cart operation is left unpressable,
and that alone conveys only "cannot buy." Pressing it moves to the inquiry screen. **Which product it was is not
carried over** — there is one inquiry per user, and it has no per-product thread.

**The add-to-cart operation keeps its visible text unchanged while sending.** Lengthening the text would change its width, and in the list
the neighboring values would all move with it. That it is sending is shown by swapping the glyph, and conveyed to assistive technology by the operation's own
name.

**The number loaded and the total count are shown.** Showing only the number loaded in the form "N of the whole" would read as knowing a number
that is actually unknown. The count and the loading status are announced separately (combining them into one
sentence would re-read the count on every load).

**The load-more operation appears only on failure.** While reading on, the next load starts merely by nearing the end,
so lining up an entry point that does the same thing would only add steps. Only after a failure is it different: detection of reaching the end never fires again
as long as the user stays there, so the operation becomes the only way to recover. Keyboard scrolling and assistive technology's reading-on both
move the display position, so even in this form no means other than scrolling is lost.

## Loading

**When conditions change, only the list and the count fall back to the loading UI.** The search field, the active-conditions display and the filter
inputs are outside it, so the controls the user stands on do not vanish while filtering.

The loading UI shows only frames, in the same shape and the same column layout as the finished screen. Substituting a single spinning marker would shift positions the moment
it is rendered and lose where the user started reading. The number of columns is decided by the container's width (deciding by the screen's width would make only the loading UI
overflow the body at widths where the filters sit permanently beside it).

## Empty State

「条件に合う商品がありません」 ("No products match the conditions") is shown, together with what to do next (shorten the keyword, remove filters).
It never says only "0 results."

## How Failure Looks

| Failure | What is shown |
| --- | --- |
| Fetching | A generic message regardless of classification, an inquiry number and a retry link. The raw error body is not shown |
| Conditions fall outside the contract | In place of the list, the names of the conditions to check, and **a link to view the list with the conditions removed** |

**When conditions fall outside, a link that fixes it is always added.** The conditions are in the URL, and the state may not be recoverable through
the screen's operations alone. Condition names are shown in the screen's own words (not assuming the user knows the URL's
spelling).

## Breadcrumbs

None. The global nav points directly at this screen, and the hierarchy is one level deep
([0026](../../../../adr/0026-layout-shell-mount.md)).

## Related

- Implementation `src/features/products/` — [README](../../../../../src/features/products/README.md)
- Next: [`/products/[id]`](./[id]/page.screen.md) (product detail) / `/cart` (cart)
- The cart in the outer frame [`../layout.screen.md`](../layout.screen.md)
