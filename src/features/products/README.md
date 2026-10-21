---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # Exception: whole-screen stories
test-requirement: [feature, component, unit]
---

# products

The screen slice for finding and browsing products.

## What Belongs Here

- Orchestrating the product list fetch (interpreting fetch conditions, resolving image URLs, pagination)
- Display specific to this screen (list, card, loading UI, failure display, search field, single-item detail)

## What Does Not Belong Here

- Direct dependencies on other features
- General-purpose display (`Card` / `Badge` / `MediaImage` and the like come from `components`)
- Business logic (deciding stock and prices belongs to the backend)

## Routes and Contracts

| Route | Spec | Authentication |
| --- | --- | --- |
| `/products` | [`screen`](../../../docs/spec/route/shop/products/page.screen.md) / [`function`](../../../docs/spec/route/shop/products/page.function.md) | Not required |
| `/products/[id]` | [`screen`](<../../../docs/spec/route/shop/products/[id]/page.screen.md>) / [`function`](<../../../docs/spec/route/shop/products/[id]/page.function.md>) | Not required |

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetProducts` | The list matching the conditions. The first page on the server side, the rest through `/api/products` |
| `GetProductsCount` | The total count matching the conditions. Receives the same conditions as the list |
| `GetProductsDetail` | The detail of one item |
| `GetProductCategories` | The filter options. They do not change with the conditions |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| List | success | `Page/Products/List/Default` |
| | empty | `Page/Products/List/Empty` |
| | loading | `Features/Products/List/Skeleton/Default` |
| | error | `Features/Products/List/ErrorState/Default` |
| | loading more | `Page/Products/List/LoadingMore` |
| | failed to load more | `Page/Products/List/LoadMoreFailed` |
| | reached the end | `Page/Products/List/ReachedEnd` |
| Detail | success | `Page/Products/Detail/Default` |
| | out of stock | `Page/Products/Detail/OutOfStock` |
| | no image | `Page/Products/Detail/NoImage` |

The error surface is rendered by the route's boundary (`error.tsx`), and the stories above are the contents that boundary places. The list and
the detail use the same display, and only the detail's "not found" becomes a separate surface in `not-found.tsx`.

## Structure

Directories are organized per screen (`list` / `detail`), and split by nature inside. What belongs to no screen and is owned by the whole feature
sits directly here without a screen directory in between, under the same rule.

| File | Role |
| --- | --- |
| `list/page-content.tsx` | Interprets the fetch conditions and assembles the screen. Fetches only what does not change with the conditions |
| `list/results.tsx` | Fetches the list and the count matching the conditions. The loading UI boundary is placed here |
| `facade/list-url/` | The list URL contract (path, filter keys, URL construction). Other features use it too |
| `list/query.ts` | Normalizes raw `searchParams`, plus the count and option types |
| `list/page-size.ts` | How many items to load at once. Kept apart from condition interpretation so that zod is not brought into the client |
| `list/price-range.ts` | The price scale, and the mapping to and from the URL's lower and upper bounds |
| `list/stock-availability.ts` | Stock presence, and the mapping to and from the URL's stock-quantity condition |
| `list/range-label.ts` | Displays the lower and upper bound. Price and stock quantity use the same wording for "unspecified" and the same joiner |
| `list/filter-draft.tsx` | Holds the conditions being built and keeps them single on the screen |
| `list/use-filtered-count.ts` | Counts the matches for conditions not yet confirmed |
| `list/use-infinite-products.ts` | Loads more on reaching the end. Writes the number of items read back to the URL |
| `list/view.tsx` | The list display. Delimits here the range refetched by conditions |
| `list/active-filters.ts` | Maps the conditions currently in effect to a list with a removal destination for each |
| `list/ui/grid/` | Lays out products. Holds neither fetching nor reading on, and also owns the empty-state guidance |
| `list/ui/card/` | The look of one item. The whole card is the link to the detail |
| `list/ui/contact-button/` | The entry for inquiring about an out-of-stock product. It does not carry over which product |
| `list/ui/keyword-field/` | The keyword input. It does not search on keystrokes; it navigates on the confirming action |
| `list/ui/sort-select/` | Sorting. Applied the moment it is chosen, regardless of width |
| `list/ui/price-field/` | The price input. The select box and the range slider move over the same scale |
| `list/ui/category-field/` | The category input. Multiple selection. The limit is set by the contract, so it is received |
| `list/ui/stock-field/` | The stock-status input. One of three states is chosen |
| `list/ui/filter-fields/` | The arrangement of inputs. Only this knows the mapping between inputs and URL keys |
| `list/ui/sticky-region/` | Where the bar and the sidebar that compete for the top edge while reading on live |
| `list/ui/filter-sidebar/` | Filters permanently placed at the side. Applied the moment they are chosen. Holds no landmark |
| `list/ui/filter-sheet/` | Filters for widths that cannot hold a side region. Confirmed together inside an overlay |
| `list/ui/infinite-list/` | A list that can be read on. Connects fetching to the look |
| `list/ui/load-more-list/` | The look of a list read on. Announces the count; the state of loading more belongs to `LoadMore` |
| `list/ui/skeleton/` | Loading UI |
| `list/ui/error-state/` | The display when fetching fails |
| `facade/detail-url/` | The product detail path. The one place that lets the canonical URL and the sitemap state the same spelling |
| `detail/page-content.tsx` | Fetches and assembles one item. Also receives the `not-found` classification here. Structured data is placed here too |
| `detail/metadata.ts` | Per-product title, summary and canonical URL. States `noindex` when not found. The page's `generateMetadata` calls it thinly |
| `detail/structured-data.ts` | Maps a product to schema.org `Product`. A description that carries markup is not included |
| `detail/view.tsx` | The single-item detail display. Holds the structure and value display, and passes the image surface down |
| `detail/ui/gallery/` | The surface for flipping through images. Uses a carousel regardless of the number of images, and offers zoom only on real images |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching the list, count, detail and categories, and converting them to display models. Includes resolving image URLs |
| `model` | Business types (`Product` and so on) and condition types |
| `components` | General-purpose display (`Card` / `Badge` / `MediaImage` / input primitives) |
| `capabilities` | Detecting reaching the end (`use-on-visible`) and the scroll direction used to compete for the top edge |
| `errors` | Maps a normalized failure to the message the screen shows |
| `logging` | Recording fetch failures |
| `observability` | Puts rendering on spans |

## Action Return Contract

None. The add-to-cart operation belongs to `cart`; this feature only places
[`cart/facade/add-to-cart/`](../cart/facade/add-to-cart/).

## Test Perspectives

- [ ] The conditions are carried in the URL, giving the same result on sharing, back navigation and reload
- [ ] A condition that could not be mapped against the contract appears on screen instead of being silently dropped
- [ ] How filters are confirmed changes with width (immediately at the side, together in an overlay)
- [ ] The number of items read is written back to the URL and restored up to the contract's limit
- [ ] When category selection reaches the limit, unselected items become `aria-disabled` rather than `disabled`
- [ ] The metadata of a product that is not found states `noindex` and has no canonical URL
- [ ] The summary and structured data do not include the product description's markup

## Operations

- **Where the line is for what is not raised to `components`**: display that depends on business types (`Product`) and on destinations stays here.
  How stock is shown depends on the backend's state transitions, so what `components` can supply goes only as far as `Badge`
  variants
- **Products without an image get a substitute image.** Which image substitutes depends on the nature of the subject, so the path
  is owned by this feature and passed to `fallbackSrc` of `MediaImage`
- **Fetching happens in here, not in the page.** This puts the loading UI boundary near the part that actually waits for data;
  covering the whole page with one loading UI would make even the search field disappear and become unusable
- **The range refetched by conditions is separated from what does not change with conditions.** The category list is the filter input itself
  and does not change with the search conditions. `page-content.tsx` fetches only what is independent of conditions, and the list and count that change with
  conditions belong to `results.tsx`. The loading UI boundary and the rebuild keyed on the conditions apply only there, so filtering does not turn
  the search field, the condition chips or the inputs into loading UI
- **Search conditions are placed in the URL.** Results can be shared, back navigation returns to the previous conditions, and reload shows the same screen.
  Holding them in client state achieves none of these
- **The add-to-cart operation itself belongs to `cart`.** It is a change to the cart, and this feature only places
  [`cart/facade/add-to-cart/`](../cart/facade/add-to-cart/) (features do not reference each other directly,
  so the entry is published as a section, `facade/`)
- **That operation is fixed to the bottom of the screen on bands without the sidebar** ([`docs/rules.md`](../../../docs/rules.md#layout)).
  The detail is vertically long, and from a position read down to, the user could not get back to the operation. Whether to fix it is a decision of
  screen assembly, so `detail/view.tsx` owns it, and the operation component does not know where it was placed
- **The whole card is a link to the detail, but it is not wrapped in a link.** Wrapping it would put the add-to-cart operation inside the
  link, an operation within an operation. The product-name link is stretched over the whole card with a pseudo-element, and
  the operation is placed after the link and lifted above the overlap with `relative`. That the destination visible to assistive technology
  is the product name rather than "the text of the whole card" is another reason for this shape
- **Values whose length the backend decides are not assumed to fit on one line.** Category and status names have no declared limit,
  and `Badge` does not wrap by default, so the caller allows wrapping
- **Pagination is cursor-based.** Numbered pagination cannot be built (the cursor has neither the total count nor
  a jump target for an arbitrary page). The list is read on through incremental fetching, which is the path
  [0073](../../../docs/adr/0073-pagination-fetch-boundary.md) allows as a limited exception.
  The first page is fetched by a Server Component, and only the rest goes through `adapters/client`
- **There may be several confirming actions, but what is confirmed is one.** The keyword input and the filter inputs are
  in different places on the screen, and depending on width the latter appears either at the side or in an overlay. If each held its own draft,
  confirming one would discard the other's input in progress (`filter-draft.tsx` keeps it single)
- **Keywords do not search on keystrokes.** If only the search term took effect first, the list would be
  replaced while filters are being built, and the user would see results for half-built conditions. Submitting while empty is possible only while a search term
  is in effect (that is, when removing it means something)
- **How filters apply depends on whether the list is visible.** At widths that can hold them permanently at the side, they apply the moment they are chosen
  (the results appear alongside, so a confirm step would make the user press once more to see them). Inside an overlay
  the list is hidden, so conditions are built and then confirmed together, and **the match count before confirming is attached to that action**
  (`use-filtered-count.ts`). Sorting is immediate regardless of width (for a single selection, choosing is the same as confirming)
- **While reading on, three things compete for the top edge of the screen** (the outer frame's header, the search bar, the side filters).
  While reading down, the bar retreats and the filters stop directly under the header; when trying to go back up, the bar appears and the filters
  move down below it. The bar's height changes with the number of conditions in effect, so the position is not copied but decided from measured values
  (`ui/sticky-region/`). **The bar's retreat is expressed by ending its stickiness** — hiding it by shifting its position would make it
  overlap the heading as it rises while still in its original position
- **The lower and upper price bounds can be chosen only on the scale.** The select box and the range slider point at the same range,
  so allowing continuous values would have two controls express the same condition at different granularities. The slider does not report while
  being dragged, and treats only the moment the finger is released as the confirmation
- **Stock status is mapped to the contract's stock-quantity condition and carried in the URL.** What the contract holds is a lower and upper bound on quantity,
  not an "in stock" state. What the user chooses is presence, so the bridging is owned by
  `stock-availability.ts`
- **Subscribers of the providers carry `"use memo"`.** This screen has two providers where a single state change
  directly reaches the subscribers — the conditions being built
  (`filter-draft.tsx`; moves on each keystroke and each check) and the state of competing for the top edge (`ui/sticky-region/`; moves with the scroll
  direction and the bar's height). The marker goes only on **the components that subscribe to those two, and their descendants**.
  Components that do not subscribe are not re-rendered however often the providers move — the subtree passes through as the same
  element received as `children`, which is the case for `ui/sort-select/` and the list body
- **The load-more action is shown only on failure.** While reading on, the next load starts just by approaching the end,
  so lining up an entry that does the same only adds a choice. After a failure, end-of-list detection never fires again in place,
  so only there does the action become the sole way to recover. Keyboard scrolling and reading on with assistive technology both move the displayed
  position, so this shape loses no means other than scrolling
- **The number of items read is written back to the URL.** Without it, both back navigation and reload return to a screen with only the first
  page, and what was read on is lost along with the scroll position. Up to the item limit the contract accepts can be restored,
  and what was read beyond it does not come back
- **The total count cannot be taken from the list response.** Cursor pagination returns only whether a next cursor exists.
  The total is returned by a dedicated fetch endpoint (`GET /v1/products/count`), which receives the same conditions as the list. Making it an endpoint that does not take
  conditions would show the pre-filter count after filtering, contradicting the number of items listed
- **There is no entry for filtering by status.** Both the contract and the backend accept `statusCodes`, and the filter actually
  works. It is not placed because the status master consists of stock and sales states (in stock, accepting pre-orders, discontinued, under review and so on),
  a vocabulary for sellers to find their items. Listing them all without choosing which to show buyers would mix in options that can be selected yet
  mean nothing to buyers. Among the axes buyers choose by, stock presence is owned by
  `stock-availability.ts`. **Whether an item is published is a separate axis, `publishedAt`, not the status master**, and
  is unrelated to whether filtering by the status master works
- **How many categories can be selected at once is decided by the contract.** Nothing is shown until the limit is reached; on reaching it, unselected categories become
  `aria-disabled`, and how many can be chosen is shown at the end of the group. Always showing the remaining count would occupy everyone's view for
  a constraint most users never reach. The number is not copied but received from `adapters`
- **Categories and statuses are referred to by the master's `code`, not by UUID.** What the contract accepts for filtering is
  `categoryCodes` / `statusCodes`; the UUID-based `categoryId` / `statusId` remain only as deprecated.
  Sending them together with their successors yields 400, so the entry `adapters` accepts is narrowed to the code side
  only (`products.ts`)

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. What is lent to other features is exposed in `facade/`
- [0026](../../../docs/adr/0026-layout-shell-mount.md) — Mounting the shell and Providers. Where cross-cutting UI that is not placed per screen goes
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical placement and co-location. Organize per screen and split by nature inside
- [0042](../../../docs/adr/0042-react19-rendering-api.md) — React 19 rendering API conventions. The extent to which `"use memo"` is applied
- [0044](../../../docs/adr/0044-seo-metadata-strategy.md) — Metadata policy. Who owns what is stated to search engines
- [0051](../../../docs/adr/0051-styling-system.md) — Design tokens and per-band variation
- [0073](../../../docs/adr/0073-pagination-fetch-boundary.md) — The pagination / incremental fetching boundary. Cursor-based paging and the limited exception for client fetching
- [0080](../../../docs/adr/0080-error-handling.md) — Error handling. Who handles `error` / `not-found`
- [0101](../../../docs/adr/0101-performance-budget.md) — The performance budget. What goes into the client bundle
