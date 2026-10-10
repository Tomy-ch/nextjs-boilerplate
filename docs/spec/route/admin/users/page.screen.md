# `/admin/users` User List (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen for surveying who is there.

## Only one filter

**A field for choosing the status (all / active / closed) is always present above the table.** It applies on selection — there are
only three exclusive options and the result appears on the same screen, so there is no reason to make the user wait to confirm.

**No separate marker for the condition in effect.** The field is always visible regardless of width, so a marker would say the same
thing as the value shown in the field. That is where it differs from the product list, whose field collapses on narrow bands.

## Columns Shown in the Table

**Name, email, status, actions.** Phone number is added only on wide bands. It is a clue for comparing rows, not something needed to
identify one person.

**On the narrow band, what remains is "who", "where to contact", "what state", and "what can be done".** Keeping anything else means
the actions cannot be reached without scrolling horizontally.

**At widths where the table does not fit, only the table scrolls horizontally, within its own area.** The page itself never overflows
horizontally.

## Status is shown in text

**「有効」 (active) and 「退会済み」 (closed) are shown as text badges.** Distinction by color alone, such as fading the whole row, is not used.

## Row Actions

**「退会させる」 (close account) is placed inside the row-end action menu.** An irreversible action is not laid out bare on the list.

**Rows of closed accounts do not show even the action trigger.** No surface where something clickable is shown but opens empty.

## Confirming Account Closure

**Show a confirmation that blocks the background.** Put the target's name in the heading, and **write in the body that it cannot be
undone and that the cleanup does not finish at the same time**.

**When the result comes back, close it regardless of success or failure.** The confirmation is a surface that asks "really press?",
not one that reports results. Keeping it open only on rejection would separate the reason shown above the list behind the background,
and the user would have to close it once to read it.

## Results stay above the list

**Both success and failure appear above the table.** The confirmation closes, so they cannot stay inside it, and a row whose closure
succeeded also disappears from the list if filtering by 「有効」.

**The failure message includes the target's name.** Which row the result is for remains clear even after the row disappears.

## Pagination

**Below the table, place pagination that can jump to any page.** Show the first, the last, and the neighbors of the current page, and
collapse distant ranges with an ellipsis marker. Listing every page makes the row grow as the count grows.

**At the ends, previous and next are not removed but left disabled.** Removing them moves the remaining side left or right, so the
same spot cannot be aimed at.

**At widths where it does not fit, it wraps.**

## When there are no matches

**Keep the table's shape, and convey only that there are none.**

## Breadcrumbs

**None.** The sidebar list points directly to this screen, with no level in between.

## Checking in the Catalog

Storybook's `Page/Admin/Users` holds: the first page, active only, closed only, a middle page, the last page, a single page only, no
matches, the row actions opened, the closure confirmation, success, the rejected state, a full name of the contract's maximum length,
tablet and smartphone.

## Related

- [`../layout.screen.md`](../layout.screen.md) — the layout shell holding the sidebar list that points to this screen
