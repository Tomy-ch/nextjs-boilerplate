# `/admin/campaigns` Campaign List (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).
>
> The layout shell's promises are held by [`../layout.screen.md`](../layout.screen.md).

A screen for seeing how each campaign's distribution stands, and stopping one.

## What It Shows

From the top, in this order:

| Region | Content |
| --- | --- |
| Heading | The screen's name and what can be done from here |
| Note on the period | That distribution runs from the start up to just before the end, and that nothing can be claimed from the end time on |
| Result | The result of the last suspension. Only after one was sent |
| List | The campaign table, and the pagination below it |

**The end of the period is explained once, above the table.** Writing it in every row lines up the same caveat; not writing it
lets the end time read as the last moment a code can be claimed.

## Columns Shown in the Table

| Column | Content | Shown from |
| --- | --- | --- |
| Code | The campaign code, wrapping rather than widening the table | Every band |
| Status | A badge with the status name | Every band |
| Distribution period | Start 〜 end, both with the time of day | `md` |
| Remaining | Remaining / total limit | Every band |
| Discount | The face value, with the cap of a rate discount beneath it | `md` |
| Scope | Which products the coupon applies to | `md` |
| Coupon expiry | When the coupons handed out expire | `xl` |
| Suspended at | When it was suspended; a dash when it is not | `xl` |
| Actions | The row-end action menu | Every band |

**On the narrow band, what remains is "which", "what state", "how many are left", and "what can be done".** Keeping anything else
means the actions cannot be reached without scrolling horizontally.

**The coupon expiry and the suspension time appear only on the widest band.** They are values for reading one campaign in detail,
not clues for comparing rows, and on the band where the sidebar list is always shown the table is too narrow for them — the dates
wrap and the rows lose a common height.

**The period is shown down to the time of day.** Its ends are instants, so they are not rounded to dates.

**Not shown: the per-user limit, the minimum purchase amount, when the coupons become usable, the raw number issued, and the
specific target of the scope.**

**At widths where the table does not fit, only the table scrolls horizontally, within its own area.** The page itself never
overflows horizontally.

## Status is shown in text

**Each status is a badge carrying its name** — 「配布前」, 「配布中」, 「期間外」, 「停止」. Color is only layered on the name;
color alone is never the distinction ([0100](../../../../adr/0100-accessibility-target.md)). The categories and their colors are
held by [`page.function.md`](page.function.md).

**Only suspended campaigns are shown with inverted lightness**, differentiated on an axis separate from the period's statuses.

## The Remaining Count

**A fully distributed campaign adds the words 「上限到達」 (limit reached) under its count, in the failure color.** Color is only
layered on the words, never the only signal.

## Row Actions

**「停止する」 (suspend) is placed inside the row-end action menu, with the destructive appearance.** An irreversible action is not
laid out bare on the list.

**Rows of suspended campaigns do not show even the action trigger.** No surface where something clickable is shown but opens empty.

## Confirming Suspension

**Show a confirmation that blocks the background.** The title names the code — 「{code} の配布を停止しますか？」 — and the code
wraps rather than stretching the dialog.

**The body states that it cannot be undone, that the code no longer accepts claims from then on, and that coupons already
distributed are not invalidated and can still be used.**

**The choices are 「やめる」 (stop) and 「停止する」 (suspend), the latter with the destructive appearance.** Pressing the background
does not close it. While sending, the button says so and cannot be pressed again.

**When the result comes back, close it regardless of success or failure.** The confirmation is a surface that asks "really
press?", not one that reports results.

## Results stay above the list

**Both success and failure appear above the table, in one place for the whole list.** The confirmation closes, so they cannot stay
inside it; one per row would leave it unclear which result is the latest.

| Outcome | What is shown |
| --- | --- |
| Success | 「{code} の配布を停止しました」 (distribution of {code} stopped), and that coupons already distributed stay usable |
| Already suspended | That it could not be suspended, naming the code, saying it is already suspended and that the list has been updated |
| The target was not sent | That it could not be suspended, asking to open the screen again |
| Any other failure | That it could not be suspended, with the catalog's wording for that category |

**The success message repeats that coupons already distributed stay usable.** What was read in the confirmation stays, in the
same words, after it closes.

**The result stays while the list is refetched beneath it.** The suspended row turns to 「停止」 in place.

## Pagination

**Below the table, place pagination that can jump to any page.** Show the first, the last, and the neighbors of the current page,
and collapse distant ranges with an ellipsis marker.

**At the ends, previous and next are not removed but left disabled.** Removing them moves the remaining side left or right, so the
same spot cannot be aimed at.

**At widths where it does not fit, it wraps.**

## Loading

**The heading stays, and the table is replaced by frames shaped like its rows.** Substituting a single spinner changes the height
the moment content renders and moves the pagination placed below.

**When the page changes, the note on the period stays too; only the list waits.**

## Empty State

**Keep the table's shape, and convey only that there are no campaigns yet.**

## How Failure Looks

**When the list cannot be fetched, the main content, heading included, is replaced.** The layout shell stays, as
[`../layout.screen.md`](../layout.screen.md) promises.

## Breadcrumbs

**None.** The sidebar list points directly to this screen, with no level in between.

## Checking in the Catalog

Storybook's `Page/Admin/Campaigns/List` holds: every status mixed with a fully distributed row (with tablet and smartphone), no
campaigns, loading, a fetch failure, a middle page, the last page, a single page only, the row actions opened, the suspension
confirmation, success, already suspended, another failure, and a long code. Sending is held by
`Features/Admin/Campaigns/List/SuspendDialog/Submitting`.

## Related

- [`../layout.screen.md`](../layout.screen.md) — the layout shell holding the sidebar list that points to this screen
