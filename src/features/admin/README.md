---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # whole-screen stories are the exception
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/admin/analytics/analytics.fixture.ts"
  - "src/features/admin/products/products.fixture.ts"
  - "src/features/admin/products/list/list.fixture.ts"
  - "src/features/admin/users/users.fixture.ts"
---

# admin

The screen slice for the side that manages products and users.

Even when it handles the same subjects as the user-facing slices, **it shares no components**. The buying side
looks at one item and chooses; the managing side compares the same attributes across items. Merging things
whose presentation requirements differ into one component leaks one side's needs into the other.

## What Belongs Here

- Orchestrating fetches for management operations (interpreting the list position and search terms, building pagination URLs)
- Displays dedicated to these screens (the product table, search field, loading UI)

## What Does Not Belong Here

- Direct dependencies on another feature
- Displays usable generically (`StaticDataTable` / `Badge` / `CursorPagination` and the like come from `components`)
- The authorization judgment itself (role declarations are held by `model/authz`, the definitive authorization by the route's layout)

## Routes and Contracts

**Authentication is "role: admin" throughout**. The two-stage protection is described under Authorization. The
outer frame's promises are held by [the `admin` layout](../../../docs/spec/route/admin/layout.function.md).

| Route | Specification |
| --- | --- |
| `/admin` | [`screen`](../../../docs/spec/route/admin/page.screen.md) / [`function`](../../../docs/spec/route/admin/page.function.md) |
| `/admin/analytics` | [`screen`](../../../docs/spec/route/admin/analytics/page.screen.md) / [`function`](../../../docs/spec/route/admin/analytics/page.function.md) |
| `/admin/products` | [`screen`](../../../docs/spec/route/admin/products/page.screen.md) / [`function`](../../../docs/spec/route/admin/products/page.function.md) |
| `/admin/products/new` | [`screen`](../../../docs/spec/route/admin/products/new/page.screen.md) / [`function`](../../../docs/spec/route/admin/products/new/page.function.md) |
| `/admin/products/[id]/edit` | [`screen`](<../../../docs/spec/route/admin/products/[id]/edit/page.screen.md>) / [`function`](<../../../docs/spec/route/admin/products/[id]/edit/page.function.md>) |
| `/admin/products/[id]/stock` | [`screen`](<../../../docs/spec/route/admin/products/[id]/stock/page.screen.md>) / [`function`](<../../../docs/spec/route/admin/products/[id]/stock/page.function.md>) |
| `/admin/inquiries` | [`screen`](../../../docs/spec/route/admin/inquiries/page.screen.md) / [`function`](../../../docs/spec/route/admin/inquiries/page.function.md) |
| `/admin/inquiries/[inquiryId]` | [`screen`](<../../../docs/spec/route/admin/inquiries/[inquiryId]/page.screen.md>) / [`function`](<../../../docs/spec/route/admin/inquiries/[inquiryId]/page.function.md>) |
| `/admin/shipments` | [`screen`](../../../docs/spec/route/admin/shipments/page.screen.md) / [`function`](../../../docs/spec/route/admin/shipments/page.function.md) |
| `/admin/users` | [`screen`](../../../docs/spec/route/admin/users/page.screen.md) / [`function`](../../../docs/spec/route/admin/users/page.function.md) |

**The contracts, states and Actions of `/admin/shipments` are held by [shipments/README.md](shipments/README.md),
and those of `/admin/inquiries` by [inquiries/README.md](inquiries/README.md).**
This README holds the route map, but a screen's contents belong to the side that has its own README. That is
why the tables below have no rows for shipments and inquiries.

The operationIds this slice's screens go through. **This feature does not call the mutating ones** — the
Server Actions live in the app layer; the reason is under Action Return Contract.

| operationId | Purpose | Caller |
| --- | --- | --- |
| `GetDashboardSummary` | Figures for the entry screen and analytics | feature |
| `GetProductsRankingQuantity` | The best-seller table | feature |
| `GetProducts` | The product list | feature |
| `GetProductsDetail` | The single item read by edit and restock | feature |
| `GetProductCategories` / `GetProductStatuses` | Candidates for filters and forms | feature |
| `GetUsers` | The user list | feature |
| `PostProductsImages` | Image upload | An app-layer Action |
| `PostProducts` / `PatchProductsDetail` | Creating and editing products | An app-layer Action |
| `PatchProductsStock` | Increasing and decreasing stock | An app-layer Action |
| `DeleteUsersDetail` | Closing a user's account | An app-layer Action |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Entry | success | `Page/Admin/Dashboard/Default` |
| | empty (no purchases) | `Page/Admin/Dashboard/NoPurchases` |
| | loading | `Features/Admin/Skeleton/{Default,Mobile}` |
| Analytics | Period selected | `Page/Admin/Analytics/RangeSelected` |
| | Ends reversed | `Page/Admin/Analytics/RangeReversed` |
| | Period unreadable | `Page/Admin/Analytics/InvalidPeriod` |
| | No best sellers | `Page/Admin/Analytics/NoRanking` |
| | loading (while only the lower part refetches) | `Page/Admin/Analytics/SummaryPending` |
| Product list | success (including discontinued rows) | `Page/Admin/Products/List/Default` |
| | empty | `Page/Admin/Products/List/Empty` |
| | Filtering, search, pagination | `Page/Admin/Products/List/{MultipleFiltered,Searched,MiddlePage,LastPage}` |
| | loading | `Features/Admin/Products/List/Skeleton/Default` |
| Product creation | Input, confirmation, rejection | `Page/Admin/Products/Create/{Default,Confirm,Rejected}` |
| | loading | `Features/Admin/Products/New/Skeleton/Default` |
| Product edit | Rejection / version mismatch | `Page/Admin/Products/Edit/{Rejected,Conflicted}` |
| | loading | `Features/Admin/Products/Edit/Skeleton/Default` |
| Restock | Replenish / deduct / out of stock | `Page/Admin/Products/Stock/{Replenishing,Deducting,OutOfStock}` |
| | Unreadable quantity / version mismatch / cannot refetch | `Page/Admin/Products/Stock/{RejectedQuantity,Conflicted,Unavailable}` |
| | loading | `Features/Admin/Products/Stock/Skeleton/Default` |
| Users | success / empty | `Page/Admin/Users/{Default,Empty}` |
| | Account closure confirmation, success, conflict | `Page/Admin/Users/{WithdrawConfirm,Withdrawn,WithdrawConflicted}` |
| | loading | `Features/Admin/Users/Skeleton/Default` |
| Every screen beneath | error | `Features/Admin/ErrorState/{Default,WithDigest}` |

**loading and error cannot be reached from a screen's composition.** The loading UI is the `Suspense` fallback
and the failure display is rendered by the `/admin` error boundary; neither appears in the E2E screen
comparison, which captures screens after fetching has succeeded. Stories are the only path into VRT, so the
components themselves are given stories.

The table above maps screen states to stories. The states the components themselves can express (width per
band, the contract's maximum length, sending, a rejected result) are held by each component's story
(`Features/Admin/**`).

## Structure

Create a directory per screen and divide each by nature.

**Products have four screens (list, create, edit, restock), so they are split along the screen axis.** What
several screens share belongs to none of them, so the level above (directly under `products/` and
`products/ui/`) owns it. Users have only one screen, so files sit directly under `users/` with no axis between.

| File | Role |
| --- | --- |
| `paths.ts` | Admin screen paths. Drawn on by the paths between screens and by the entry point from the user-facing layout shell |
| `analytics/period.ts` | The analytics URL contract (the period kind and the dates at both ends) and the key names. Also holds the judgment of whether a selection is valid |
| `analytics/read-period.ts` | The side that reads the URL. Kept apart from the building side ([`rules.md`](../../../docs/rules.md#url)) |
| `analytics/period-window.ts` | The calendar days the selected period covers. The contract does not return them, so the same rule is followed |
| `summary-cards.ts` | Maps the composed summary to the row of figure cards. Attaches a caveat about the population to the values |
| `analytics/ranking-rows.ts` | One row of the best-seller table. The rank is the position in the order the contract returned |
| `dashboard/page-content.tsx` | Fetching and assembling the entry screen (today) |
| `analytics/page-content.tsx` | Interpreting the analytics URL and bounding the refetch scope. Holds no fetching |
| `analytics/summary-section.tsx` | The section refetched when the period changes. Also holds the guidance shown when no period is set |
| `analytics/ranking-section.tsx` | The section that does not follow the period selection. Placed in a separate wait |
| `dashboard/view.tsx` | The entry screen. Figure cards and breakdowns, and the path to period selection |
| `analytics/view.tsx` | The analytics screen. Receives the refetched sections through a slot, below the period selection |
| `ui/stat-cards/` | The row of figure cards. Places notes in the same frame as the values |
| `ui/status-bars/` | The horizontal bar rendering itself. Brings in no charting kit; renders with elements and CSS only |
| `ui/status-breakdown/` | Horizontal bars side by side with a figure table. Shows no total |
| `analytics/ui/period-switch/` | Re-selecting the analysis period. The two that need no dates are links |
| `analytics/ui/period-caption/` | Notes which calendar days the figures shown refer to |
| `analytics/ui/range-dialog/` | Selects both ends of the period in an overlay. The contents are a native GET form |
| `analytics/ui/ranking-table/` | The best-seller table. Does not follow the period selection; product names lead to the product surface |
| `ui/skeleton/` | The analytics loading UI |
| `products/field-limits.ts` | The limits the contract imposes, and the accepted image formats |
| `products/product-rules.ts` | The judgment and wording for one input field. Both the sending and receiving sides go through it |
| `products/form-state.ts` | The product form's result type and the submission target's type. Also holds the version mismatch wording |
| `products/parse-product-form.ts` | Reading what was sent. Also the only holder of the input field names |
| `products/form-sections.ts` | The steps the form has and their order. Confirmation exists only on the create screen, so it is not included |
| `products/master-option.ts` | Turns master data into candidates selectable in the form. The value sent is the identifier |
| `products/use-product-values.ts` | Input values, touched markers, and validity per step |
| `products/use-product-images.ts` | The list of selected images, and uploading and reordering |
| `products/use-image-rejection.ts` | Wording for files rejected before sending |
| `products/use-action-result-freshness.ts` | Whether the result of the previous submission may be shown now |
| `products/use-product-form.ts` | Assembling the state shared by create and edit. Also holds the freshness of submission results |
| `products/form-names.ts` | The input fields' `name`s. The sending and reading sides see the same spelling |
| `products/validation-summary.ts` | Maps per-field errors to the shape the summary lists |
| `products/image-rejection.ts` | How rejected files are described, and size formatting |
| `products/ui/text-field/` `products/ui/select-field/` | One input field. The caller holds the value |
| `products/ui/basics-section/` `description-section/` `images-section/` `publish-section/` `confirm-section/` | The step contents shared by create and edit. They do not know they are steps |
| ↳ `description-editor.tsx` / `confirm-details.tsx` | The split between **when to load** a heavy component and **what to render**. Kept apart so loading concerns do not mix into the container |
| `products/ui/submit-button/` `products/ui/form-feedback/` | The submit control and the submission result |
| `products/list/query.ts` | The list URL contract (filters and pagination position) and the key names. Also holds the path the user came by |
| `products/list/page-size.ts` | How many items one page lists |
| `products/list/filter-option.ts` | The shape of the candidates selectable in filters, and the copy from master data |
| `products/list/active-filters.ts` | Maps the active conditions to a list with removal destinations |
| `products/list/row.ts` | The shape of one table row. Matches products against master data to decide the status appearance, and shows discontinued before the label |
| `products/list/status-tone.ts` | The mapping between status codes and appearance. This screen holds the meaning the contract does not return |
| `products/list/page-content.tsx` | Interpreting the URL and assembling the screen. Bounds the refetch scope here |
| `products/list/results.tsx` | Fetching one page, and assembling the table and pagination |
| `products/list/view.tsx` | Search field, filters, active conditions, path to creation. Receives the list body |
| `products/list/ui/table/` | The product table. Per-row operations fold into a menu |
| `products/list/ui/keyword-field/` | The input field that searches product names and descriptions. Does not search on keystrokes; fires on the confirming operation |
| `products/list/ui/filter-control/` | The category and status selectors themselves. Holds nothing about how a selected value is handled |
| `products/list/ui/filter-select/` | Filters applied as soon as they are selected. Used on wide bands |
| `products/list/ui/filter-sheet/` | Filtering on narrow bands. Opens from the bottom operation and confirms everything together inside an overlay |
| `products/list/ui/skeleton/` | The table loading UI |
| `products/new/page-content.tsx` `products/new/view.tsx` | Creation. Proceeds in stages, with a confirmation at the end |
| `products/new/ui/skeleton/` | The form loading UI. Has the stage progress at the top |
| `products/edit/page-content.tsx` `products/edit/view.tsx` | Editing. Corrects by switching perspectives. Carries the version along |
| `products/edit/ui/skeleton/` | The form loading UI. Has the perspective switch at the top |
| `products/stock/stock-direction.ts` | The direction stock moves, and how it folds into the signed delta the contract accepts |
| `products/stock/stock-quantity.ts` | The rule for whether a value reads as a movable quantity. The side reading the submission and the side showing the projection see the same thing |
| `products/stock/form-state.ts` | The stock form's result type and the submission target's type |
| `products/stock/form-names.ts` | The stock form's `name`s. The sending and reading sides see the same spelling |
| `products/stock/parse-stock-form.ts` | Reading the submitted direction and quantity |
| `products/stock/page-content.tsx` `products/stock/view.tsx` | Restock. The form container looks only at the result |
| `products/stock/breadcrumb-content.tsx` | The hierarchy down to the restock screen. Fetches for the product name |
| `products/stock/ui/current-stock/` | The stock currently known, its freshness, and the path to refetch |
| `products/stock/ui/amount-fields/` | Direction and quantity. Holds the value being typed and adds the projection |
| `products/stock/ui/projection/` | The projection after submission. That it is a reference value, and the caveat when negative |
| `products/stock/ui/skeleton/` | The form loading UI |
| `users/query.ts` | The user list URL contract (scope and page number) and the key names. Receives the upper bound from the caller |
| `users/page-size.ts` | How many items one page lists |
| `users/page-content.tsx` | Interpreting the URL and assembling the screen. Bounds the refetch scope here |
| `users/page-window.ts` | How the page numbers listed in pagination are chosen. Collapses distant ranges into an ellipsis marker |
| `users/row.ts` | The shape of one table row. Lines up family and given names, and reduces whether the account is closed to a boolean |
| `users/form-state.ts` `users/form-names.ts` | The account closure result type, the submission target's type, and the submission's `name`s |
| `users/results.tsx` | Fetching one page, and assembling the list and pagination |
| `users/view.tsx` | Filtering. Receives the list body |
| `users/ui/withdrawable-list/` | The layer connecting rows, confirmation and result. The only place that knows which ones concern the same person |
| `users/ui/table/` | The user table. Rows of closed accounts show no operations |
| `users/ui/scope-select/` | Re-selecting the target scope. Navigates as soon as it is selected |
| `users/ui/withdraw-dialog/` | The account closure confirmation. States that it is irreversible and that the cleanup does not finish at the same time |
| `users/ui/withdraw-feedback/` | The account closure result. A place that remains after the confirmation closes |
| `users/ui/submit-button/` | Submitting the account closure. Extracted as a child of the form to read `useFormStatus` |
| `users/ui/skeleton/` | The table loading UI |
| `ui/error-state/` | What is shown when fetching fails. Used by the `/admin` error boundary. There is one boundary, so it names no screen |
| `shipments/` | The shipments screen. **Has its own README** ([README](shipments/README.md)) |
| `inquiries/` | The inquiry list and handling. **Has its own README** ([README](inquiries/README.md)) |

**The `feature` declaration applies to what is assembled at the screen level**. `page-content.tsx` / `view.tsx` /
`*-section.tsx` are its subjects, and carry behavior that holds only once the components come together.
**A single component under `ui/` takes the `component` shape** — that one component's rendering contract and the
mandatory automated a11y check — and **pure functions that cross screens (`summary-cards.ts` / `paths.ts` /
`analytics/period.ts` and so on) take the `unit` shape** — no rendering; return values and branches are matched
directly. Imposing composition tests on something with no composition leaves nothing to verify.

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching analytics, products, purchases and users, and resolving image URLs |
| `model` | Display models (`Product` / `Purchase` / `Dashboard`), pagination, periods, number formatting, `ActionState` |
| `components` | The containers screens are built from (tables, pagination, file upload, leave warnings, input summaries) |
| `errors` | Maps fetch and submission failures to the wording the screen shows |
| `observability` | Putting rendering on spans |

**No components are drawn from other features' `facade/`.** The opening line — handling the same subjects as the
user-facing slices without sharing components — shows up in the dependencies as is. Only route identifiers are
drawn: the user-facing screen for viewing one product comes from `products`' `facade/detail-url/`
(`productDetailPath` in `paths.ts`).

## Action Return Contract

**This slice's Server Actions live in the app layer, not under the feature.**

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `uploadProductImageAction` | `src/app/admin/products/actions.ts` | `ProductImageUploadState` | Returns the key of what was uploaded | Shows why it was rejected on the surface where it was selected |
| `createProductAction` | Same as above | `ProductFormState` | `redirect` to the list | Returns per-field errors to their steps |
| `updateProductAction` | Same as above | `ProductFormState` | Same as above | Same as above. A version mismatch is told apart |
| `adjustProductStockAction` | Same as above | `StockFormState` | Same as above | Same as above |
| `withdrawUserAction` | `src/app/admin/users/actions.ts` | `WithdrawUserState` | **Does not make the list refetch** | A conflict is told apart, and shown in a place that remains after the confirmation closes |

**Only account closure does not make the list refetch.** The cleanup continues with eventual consistency, so
refetching right after would only show the list before it is reflected. The submission result reports what
happened.

Screens only receive Actions through props. **The `route` layout shell holds the Actions because an `actions.ts`
placed at the same level as `page.tsx` corresponds one-to-one with the route's entry point**; judgment and
assembly are held on the feature side (`products/parse-product-form.ts` and so on).

## Test Perspectives

- [ ] An actor with no role sees no path to the management surface
- [ ] Conditions that could not be mapped are not discarded; that fact is shown in place of the list
- [ ] A version mismatch (409) is told apart from other failures
- [ ] Rows of closed accounts show no operations

The layer assignment (`feature` / `component` / `unit`) is at the end of Structure.

## Authorization

Every screen here sits under `/admin` and is protected in two stages.

1. **Pre-screening** — `src/proxy.ts` reads only the cookie session and sends back requests whose role falls short
2. **Definitive authorization** — `src/app/admin/layout.tsx` goes through `verifySession()` and checks the role

Which role each path needs is held by [`src/model/authz.ts`](../../model/authz.ts). Both the definitive
authorization and whether the user-facing layout shell shows an entry point to admin call the same `isAdmin()`.
If the judgments were written separately, a state of "an entry point is shown though you cannot get in" could
arise.

**People without the role are shown no path.** Not creating a place to press is the gating itself; refusing on
the far side of the press would tell everyone that a management surface exists.

## Validating Conditions and Failures

Conditions read from the URL are passed on after going through **the validation held by the fetch endpoint**
(`parseProductQuery` in `adapters/server/api/products`). Making a copy such as a numeric conversion on the
screen side leaves only the copying logic on the old range even when the contract is regenerated. Conditions
that could not be mapped are not discarded;
that fact is shown in place of the list.

Fetch failures are taken by `src/app/admin/error.tsx`. Without it they fall through to `global-error`, leaving
a bare screen without the side navigation or the header.

## Points to Watch Against the Contract

**Listing unpublished products is the `includeUnpublished` option.** Only admin can pass `true`;
unauthenticated requests get 401, and an insufficient role 403. **When the population changes, the sort axis
changes too**, so pagination keys are usable only within the same option (`products/list/results.tsx`).

A product's "status" is its stock and sales status (in stock, out of stock, discontinued and so on), and **is a
separate axis from whether it is published**. Publication is held by `publishedAt` and has nothing to do with
whether filtering by the status master applies.

**Discontinuation is a fact held by `discontinuedAt`, not a master label.** The operation that discontinues a
product does not rewrite the master status, so a discontinued product arrives still carrying a label such as
`在庫あり`. The list's status column shows discontinuation before the label (`products/list/row.ts`). The
master's `廃盤` is a display label admin can attach by hand, and is a different thing.

**The low-stock list (`GetProductsLowStock`) is in the contract, but this slice does not use it.** It is a
feature independent of the entry screen's figure cards.

## Related ADRs

**`shipments/` and `inquiries/` hold their own in their own READMEs.** What is listed here is what this slice as
a whole (analytics, products, users and the components they share) depends on.

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. The line for what may be moved up to a kernel
- [0023](../../../docs/adr/0023-stores-kernel.md) — Acceptance criteria for the client state kernel. The line against moving up a single screen's state
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical layout and co-location. Create a directory per screen and divide each by nature
- [0028](../../../docs/adr/0028-naming-convention.md) — Naming conventions. Spellings of form fields and files
- [0029](../../../docs/adr/0029-type-design-discipline.md) — Discriminated unions and parsing at the boundary. No copies of conditions made on the screen
- [0040](../../../docs/adr/0040-routing-rendering-strategy.md) — Rendering strategy. Boundary granularity and how client islands are cut
- [0051](../../../docs/adr/0051-styling-system.md) — Design tokens and switching per band
- [0052](../../../docs/adr/0052-ui-component-policy.md) — UI component policy. Choosing containers and how icons are closed
- [0053](../../../docs/adr/0053-ui-component-interaction-seam.md) — The a11y seam of interaction. The seams for dialogs, sheets and input
- [0060](../../../docs/adr/0060-state-management.md) — Where state lives. Who holds input in progress
- [0062](../../../docs/adr/0062-form-input-validation.md) — Input validation UX. The authoritative judgment lives in the backend
- [0063](../../../docs/adr/0063-mutation-result-notification.md) — How submission results are reported. Notices shown outside the list
- [0070](../../../docs/adr/0070-backend-role-separation.md) — The responsibility line with the backend. The screen does not decide the meaning of aggregates and statuses
- [0073](../../../docs/adr/0073-pagination-fetch-boundary.md) — The pagination / incremental fetch boundary. Conditions live in the URL
- [0079](../../../docs/adr/0079-auth-frontend-seam.md) — The frontend seam of authentication. How gating the paths relates to definitive authorization
- [0080](../../../docs/adr/0080-error-handling.md) — Error handling. Why the management surface has an `error` boundary
- [0090](../../../docs/adr/0090-testing-strategy.md) — Test responsibilities per layer. When to use `feature` / `component` / `unit`
- [0091](../../../docs/adr/0091-test-verification-methods.md) — Verification methods. Automated a11y checks
- [0100](../../../docs/adr/0100-accessibility-target.md) — The accessibility target level. Never distinguish by color alone
- [0101](../../../docs/adr/0101-performance-budget.md) — Performance budget. What goes into the client bundle
- [0120](../../../docs/adr/0120-locale-aware-formatting.md) — Date and number formatting

## The Product Edit Container (Tabs)

The product edit screen uses tabs that switch perspectives as its container. Editing is mainly about fixing one place, so with an ordered wizard as the container, reaching the perspective you want to fix forces you through the other steps. The step contents are the same components as on the create screen; only the container differs.
