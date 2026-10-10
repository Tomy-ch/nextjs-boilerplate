# `/products` Product List (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**No authentication required.** The same list appears whoever views it.

**The backend owns filter matching.** This screen builds the conditions, passes them, and lists what comes back;
it owns neither price comparison nor stock judgment ([0070](../../../../adr/0070-backend-role-separation.md)).

## The URL holds the search conditions

**Every condition in effect is in the URL.** A shared link, the back operation and a reload must all give the same
result, and holding the conditions in client state would make none of them hold.

| Condition | Value | Multiple |
| --- | --- | --- |
| Keyword | Partial match on product name and product description | — |
| Category | Codes held by the category master | **Yes** |
| Price | Minimum and maximum. Either can be omitted | — |
| Stock availability | All / In stock / Out of stock | — |
| Sort | Newest first (default) / Oldest first | — |

**Stock availability is mapped onto the contract's stock-count condition.** The contract accepts a minimum and maximum count and has no
"in stock" state. What the user chooses is presence or absence, so this screen does the bridging.

**Conditions that allow multiple values are expressed by repeating the same key.** Joining with a delimiter would make the values impossible to split
as soon as a value containing the delimiter appeared.

**A category is identified by the master's code, not by UUID.** The contract accepts codes for filtering, and
the endpoint that takes UUIDs only remains as deprecated. Sending both at once gives 400, so the endpoint this screen
uses is limited to the code side.

**Values equal to the default are not put in the URL.** A URL that states the sort default explicitly and one that omits it would be stacked in history
as different things.

**Keys are sorted before assembling.** If the same conditions became different strings depending on the order selected, shared links and
history alike would treat the same screen as different things. For conditions that allow multiple values, the values are sorted too.

**When multiple values arrive for a condition that takes only one, it is read as unspecified.** The URL can be edited directly by the user,
so the same key can appear twice even for single-valued conditions such as keyword or price. Deciding which to take per condition
would make the same URL look like different conditions depending on where on the screen it is read. **There is one way of reading it.**

**No status filter is offered.** Both the contract and the backend accept `statusCodes`, and filtering does actually
work. It is not placed because the status master is a set of stock and sales statuses (in stock, accepting reservations, discontinued, under review, etc.),
a vocabulary for sellers to find their targets. Listing them all without choosing which to show buyers would mix in options that are selectable
but mean nothing to a buyer. Of the axes a buyer chooses on, stock availability is placed separately.

**Whether something is published is held by `publishedAt`, not by the status master.** The contract's constraint of returning only published items is on that
axis, and has nothing to do with whether filtering by the status master works.

## Validating Conditions

**Conditions that could not be mapped against the contract are not discarded; the failure to map them is returned.** The URL is input the user can edit
directly, and silently dropping out-of-range values to show the default list would have a user who thinks they filtered
see unfiltered results.

Validation is done at the fetch boundary; the screen side only receives the keys that could not be mapped and decides the display. This avoids a state where,
when the contract is regenerated, only the validation remains on the old range.

## Submitting a search term requires JavaScript in the browser

The keyword input holds its value as part of the same single condition as the filters. **Therefore the input must run
on the browser side, and searching is not possible where JavaScript is absent.** Assembling the conditions and then confirming them
together, and being submittable without JavaScript, cannot coexist — the former requires holding the value, and the latter only works with a form that
holds nothing.

This screen takes the former. **If the search term took effect first, the list would swap while the user is assembling filters**,
and the latter is dropped as the cost of avoiding that. Browsing the list, showing the filters and navigating to a detail work
without JavaScript (the conditions still go into the URL the same way).

## Fetching

| What | When |
| --- | --- |
| The first page of the list | Every time the conditions are confirmed (server side) |
| Total matching count | Same as above. The same conditions as the list are passed |
| Category list | Once, regardless of conditions |
| Matching count (before confirming) | While assembling filters in the overlay, after interaction pauses (screen side) |
| The rest of the list | When nearing the end (screen side) |

**The total count cannot be taken from the list's response.** Cursor pagination returns only whether there is a next cursor, and
a dedicated endpoint returns the total. If that endpoint were not given the conditions, the pre-filter count would show even after filtering, disagreeing with
the number listed.

**The total is shown only for lists where the contract has an endpoint that counts and where the total informs the decision on that screen.**
Both are required — even with an endpoint, it is not shown on a list where the next action does not change with the total. This screen has the endpoint,
and the size of the filtered result decides "whether to filter further," so it shows it. The side that does not show it by the same test is
the [purchase history](../purchases/page.screen.md).

**The category list does not change with the search conditions.** Its fetch is separated from what changes with the conditions (the list and the total count),
and categories are not refetched on filtering.

**The pre-confirmation count is counted from the screen side.** It targets conditions not yet in the URL, so the server-side render cannot
count them. It is not fetched in the middle of continuous interaction; it is counted only once after interaction pauses. The previous fetch is
aborted.

**Fetches from the screen side go through the same origin.** Timeout, retry and circuit breaking are owned by the server-side boundary,
so that two retries do not run under separate retry budgets for the same request
([0073](../../../../adr/0073-pagination-fetch-boundary.md)).

## Reading On

**The rest is read automatically when nearing the end.** Numbered pagination cannot be built (the cursor holds neither the total count nor
a jump target for an arbitrary page). This is the path that
[0073](../../../../adr/0073-pagination-fetch-boundary.md) allowed as a limited exception.

**The number of items read so far is written back to the URL.** Without writing it back, both the back operation and a reload would return to a screen with only the first
page, losing what was read along with the scroll position. **It can be restored only up to the count the contract
accepts**; anything read beyond that does not come back. Writing back does not stack history, and the back operation leaves to the screen
before the list.

**When the conditions change, the reading position is not carried over.** "The rest" after a change would point to the rest of the previous conditions.

## What One List Item Holds

A value identifying the product, name, price, stock count, category name, status name and representative image.

**The representative image is the first in the order the contract returns.** The contract's order decides which is representative. A product with no
images at all gets a substitute image.

**Prices are carried around as decimal strings.** Converting to numbers would lose sub-cent precision. The currency symbol is added
just before display.

## Add to Cart

**This screen does not own the operation.** It is a change to the cart, and this screen only places the endpoint that `cart` exposes
([0026](../../../../adr/0026-layout-shell-mount.md)). It cannot be pressed for a product with no stock at all.

## Inquiries

An entry point for inquiring is shown on out-of-stock products. **There is no receiving endpoint yet, and pressing it sends no inquiry.**
Only the entry point's position has been settled in advance.

## Failure Semantics

| Failure | Scope |
| --- | --- |
| Fetching the list | The whole screen. The route's `error` boundary receives it ([0080](../../../../adr/0080-error-handling.md)) |
| Fetching the total count | Only the total count. It switches to the number loaded so far, and the list is shown as is |
| Conditions fall outside the contract | The keys that could not be mapped are shown in place of the list. Not thrown as a failure |
| Fetching the rest | Only that fetch. What has been read stays |
| Pre-confirmation count | Nothing is shown. Showing something in place of the number would be read as a count |
