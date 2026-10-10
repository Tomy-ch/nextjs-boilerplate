# `/admin/products` Product List Management (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../layout.function.md`](../layout.function.md).

A list for finding and checking products, and moving on to creation, editing, or restocking.

## Actor and Ownership

**Requires the admin role.** The outer frame decides whether the screen can be reached.

**The backend owns matching.** This screen only builds conditions, passes them, and lists what comes back; it owns neither search
matching nor category judgment ([0070](../../../../adr/0070-backend-role-separation.md)).

## What is listed

**Every product, including unpublished ones, is listed.** This is an admin screen, and if products not yet published did not
appear, editing them would be unreachable. The contract's default returns only published products, so the fetch explicitly asks to
include unpublished ones. That request goes through only for actors with the admin role.

**The population is not switched within this screen.** Whether unpublished products are included changes the sort axis, so a
pagination key is meaningful only within the same request.

**A product's "status" is its stock and sales status, a separate axis from whether it is published.** It includes in stock, out of
stock, discontinued, under consideration and so on, and filtering by it works as is under the current contract.

**No total count is shown.** A cursor-based list has no total, and getting one needs a separate fetch endpoint
([0073](../../../../adr/0073-pagination-fetch-boundary.md)). Since page numbers cannot be shown, adding only the total still cannot
show "which page this is".

## The URL holds the search conditions

**The conditions in effect and the page being viewed are all in the URL.** A shared link, the back action and a reload must all
give the same result, and holding them in client state makes none of them work.

| Condition | Value | Multiple |
| --- | --- | --- |
| Keyword | Partial match on product name and product description | — |
| Category | A code held by the category master | ○ |
| Status | A code held by the status master | ○ |

**Category and status allow multiple selections.** They are put in as the contract accepts them, as a sequence. The admin list is
where people narrow down "which to fix", and uses such as viewing statuses with no settled handling together (out of stock alongside
awaiting arrival, for example) cannot be built with single selection. The table's columns and the chips show which conditions are
filtering, so mixing them does not break reading the rows.

**Multiple values are put in by repeating the same key.** Joining them with a delimiter makes different conditions produce the same
URL as soon as a value contains the delimiter.

**"Unspecified" is not an option but the state of nothing being selected.** Making it an option creates a shape where unspecified
and a concrete value can be selected at the same time.

**A master row is pointed to by its code, not its UUID.** What the contract accepts for filtering is the code; the endpoint that
takes the UUID remains only as deprecated. Sending both at once gives 400, so the endpoint this screen uses is kept to the code side only.

**When the same value arrives repeatedly, it is collapsed.** Users can edit the URL directly. The contract declares a sequence
without duplicates, and the same value arriving twice points to the same condition as arriving once. Without collapsing, a condition
with the same meaning reaches the backend as a request that breaks the contract.

**The action that removes a condition in effect removes only that one.** Since several of the same kind can be selected, if pressing
one removed all of that kind, even the person who pressed could not tell which was removed.

**When the conditions change, the position read so far is discarded.** A position partway through the previous conditions points
somewhere else under the new conditions.

## Validating Conditions

**A condition that could not be mapped against the contract is not discarded; the screen shows that it could not be mapped.** The
URL is input the user can edit directly; silently dropping out-of-range values and showing the default list makes a user who thinks
they filtered see unfiltered results. A multi-select condition does not show on screen when one value falls out, so it is surfaced
rather than collapsed to a fallback.

Validation is done at the fetch boundary; the screen side only receives the keys that could not be mapped and decides the display.
If the screen mapped them on its own, only its mapping would stay at the old range after the contract is regenerated
([0029](../../../../adr/0029-type-design-discipline.md)).

**Name the condition that fell out, and add a link that removes it and goes back.** The condition is in the URL, and the state may
be one that screen operations alone cannot undo.

## Fetch Failures

**Even if fetching the main content fails, the layout shell (side navigation, header, the link back to the customer-facing screens)
stays.** The boundary sits directly beneath `/admin` ([0080](../../../../adr/0080-error-handling.md)).

**Neither raw errors nor stacks are shown.** In production the message body is hidden and only `digest` reaches the boundary, so the
text is generic regardless of classification. The cause is identified by matching `digest` against the server-side logs.

## Pagination

