---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # Exceptions: the counterpart's facade/, and whole-screen stories
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/purchases/__mocks__/**"
---

# purchases

The screen slice for reading completed purchases afterwards. It holds the list (`/purchases`) and the single-item detail (`/purchases/[code]`).

## What Belongs Here

- Orchestrating the purchase history fetch, and the state of incremental fetching (infinite scroll)
- Reading and writing the period filter as a URL condition
- Display specific to this screen (history rows, period inputs, receipt, breakdown, line items)

## What Does Not Belong Here

- Depending on another feature's internals (the product list URL comes from the `facade/` of `products`)
- Creating purchases (owned by `checkout`)
- Calculating amounts (subtotal, tax, shipping and total are values the backend decided)

## Routes and Contracts

| Route | Spec | Authentication |
| --- | --- | --- |
| `/purchases` | [`screen`](../../../docs/spec/route/shop/purchases/page.screen.md) / [`function`](../../../docs/spec/route/shop/purchases/page.function.md) | Required |
| `/purchases/[code]` | [`screen`](<../../../docs/spec/route/shop/purchases/[code]/page.screen.md>) / [`function`](<../../../docs/spec/route/shop/purchases/[code]/page.function.md>) | Required |

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetPurchases` | The history. The first page on the server side, the rest through `/api/purchases` |
| `GetPurchasesDetail` | The detail of one item |
| `PatchPurchasesCancel` | Cancellation |
| `PatchPurchasesPay` | Payment |
| `GetExchangeRates` | Reference converted amounts. The detail is shown even if they cannot be read |

**Shipping and delivery (`PatchPurchasesShip` / `PatchPurchasesDeliver`) are not called here.** They are seller-side
transitions owned by `admin`.

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| History | success | `Page/Purchases/History/Default` |
| | empty (no purchases at all) | `Page/Purchases/History/NoPurchases` |
| | empty (none in the period) | `Page/Purchases/History/NoResultInPeriod` |
| | loading | `Features/Purchases/History/Skeleton/Default` |
| | loading more | `Page/Purchases/History/LoadingMore` |
| | failed to load more | `Page/Purchases/History/LoadMoreFailed` |
| | reached the end | `Page/Purchases/History/ReachedEnd` |
| Detail | success | `Page/Purchases/Detail/Default` |
| | paid / delivered | `Page/Purchases/Detail/{Paid,Delivered}` |
| | reference converted amount could not be read | `Page/Purchases/Detail/WithoutReference` |
| | loading | `Features/Purchases/Detail/Skeleton/Default` |

**The empty state is split in two.** "Has not bought anything yet" and "none in that period" lead the user to different next
actions. Errors are caught by the route's `error` boundary, and a detail that is not found (`notFound()`) by the `not-found` boundary at the same
level. Both are placed in the history segment, so a detail failure also appears inside the shell.
The surface for absence has a single back link, to the history.

## Structure

Directories are organized per screen (`history` / `detail`), and split by nature inside.
What belongs to neither screen sits directly here without a screen directory in between.

| File | Role |
| --- | --- |
| `facade/paths/` | The two routes this feature owns. Referenced by the links in My Page (`account`) and purchase completion (`checkout`) |
| `facade/receipt/` | The purchase receipt (order number, order date and time, status). **Purchase completion shows it in the same form** |
| `facade/lines/` | The joined line items. **Purchase completion shows them in the same form** |
| `facade/amount-summary/` | The breakdown of the billed amount and the reference amount converted to yen. **Purchase completion shows it in the same form** |
| `facade/status-emphasis/` | Chooses the badge look from the status name. Groups them into three |
| `purchases.fixture.ts` | Fixed purchases used by stories and tests |
| `facade/purchase.fixture.ts` | Fixed values read by the three in `facade/` and by `checkout`, which borrows them |
| `actions.ts` | Sends that advance the state. Calls the contract's transitions and distinguishes only conflicts |
| `__mocks__/actions.ts` | Replaces the Server Action in the catalog |
| `form-names.ts` | The names of the fields a send carries |
| `form-state.ts` | The container for the send result, and the message when refused because of the status |
| `history/query.ts` | The raw conditions the screen receives, and the pagination dimensions (count, cursor key) |
| `history/period.ts` | The period condition. URL keys and construction, and the rewording for users |
| `history/read-period.ts` | The side that reads the URL. Kept apart from the side that builds it ([`rules.md`](../../../docs/rules.md#url)) |
| `history/period-draft.ts` | The period being built. The intermediate form the inputs pass through, and the check for whether it can be confirmed |
| `history/page-content.tsx` | Interprets the conditions and assembles the screen and the loading boundary |
| `history/results.tsx` | Fetches the first page. The range refetched when the period changes |
| `history/use-infinite-purchases.ts` | Fetches the second page onward and detects reaching the end |
| `history/view.tsx` | The list screen. Assembles the filter and the list body |
| `history/ui/infinite-list/` | A list that can be read on. Connects fetching to the look |
| `history/filter-draft.tsx` | Provides the period being built. Keeps single the inputs that appear in two places depending on width |
| `history/ui/period-fields/` | The period inputs. The kind, and the inputs that kind uses. Holds no confirmation |
| `history/ui/period-bar/` | The filter placed permanently inside the bar. Used at widths where the list is visible alongside |
| `history/ui/period-sheet/` | The filter for widths where the bar cannot be permanent. Opens an overlay from an action fixed to the bottom edge |
| `history/ui/purchase-row/` | One row of the history. The row itself is the destination to the detail |
| `history/ui/purchase-list/` | The look of a list read on. The state of loading more belongs to `LoadMore` |
| `history/ui/empty/` | The display when there is nothing to list |
| `history/ui/skeleton/` | The list's loading UI |
| `detail/page-content.tsx` | Fetches one item. Also receives the `not-found` classification here |
| `detail/view.tsx` | The detail screen. Assembles the breadcrumbs and the three blocks from `facade` |
| `detail/available-transitions.ts` | What can be done per status. A copy of the backend's transition rules |
| `detail/ui/transitions/` | The operations currently available for that purchase, and the notice of success |
| `detail/ui/transitions/presentation.ts` | The words and look per transition. Split between the opening action and the confirming action |
| `detail/ui/transition-button/` | The operation that advances the state by one. Opens the confirmation and reports a refusal inside it |
| `detail/ui/skeleton/` | The detail's loading UI |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching the history, detail and reference converted amounts, and the sends that advance the state |
| `model` | Display models (`Purchase` / status), period types, `ActionState` |
| `components` | The building blocks the surfaces are assembled from (card, badge, inputs, load more, print action) |
| `capabilities` | Detecting reaching the end (`use-on-visible`) |
| `errors` | Maps the classification of a refused transition to a message |
| `observability` | Puts rendering on spans |

The product list URL comes from the `facade/` of `products` (keys are not copied).

## Action Return Contract

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `cancelPurchaseAction` | `actions.ts` | `PurchaseTransitionState` | `revalidatePath` | Keeps the confirmation open and reports inside it |
| `payPurchaseAction` | `actions.ts` | `PurchaseTransitionState` | Same as above | Same as above |

**Only conflicts (409) are distinguished.** This is the case where someone else or another tab advanced the state first, and the action
the person who pressed can take (reloading the screen) differs from other failures.

## Test Perspectives

- [ ] The period filter is passed to the server as a query (already-fetched pages are not filtered)
- [ ] A period URL missing a required part falls back to all periods and does not become a 400
- [ ] Operations for transitions not currently possible do not appear
- [ ] That a transition was refused appears inside the confirmation, which stays open
- [ ] An unknown status business key is assigned to no category, and the list remains readable

## Design

- **The filter is always passed to the server as a query.** Applying a date condition to already-fetched pages yields a list that drops
  older purchases matching the condition. Only the newest few pages have been loaded
- **A condition missing a per-kind requirement cannot be constructed.** The effective condition is held as a discriminated union, and the
  intermediate form the inputs pass through is split into a separate type (`period-draft.ts`)
- **Unreadable conditions fall back to all periods.** Users can edit the URL directly, so URLs missing a required part also arrive.
  Passing one to the contract as is turns the list itself into a 400, and nothing can be shown on the screen
- **Status colors are grouped into three.** In progress / desirable terminal / cancelled; this is exactly the distinction the backend's
  state transitions hold (whether terminal, whether cancelled). Color only reinforces the text, and
  a badge always carries the name as text
- **Statuses are looked up by business key.** The contract carries both a business key (`code`) and a name for each status,
  and defines the business key as the one to branch on. The name is text shown to users and is rewritten for
  backend-side reasons. An unknown business key is assigned to none of the three and shown without decoration, so as the master
  grows the screen asserts no meaning it has not verified, and since the name appears as text the list stays readable
- **With a single condition, `FilterBar` is not used.** That set assumes several conditions and offers a path that lists the effective conditions
  as chips and clears them together. With only a period, the input itself shows the effective condition,
  and a chip would be nothing but a copy of it. At widths where it sits inside an overlay and the input is not visible, the opening action's text
  shows the effective period
- **Confirming in the overlay does not close it.** It closes when the confirmed period has reached the list. Firing the close action and the navigation
  at the same time lets the overlay's undoing of the history entry it pushed for back navigation cancel the navigation that has not arrived yet
  ([`use-overlay-history`](../../components/design-system/overlay/use-overlay-history.ts)). Both confirming and
  the action that resets to all periods replace the entry without pushing history. When the period does not change nothing arrives, so it closes
  on the spot
- **The purchase display is owned by `facade`.** Purchase completion (`checkout`) shows the same receipt, line items and breakdown.
  If the same purchase looked different on different screens, it could not be matched as a receipt. They cannot be raised to `components`
  because each carries the subject's vocabulary (order, purchase) and would be rejected by the core-residue check
- **Unavailable operations are not shown.** A button that cannot be pressed reads as "pressable someday". What can be done is
  looked up from the business key, and that table is owned by this screen. It is a copy of the state transition rules the backend holds,
  so it is not raised to a kernel. When the admin side's operations need the same decision, that is when the place to share it is decided.
  The table also owns the order, with advancing operations first
- **A refusal is reported inside the confirmation.** The confirmation stays open after sending, so reporting outside it would put the message
  where the user is not looking. Conversely, the notice of success belongs to the row where the operations are listed, because on an advanced purchase
  the confirmation disappears along with the operation
- **The detail's loading boundary is placed by the route's `page.tsx`.** It wraps the whole `page-content` in `Suspense` and
  renders `detail/ui/skeleton/` as the fallback. The list takes that shape and in addition has `page-content` wrap `results`,
  keeping the controls outside the wait when the period changes
- **The incremental fetching components are shared with the product list.** The state of loading more belongs to
  [`LoadMore`](../../components/app-starter/load-more/README.md), and noticing that the sentinel became visible belongs to
  [`use-on-visible`](../../capabilities/use-on-visible.ts). Only the accumulation state machine
  stays in the feature, because whether to write the read position back to the URL and what triggers re-accumulation differ per screen

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. What is lent is exposed in `facade/`, and other features' internals are not looked at
- [0026](../../../docs/adr/0026-layout-shell-mount.md) — Mounting the shell and Providers. Where cross-cutting UI that is not placed per screen goes
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical placement and co-location. Organize per screen and split by nature inside
- [0029](../../../docs/adr/0029-type-design-discipline.md) — Discriminated unions and parsing at the boundary. Separating the effective condition from the in-progress input form
- [0051](../../../docs/adr/0051-styling-system.md) — Design tokens and per-band variation
- [0053](../../../docs/adr/0053-ui-component-interaction-seam.md) — The a11y seam of interaction. The seams for confirmation, sheets and print
- [0054](../../../docs/adr/0054-ui-catalog-storybook.md) — The catalog policy. Replacing Server Actions
- [0070](../../../docs/adr/0070-backend-role-separation.md) — The line of responsibility with the backend. Screens do not decide amounts or state transition rules
- [0073](../../../docs/adr/0073-pagination-fetch-boundary.md) — The pagination / incremental fetching boundary. Where to read the rest from
- [0079](../../../docs/adr/0079-auth-frontend-seam.md) — The authentication front-end seam. Screens hold no path that reaches someone else's purchases
- [0080](../../../docs/adr/0080-error-handling.md) — Error handling. Who handles `error` / `not-found`, and where the wait is placed
- [0100](../../../docs/adr/0100-accessibility-target.md) — The accessibility target level. Do not distinguish by color alone
- [0120](../../../docs/adr/0120-locale-aware-formatting.md) — Date and number formatting
