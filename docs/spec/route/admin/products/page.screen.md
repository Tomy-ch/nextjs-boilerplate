# `/admin/products` Product List Management (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).
>
> The layout shell's promises are held by [`../layout.screen.md`](../layout.screen.md).

A screen for listing and comparing products, and moving from there to creation, editing, or restocking.

## What It Shows

| Region | Content |
| --- | --- |
| Heading | The screen's name and what can be done from here |
| Search and filtering | Keyword input, category, status, the conditions currently in effect, and an action that clears all conditions |
| Link to creation | At the right end, outside the filters |
| List | The product table, and the pagination below it |

## Why a table rather than cards

**Buyers browse and choose one item at a time; the admin side compares the same attributes across items.** It handles the same
products as the customer-facing list but shares no components. Sharing would leak one side's concerns into the other.

## Columns

| Column | Content | Narrow band |
| --- | --- | --- |
| Product name | Pressing it goes to editing | Kept |
| Category | Display only | Hidden |
| Price | The decimal string the contract returns, as is | Kept |
| Stock | Pressing it goes to restocking | Kept |
| Status | A badge colored by category | Hidden |
| Actions | A menu to choose by name | Kept |

**On the narrow band, only what is needed to identify one item and act on it is kept.** Four things: which, how much, how many, and
what can be done. Category and status are clues for comparing rows and are not needed to identify one item. The table can scroll
horizontally, but a shape where the actions cannot be reached without scrolling does not fulfill the table's role of "lining up and
comparing".

**Column widths are held by cells, not by the columns themselves.** The `colgroup` sequence corresponds by position to the rendered
columns, so giving width to a column hidden on the narrow band shifts the widths of the columns after it by the hidden amount.

## Making rows clickable

**The whole row is the link to editing, but the row is not wrapped in a link.** A `tr` cannot be wrapped in a link, and even if it
could, the stock and row actions would sit inside the link, putting an action inside an action. The product name's link is stretched
across the whole row, so assistive technology sees only the product name as the destination.

**The stock number and row actions are layered above the row's link.** This keeps two links from competing for the same spot.

## Status Colors

**Color is only layered on the status name; color alone is never the distinction.** The badge shows the status name as is
([0100](../../../../adr/0100-accessibility-target.md)). The categories and their assignment are held by
[`page.function.md`](page.function.md).

**Only discontinued products are shown with inverted lightness, differentiated on an axis separate from the category colors.** Placed
in the same row of colors as the categories, it would look as weighty as a label an admin can reassign by hand. The handling decision
is held by [`page.function.md`](page.function.md).

**The customer-facing list and detail do not color statuses.** Those are places for viewing one item, with nothing to compare against.

## Filtering

### When a Condition Takes Effect

| Condition | When it takes effect | Reason |
| --- | --- | --- |
| Keyword | On the submit action | Refetching on every keystroke swaps rows in the middle of reading |
| Category / status | Each time one is toggled | The result of the choice appears on the same screen, so there is no reason to make the user wait to confirm. Seeing the count change with each choice reaches the goal faster than not knowing the result until the combination is complete |

**Submitting while empty is possible only when a search term is currently in effect.** Clearing a search term in effect requires an
empty submission, while submitting with nothing in effect does not change the result. Leaving an action that does nothing when
pressed makes it impossible to tell whether there was no response or the result was the same.

### What Changes with Width

**There are two sets of category and status inputs, switched by CSS bands.** On wide bands they are always shown above the table;
on narrow bands they open in an overlay from a control at the bottom of the screen. Doing a position-changing switch with a
JavaScript width check cannot be decided on the server, so the layout shifts before and after hydration
([0051](../../../../adr/0051-styling-system.md)).

**The search field stays in the same place at every width.** Its trigger is the same on either band, and putting it inside the
overlay would create a shape where the same condition can be confirmed from two places.

**Inside the overlay, everything is confirmed at once.** The table is hidden behind it and the result of a choice is not visible, so
applying on each choice would only add steps. The confirm action sits at the bottom of the overlay.

**Each time the overlay opens, it is rebuilt from the conditions currently in effect.** While closed, the conditions are not visible
anywhere on screen, so if it remembered a half-made selection from the last opening, the next person to open it would see that as
the conditions in effect.

**The open control is fixed to the bottom of the screen.** This keeps filtering reachable even after reading far down the table. The
number of conditions in effect is attached to the control because the contents of the closed inputs cannot be seen.

### Conditions in Effect

**The conditions in effect are listed as chips, separately from the inputs.** On narrow bands the inputs are inside the overlay, and
while it is closed the screen does not show what is filtering. A search term, too, cannot be told apart from half-typed text just
because characters remain in the input.

**Chips can be removed one at a time.** Refiltering no longer requires reopening the overlay.

**A chip shows the display name, not the number in the URL.** A number not among the options is not shown as a condition — it would
read as if a nonexistent condition were in effect.

**The clear-all action stays at the right end.** Letting it flow after the chips moves its position every time more conditions wrap,
so the same spot cannot be aimed at. **It is not shown when only one condition is in effect** — its destination would be the same as
removing that chip.

**Removing the search term's chip also clears the text in the input.** If only the URL changed and the input kept its text, the
removed term would look as if it were still in effect.

## Loading, Empty and Failure

**The loading UI shows only frames with the same row height as the table.** Substituting a single spinner changes the table's height
the moment content renders and moves the pagination placed below.

**The table keeps its shape even with no matches.** The column headings stay, and only the absence is shown in the body.

**When the conditions fall outside the contract, say so instead of showing the list.** If it looked the same as the table's empty
state, users could not tell "no matches" from "the conditions are not valid". Name the conditions that fell out and add a link that
removes them and goes back.

**When fetching fails, only the main content is replaced, with the layout shell kept.** The side navigation and the header remain, so
the way to other screens is not blocked.

## Pagination

**Placed below the table, pointing one page back and one forward.** A direction with no destination is rendered not as a link but as
a control that cannot be operated, keeping its position.