**Navigation is possible only one page back or forward.** A cursor is an opaque value pointing to "the next position" and offers no
means of jumping to an arbitrary position. Page numbers are not listed.

**The URL remembers where to go back to.** A cursor points only to the next position, so unless the screen side keeps the starting
points of the pages passed through, it cannot go back. The URL is where they are remembered so that a shared link and the browser
history point to the same page. Holding them in client state makes the same URL a different screen depending on "which page it was
reached from".

| Action | URL change |
| --- | --- |
| Next | Append the current starting point to the end of the trail passed through, and put the next starting point |
| Previous | Return the end of the trail to the starting point. If the trail is empty, drop the starting point itself |

**The first page has nowhere to go back to.** A URL without a starting point is the first page. A URL whose starting point is gone
but whose trail remains can also arrive, in which case the trail is discarded. Without discarding it, "previous" is clickable on the
first page.

## This screen assigns colors to statuses

**The contract does not return what a status means.** The master holds only codes and display names; it does not say which statuses
are sellable and which are finished. Assigning meaning is held as this screen's own concern, and the customer-facing list and detail
do not color statuses.

**Colors are attached to handling categories, not to individual statuses.**

| Category | Statuses | Appearance |
| --- | --- | --- |
| Can be delivered | In stock / Limited sale | Filled |
| Involves waiting | Accepting reservations / On order / Awaiting arrival / Restock planned | Caution color |
| Cannot be sold | Out of stock | Failure color |
| Done with, or not yet released | Sales ended / Discontinued / Under consideration | Outline only |

**A code not in the master is not folded into any category.** The master grows regardless of this side's concerns. Folding it into an
existing category gives it a color that misreads its meaning. It is shown in an **undecorated form**, indicating as is that no
category has been decided — every status with a decided category has a filled or outlined shape, so appearing as plain text with no
shape serves as the marker.

## Discontinued Products

**Discontinuation is a fact the product itself holds, not a master label.** The contract returns it as `discontinuedAt`, and the
action that discontinues a product does not rewrite the master status. Discontinued products therefore arrive still carrying a
label such as `在庫あり`.

**The status column shows 「廃番」 (discontinued), not the master label.** Showing the label as is lists unbuyable products as
「在庫あり」 (in stock). What this column answers is "how should this product be handled now", and discontinuation, as that answer,
takes precedence over every other label.

**Discontinuation is handled separately from all the categories.** Discontinuation is neither a failure nor a caution; it is a
settled, irreversible handling, and carries a different weight from labels an admin can reassign by hand.

**The check is whether `discontinuedAt` is null; it is not compared with the current time.** The discontinue action takes no date and
time and is settled with the server's time, so it is never a future time. Reading it the same way as the publication date and time
(which can represent a schedule) would compare a value that needs no comparison.

**The status a product holds is a UUID; the code exists only in the master.** Matching is done once within the same request. Display
names are not used for matching — a name is a value for display and, unlike a code, gets rewritten.

## Where a Row Leads

| What is pressed | Destination |
| --- | --- |
| Row | Editing that product |
| Stock number | Restocking that product |
| Row actions | Choose edit or restock by name |

**Keep both the press-the-surface link and the choose-by-name link.** Pressing the surface is fast, but what happens where is unknown
until pressed. A menu listing named items becomes the place where that answer can be read before pressing.

## Refetch Scope

**When conditions or the page change, only the list is refetched.** The search field, the filters, the conditions in effect and the
link to creation are not caught up in the refetch's loading UI. The inside of the boundary cannot be operated while waiting, so
nothing that must stay operable is put inside it ([0040](../../../../adr/0040-routing-rendering-strategy.md)).

**The category and status masters do not change with the conditions.** Fetching them here along with the list would drop even the
input fields into the loading UI each time the conditions change, and the foothold for continued filtering would vanish.

## Next Screens

| Destination | Specification |
| --- | --- |
| Create | [`new/page.function.md`](new/page.function.md) / [`screen`](new/page.screen.md) |
| Edit | [`[id]/edit/page.function.md`](<[id]/edit/page.function.md>) / [`screen`](<[id]/edit/page.screen.md>) |
| Restock | [`[id]/stock/page.function.md`](<[id]/stock/page.function.md>) / [`screen`](<[id]/stock/page.screen.md>) |
