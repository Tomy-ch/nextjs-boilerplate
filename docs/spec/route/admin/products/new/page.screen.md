# `/admin/products/new` Creating a Product (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen that takes first-time input forward in stages.

## Splitting into stages

**Split into five steps, taken in order.**

| Step | What is entered |
| --- | --- |
| Basic information | Product name, price, stock quantity, low-stock warning threshold, category |
| Description | Product description |
| Images | Product images |
| Publication | Status, publication date and time |
| Confirmation | The content to send |

**It is split into stages because first-time input is a task where people want to know "how much more until I can send".** The
progress indicator answers that. It uses a different container from the task of coming to fix one thing (editing).

**The progress indicator is laid out horizontally.** Stacking it vertically lengthens the area above the input fields by the number
of steps, and the user has to scroll before starting to type.

## Where the user can go

**Until the required fields are filled, the user cannot go past that step.** Both the forward control and jumping from the progress
indicator stop under the same condition. Stopping only one is pointless if the other still allows a jump.

**Going back is not stopped.** Going back does not claim the step is done.

**Any step reached at least once can be reached directly from the progress indicator.** Going from confirmation to fix one thing
takes the shortest path. Steps not yet reached cannot be entered; allowing a jump would bypass the check on whether moving forward
is allowed.

**The done marker stays even when the user goes back there.** Having finished a step and where one is now are separate facts; if the
marker disappeared, even the finished input would look as if it never happened.

## How Errors Are Shown

**An error message appears only after the field is touched.** Turning every empty field red right after opening tells someone who
has done nothing yet that they are at fault.

**Messages next to fields come from the check the screen runs on the spot.** The screen runs the same rules as the submission, so
errors that check can catch appear next to the field before sending.

**When the submission is rejected, show the rejected fields as a list.** The list carries the overall picture and the links to go
fix them. Errors only the submission side can detect do not appear next to fields; they appear only in this list.

**Once the input is corrected, the previous result is cleared.** Keeping it shown makes a fix look unfixed.

## Confirmation Step

**No input fields.** If the same value could be edited in two places, the reader would have to guess which one is sent. To fix
something, go back to the earlier step.

**Unfilled fields are shown as unfilled, not as blank.** A blank cannot distinguish "forgot to fill it" from "decided not to".

**The product description is shown in the same form buyers will see.** What is not visible here will not be displayed even if saved.

**For publication date and time and for images, state in words what happens when they are empty.** Wording like
「未公開のまま登録します」 (registered as unpublished) or 「登録しません」 (none will be registered) lets emptiness read as the result of
a choice.

## How Images Are Shown

**Separate the picker that receives files from the list of what was chosen.** The picker returns to empty once it has handed the
files over, and the list becomes the only owner of what was chosen. If both kept a copy, removing one would leave only the picker's
display stale.

**Chosen images wrap horizontally.** Stacking them vertically pushes the other fields down as the number grows.

**Reordering is done by moving one item forward or back at a time.** An item at the end cannot press the control that moves it
further.

## Loading

**Until the category and status options are in, show only frames in the shape of the step.** The options are fetched, and the step
cannot render until they are all in. Substituting a single spinner changes the height the moment content renders and moves the
progress indicator and the controls.

**The number of frames is not matched to the fields of the first step.** The loading side does not know how many options there are,
so it cannot carry more meaning than conveying the form's shape.

## When Leaving

**Confirm when the user tries to leave the screen with input half-written.** Nothing is saved until submission, and the input is
lost the moment the user leaves.

**What is confirmed is in-app navigation, and reloading or closing the tab.** The browser's back and forward are not blocked
([`navigation-guard`](../../../../../../src/components/app-starter/navigation-guard/README.md)).

## Breadcrumbs

**商品一覧管理 > 新規作成** (Product list management > New). The layout shell holds the position of the path to the current location,
and this screen passes its content.

## Checking in the Catalog

Storybook's `Page/Admin/Products/Create` holds each step, the rejected state, the confirmation step, tablet and smartphone. Neither
submission nor saving happens in the canvas. The loading appearance is held by `Features/Admin/Products/New/Skeleton`.

## Related

- [`../page.screen.md`](../page.screen.md) — the list that leads to this screen
- [`../[id]/edit/page.screen.md`](<../[id]/edit/page.screen.md>) — the edit screen that shares the steps' contents
