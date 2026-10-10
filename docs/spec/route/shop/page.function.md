# `/` Top (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**No authentication required.** The same content appears whoever views it. There is no personalization.

**The backend decides what is listed.** For both the best-seller ranking and the new-arrival order, this screen only lists what it receives
as is, and owns neither aggregation nor reordering
([0070](../../../adr/0070-backend-role-separation.md)).

## Render Timing

**The product lists are rendered per request.** Both best sellers and new arrivals change when the backend's state changes,
so fixing them at build time would not reflect updates ([0040](../../../adr/0040-routing-rendering-strategy.md)).

**Only the category list goes into the static shell.** Categories change only as much as operations add or remove them, and the fetch endpoint
has a lifetime ([0071](../../../adr/0071-bff-api-integration.md)). There is no reason to wait, so it is placed on the side reachable from
the first HTML ([0041](../../../adr/0041-cache-components-decision.md)).

**Refetching the static shell happens in the background.** This is because the profile used has no `expire`, which is what makes "once serving starts,
the last successfully read static shell keeps being served" hold. With an `expire`, the first request right after traffic stops for that long would
go refetch synchronously, and a failure there would escape outside this route — all the way to `global-error.tsx`, since it has no `error.tsx`.
**That is why this screen has no expiry.**

**In exchange, building requires reachability to the backend.** Values in the static shell are read at build time, so
if they cannot be read the build fails. **This is accepted.** Failing is better than serving an unreadable static shell, and
if they become unreadable after serving starts, the last successfully read static shell keeps being served as is. To build in an environment that cannot reach it,
build with `APP_API_MODE=mock` ([`env/README.md`](../../../../env/README.md)).

**This screen owns this declaration itself.** Because the outer frame reads the cart, everything beneath is split into static shell and dynamic holes anyway
([`layout.function.md`](layout.function.md)), but that is the outer frame's concern, not the reason any section of this screen sits on
either side. This keeps this screen's render timing from silently changing when the outer frame's circumstances change.

## Fetching

| What | When | Count |
| --- | --- | --- |
| New-arrival products | Every render | Fixed. The number that makes exactly two rows at the most columns |
| Best-seller ranking | Same as above | Fixed |
| Category list | Once at build time; refetched in the background after that | Everything the contract returns |

**The two lines fetched on every render are fetched in parallel.** In series, the next would not start until the previous returned, and the wait would be
the sum of the two. The lines do not depend on each other.

**This screen decides the counts.** Relying on the contract's default would let the contract's concerns change how many are listed. The new-arrival count is set to a number
the column layout divides evenly, so changing the division means revisiting the count.

**The fetch waits are combined into one.** Splitting them per section would add as many frame swaps as there are sections, and the position
where the user started reading from the top would shift downward. The two lines fetched on every render are fetched simultaneously, so the wait is for the slowest one
only, and waiting on them together adds no wait time.

**Categories are placed outside this wait.** There is no reason to put a section that has no reason to wait inside it. It adds no frames,
so it does not conflict with the reason for combining above.

**The caveat is placed outside this wait.** If it waited for the fetch, it would look like an ordinary EC site while waiting.

## Failure Semantics

**Failures arise per line.** If one line fails, the rest are still shown.

| Failure | Scope |
| --- | --- |
| One of the lines fetched on every render | That section only. The section's content is replaced with a failure notice |
| Both lines fetched on every render | Both sections become failure notices. The screen still appears |
| Fetching categories | Not made a section failure. At build time the build fails; after serving starts, the last successfully read static shell keeps being served |

**Even if every line fetched on every render fails, it does not go to the route's `error` boundary.** Failure is held as a value rather than
an exception, and this is the partial-error form of [0080](../../../adr/0080-error-handling.md).

**Only the category failure is not made a value.** The static shell is built once and served as is, so turning a failure into display would
serve the fact that it could not be read at that time to everyone until the next revalidation.

**The message shown is taken from the failure classification.** Showing the fetch side's message as is would make the backend's concerns
the screen's text.

**Failed lines are logged.** The screen keeps being shown, so the log is the only trace.

## Empty

**Sections with empty content are not rendered.** On the top page, "no matches" is a notice that offers the user no action to take,
and it only takes up space. Conveying emptiness is needed on screens where the user specified conditions.

**Empty and failure are handled separately.** An empty section disappears; a failed section leaves its notice.

## Destinations

**This screen does not assemble destinations into the list.** The path and the filter keys are owned by the product list's area. Copying the spelling
would leave this side alone stale when the list changes to match the contract, jumping to an unfiltered list
([0021](../../../adr/0021-frontend-responsibility.md)).
