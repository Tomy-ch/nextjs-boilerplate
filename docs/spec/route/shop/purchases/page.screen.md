# `/purchases` Purchase History (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

A screen for reading past purchases newest first, filtering them by period, and choosing one to go to its detail.

## What It Shows

| Region | Contents |
| --- | --- |
| Filtering | The period type, the input fields that type uses, and the action that applies the filter |
| List | The number loaded so far, the purchase rows, and the progress of loading more |

Each row shows the order date and time, the purchase code, the status, the total, and an indicator that the row leads to the detail.

**Put the order date and time first.** The first clue users have for telling their purchases apart is "when did I buy it"; the purchase
code is used only when matching against a receipt.

**Make the row itself the link.** If only the date or the amount is the link, the target shrinks to the width of the text, and it is
easy to miss when tapping with a finger.

**Keep the purchase code on one line instead of wrapping it.** Wrapping doubles the height of a row and lowers the density of reading.
The full code is in the receipt on the detail.

**Do not show a total count.** The contract returns only one page and the next cursor, and how many results the filter yields in total is not
known until everything has been read. Showing the number loaded as "N of a total" reads as if the screen knew a number it does
not actually know.

**A total count is shown only on a list where the contract has an endpoint that counts, and the total is decision material on that screen.**
Both are required — even with such an endpoint, a list whose next action does not change with the total does not show it. This screen has no such endpoint,
and when users look for their own purchases, what they are looking for is in their own memory, so it meets neither condition. The total is never assembled
from cursor responses. The side that shows a total under the same judgment is
[the product list](../products/page.function.md).

## How Status Looks

Statuses are grouped into three — **in progress / successful end / cancelled** — and colored accordingly. On a list with dozens of rows,
being able to home in on the purchase you want without reading each row's text is what helps.

| Group | Color |
| --- | --- |
| Desirable end (completed, delivered) | The success color scheme |
| Cancelled (cancellation) | The cancellation color scheme |
| In progress (a known status that is neither an end nor a cancellation) | A muted color scheme |
| None of these (an unknown status) | No decoration |

The basis for the grouping is held by the backend's state transitions (whether a status is an end, whether it is a cancellation). The reason not to give
the nine names nine colors is that what users want to know is three things: "has it arrived / has it stopped / is it still
moving".

**Color only reinforces the text.** Some color vision characteristics cannot distinguish green from red, so a status always carries its name
as text. An unknown status is not pushed into any group and is shown without decoration.

## Filtering

**Show only the input fields the period type uses.** Listing unused fields as disabled only takes up space with fields that cannot be pressed,
and makes it harder to read what needs to be specified now.

| Period type | What is specified |
| --- | --- |
| All time | Nothing |
| Recent | Choose how many days back |
| By month | The target month |
| By date range | A start date and an end date |

**Do not apply on selection; provide a confirm action.** A date range becomes a condition only once both the start date and the end date
are present, so applying midway produces a request the contract cannot accept.

**While something is missing, make confirm unpressable and say what is missing.** If it can be pressed, the result is a screen whose
list has disappeared, and the cause is invisible to the user. In the bar, show the reason next to confirm. Appending it below confirm
would move the top of the list up and down every time the text appears or disappears. In the overlay, show the reason below the input fields. Confirm is fixed
to the bottom edge of the overlay, so its position does not move as the reason appears and disappears.

**Switching the period type does not move confirm.** Confirm sits in the row below the input fields, aligned to the left edge, and the
input row has the same height for every period type. The height is aligned through the same structure, "label + control", without reserving dimensions
(so it follows when the size of an input field changes). Not missing the target between choosing a period type and pressing confirm
takes priority.

The end date cannot be set before the start date. A combination the contract would reject is blocked before selection, not after pressing.

**Do not list the active conditions separately.** There is only one condition, the period, so the input fields themselves are the display of the active
condition. Listing a copy only says the same thing twice, and clearing it is just a matter of setting the period type back to all time.

## Responsive Layout

| Width | Filtering | Display of the active period |
| --- | --- | --- |
| `lg` and up | Always present as a bar | The input fields show it as is |
| Below `lg` | An overlay opened from a control fixed to the bottom edge of the screen | **Shown in the label of the open control** |

Only one of the two appears, and the period being composed is kept as one per screen. Confirming from either sends the same condition,
and a change of width does not lose input in progress. **The switch is done in CSS** (waiting for hydration makes the layout move).

**Fix the control that opens the overlay to the bottom edge of the screen.** This keeps filtering reachable even after reading far down the list;
placed at the top edge, the means to change the condition moves further away the further you read to find an old purchase.

**While closed, the label of the open control is the only display of the active period.** A count marker alone conveys only that "something
is filtering", and finding out what it is filtering by requires opening it.

Inside the overlay, confirm and the action that returns to all time sit at the bottom edge. While the period is being composed, the list is hidden behind
the overlay, and the result of a selection is not visible. Opening does not discard a half-composed period.

**The overlay does not close on confirm; it closes when the confirmed period reaches the list.** Firing the close and the navigation together
means the overlay's step back through the history entry it pushed for the back action cancels the navigation that has not arrived yet. When the period does not
change, nothing arrives, so it closes on the spot. **Both confirm and the return to all time replace without pushing history**
— the overlay has already pushed one, and pushing another on top would make the back action miss once.

Leave a margin at the bottom of the list for the fixed control. Without it, the last row is hidden behind the control.

## Loading More

When the user nears the end, more is appended. No pagination control is provided.

**Show the load-more action only after a failure.** While reading on, simply nearing the end starts the next load,
so placing another entry point that does the same only adds a choice. After a failure things are different: detection of reaching the end
never fires again as long as the user stays there, so the action is the only way to recover. Even in this form, keyboard
scrolling and assistive technology's reading move the visible position, so means other than scrolling are not lost.

Once everything has been read, leave nothing at the end. An empty frame left there reads as if there were more.

Announce the count to screen readers. Added purchases only grow at the end of the list, so without an announcement, users who are not looking at
the screen cannot tell it apart from nothing happening. Do not combine the loading report into the same sentence
(the count would be read again on every load).

## Loading

Show only frames with the same height and the same dividers as the rows that will actually appear. Substituting a single spinner makes positions move
the moment it is rendered, and the user loses the place where they started reading.

**Only the list falls into loading; the filter controls stay.** Even when the period changes, the foothold for
continuing to filter does not disappear.

## Empty State

**Separate "has not bought anything yet" from "the filter has no results".**

| State | What is shown |
| --- | --- |
| No purchases at all | A note that there are no purchases yet, and a path back to browsing products |
| Zero results for the filter | A note that there are no purchases in this period, and a path to review all time |

Showing the latter with the same text as the former leaves the screen unable to say that removing the condition would bring results back. To a user who
remembers buying something, it can even look as if the history has disappeared.

## Breadcrumbs

None. The global nav points directly at this screen, and the hierarchy is one level deep
([0026](../../../../adr/0026-layout-shell-mount.md)).

## Related

- Implementation `src/features/purchases/` — [README](../../../../../src/features/purchases/README.md)
- Goes to [`/purchases/[code]`](<[code]/page.screen.md>) (purchase detail)
- Entry routes: global nav / the purchase summary on My Page / purchase completion
