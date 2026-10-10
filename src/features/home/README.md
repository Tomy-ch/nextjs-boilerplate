---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # Exceptions: the other feature's facade/, and whole-screen stories
test-requirement: [feature, component, unit]
---

# home

The screen slice for the top page. It lays out the best-seller ranking, new arrivals, and category entry points.

## What Belongs Here

- Orchestrating the three fetch streams and handling success or failure per stream (two fetched per request, and one that can be served without waiting)
- Display specific to this screen (a strip per section, product teasers, loading UI, per-section failure display)

## What Does Not Belong Here

- Depending on another feature's internals (the list URL comes from the `facade/` of `products`)
- General-purpose display (`Card` / `Badge` / `MediaImage` / `Alert` come from `components`)
- Personalization (this screen shows the same content to everyone)

## Routes and Contracts

| Route | Spec | Authentication |
| --- | --- | --- |
| `/` | [`screen`](../../../docs/spec/route/shop/page.screen.md) / [`function`](../../../docs/spec/route/shop/page.function.md) | Not required |

The outer frame's promises are owned by [the `(shop)` layout](../../../docs/spec/route/shop/layout.function.md).

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetProductsRankingQuantity` | The best-seller section |
| `GetProducts` | The new-arrivals section. Specifies only the sort order |
| `GetProductCategories` | The entry point from a category into the list |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Top | success | `Page/Home/Default` |
| | empty (no stream has content) | `Page/Home/Empty` |
| | loading | `Features/Home/Skeleton/Default` |
| | only one stream failed | `Page/Home/RankingFailed` |
| | every fetched stream failed | `Page/Home/AllFailed` |
| | contents of a failed section | `Features/Home/SectionFailure/Default` |

**There is no single error state.** The two per-request streams are awaited individually, so failure is raised per stream,
and only the failed section switches to the failure display. The screen still renders when both fail (both sections simply
show the failure display; it does not reach the route's `error` boundary). The category section is outside this handling (see the "Operations" section).

## Structure

The screen is the only one, so files sit directly here without a screen directory in between.

| File | Role |
| --- | --- |
| `page-content.tsx` | Fetches the two per-request streams in parallel and assembles them. Turns each stream's failure into a value and records it here too |
| `categories-content.tsx` | Fetches the categories. It sits on the static shell side, so it is placed outside `Suspense` |
| `view.tsx` | Display that only stacks the per-request sections. Combinations of success and failure can be checked without fetching |
| `ui/new-arrivals/` | The new-arrivals section. Holds the entry point to the list next to its heading |
| `ui/ranking-list/` | The best-seller ranking section. Lays out ranked rows |
| `ui/category-links/` | The section of entry points from a category into the list |
| `ui/product-teaser/` | One product shown on the top page. Its density differs from the list's card |
| `ui/section-failure/` | The display when only one section has failed |
| `ui/sample-notice/` | The caveat that this is a sample. Placed before the heading, outside the fetch |
| `ui/skeleton/` | Loading UI |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching and conversion to display models. The category lifetime is owned by the fetch endpoint |
| `model` | Display models (`Product`) and image types |
| `components` | The building blocks a section is assembled from (card, badge, loading UI, notice) |
| `errors` | Looks up, by classification, the message shown for a failed stream |
| `logging` | Records a failed stream. The screen keeps rendering, so the record is the only trace |
| `observability` | Puts rendering on spans |

It also uses other features' `facade/` — the list URL (`products`) and the destination for the terms of use
(`site-info`). **It does not look at their internals.**

## Action Return Contract

None. The top page has no operations.

## Test Perspectives

- [ ] When one stream fails, the remaining streams still render
- [ ] A section with empty content is not rendered
- [ ] The caveat appears before the heading without waiting for any fetch
- [ ] The category section is placed outside `Suspense`, without loading UI in between
- [ ] The entry points to the list are built from the `facade/` of `products` (keys are not copied)

## Operations

- **The two per-request streams are fetched with `Promise.allSettled`.** `all` abandons the wait at the first failure,
  so a successful stream's result cannot be used even though it is at hand. Rendering the rest when one fails is how partial errors are handled
- **Only the categories sit outside the wait.** Their fetch carries a cache
  ([product-masters](../../adapters/server/api/product-masters.ts)), so they go into the static shell without waiting for the request
  and are reachable from the first HTML. **A failure of this section is not turned into a value** — the shell is built at build time and
  served as is, so turning the failure into a display would serve that fact to everyone until the next revalidation. If it cannot be read, the build
  fails; if it becomes unreadable after serving has begun, the last shell that was read keeps being served (because refetching is arranged to
  happen in the background; the condition for this is that the `masters` profile in `next.config.ts` has no `expire`)
- **There is no per-section refetch.** If a pressable action is shown, it refetches the whole screen. A partial refetch per
  section only works once that section is pushed down into a client island, and that is not complexity a screen that only
  lays things out should carry
- **The list URL is not built here.** The path and the filter keys are owned by `facade/list-url/` of
  `products`. Copying the key spelling means that when the list changes it to match the contract, only this side
  stays stale and links to an unfiltered list
- **A section with empty content is not rendered.** "No matches" on the top page is a notice that offers the user no action
  to take, and only takes up space. Conveying emptiness is needed on screens where the user specified conditions
- **The caveat that this is a sample comes first.** Since realistic product and company names are listed, leaving it out
  lets them be mistaken for real transactions. It conveys three things — that this is a sample, that the listed items do not exist, and that
  purchase and payment do not work — and is placed before the heading without waiting for any fetch
- **The entry point to the terms of use sits in the same caveat.** Since browsing counts as consent, the user must
  reach what they consent to first, and a position reachable only by scrolling down to the footer does not achieve that
- **Column layout is decided by container queries** ([`docs/rules.md`](../../../docs/rules.md#layout))

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. Other features are touched only through `facade/`
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical placement and co-location. With a single screen, no screen directory sits in between
- [0080](../../../docs/adr/0080-error-handling.md) — Error handling. Partial errors that serve the rest when one side fails
