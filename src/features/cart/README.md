---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # whole-screen stories are the exception
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/cart/__mocks__/**"
  - "src/features/cart/cart.fixture.ts"
  - "src/features/cart/facade/add-to-cart/__mocks__/**"
---

# cart

The screen slice that carries the selected products along and keeps them viewable at any time.

## What Belongs Here

- Orchestrating cart fetches and changes (fetching in Server Components, changes in Server Actions)
- The cart display (the side region on PC, the overlay region on tablet and phone, the header entry point and item count, the full screen, the per-line operations)
- How the issues raised on a line are worded (cannot be bought / price changed)

## What Does Not Belong Here

- The cart contents themselves (the backend holds them)
- Judging whether something can be bought, whether its price changed, and quantity limits (business logic, and the backend's domain)
- Fetching products and showing product detail (the domain of `products`; features do not reference each other directly)

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `/cart` | [`screen`](../../../docs/spec/route/shop/cart/page.screen.md) / [`function`](../../../docs/spec/route/shop/cart/page.function.md) | Not required (usable as a guest) |

**This slice also appears outside its route.** The header entry point, the sidebar and the overlay region are
mounted by `(shop)/layout.tsx`, and the outer frame's promises are held by
[the `(shop)` layout](../../../docs/spec/route/shop/layout.function.md).

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetCartsMe` | Fetching the cart. Arrives with each line re-evaluated |
| `PutCartsMeItem` | Setting a quantity. Not an addition, so a duplicate submission does not change the result |
| `DeleteCartsMeItem` | Deleting one line |
| `DeleteCartsMe` | Clearing everything |

`PostCartsMeMerge` (carrying over the guest cart) is not called by this slice. **It happens inside the login
round trip**, and `/api/auth/callback` calls it.

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Cart | success | `Page/Cart/PC` |
| | empty | `Page/Cart/Empty` |
| | Some lines have issues | `Page/Cart/WithIssues` |
| | No line can be bought | `Page/Cart/WithoutPurchasable` |
| Sidebar | With contents / empty / closed | `Features/Cart/Panel/{WithLines,Empty,Closed}` |
| Header entry point | Form per band | `Features/Cart/HeaderAction/{PC,Tablet,Mobile}` |
| Loading UI | loading | `Features/Cart/Skeleton` |

**There is only one loading on the screen.** How it is placed is the first item under Operations. **There is no
error as a screen either**; an operation's failure appears next to that operation (`ui/action-error/`). A fetch
failure is taken by the route's `error` boundary (`src/app/(shop)/cart/error.tsx`).

## Structure

There is one screen, so the screen directory is omitted and only the display is split out into `ui/`.

| File | Role |
| --- | --- |
| `page-content.tsx` | Fetching and assembling the cart |
| `view.tsx` | The full-screen display. Splits lines and the summary left and right |
| `actions.ts` | Server Actions for setting quantities, deleting lines and clearing everything |
| `__mocks__/actions.ts` | Replacing the Server Actions in the catalog |
| `checkout.ts` | The judgment of whether checkout can proceed |
| `line-order.ts` | The order in which lines are rendered. Matches the remembered order against the lines present now |
| `parse-cart-form.ts` | Extracts the product and quantity from the submitted content |
| `removal-memory.tsx` | Memory of removed lines and of the order the screen was showing |
| `use-dock-visibility.ts` | The judgment of whether to show the container that rises from the bottom of the screen |
| `shell-cart.ts` | Fetching the cart shown in the outer frame. Does not throw even when it cannot be read |
| `ui/shell-slots/` | The cart shown in the outer frame's header and side. Confines fetching inside the dynamic hole |
| `ui/skeleton/` | The cart loading UI. Same column layout as the real thing, showing as many frames as fit in one screen |
| `cart.fixture.ts` | A fixed cart read by stories and tests |
| `facade/paths/` | The routes this feature owns. Checkout confirmation draws on them for the path back to the cart |
| `facade/add-to-cart/` | The operation that puts a product in the cart. **The endpoint other features use** |
| `facade/add-to-cart/__mocks__/` | Replacing that endpoint in the catalog |
| `facade/line-issues/` | Displaying the issues raised on a line. **The endpoint that lets checkout confirmation show them with the same weight and wording** |
| `ui/contents/` | The cart contents (subtotal, paths, lines). Holds no container; the caller decides where it goes |
| `ui/panel/` | The region that shows the contents at the side. Renders nothing when empty or closed. PC only |
| `ui/header-action/` | The entry point placed in the header. Decides which form to show per band |
| `ui/header-toggle/` | The entry point for widths that can keep a permanent side region. Opens and closes the sidebar |
| `ui/header-drawer/` | The entry point and contents for widths that cannot keep a permanent side region. Overlays the body |
| `ui/count/` | The item count shown in the header |
| `ui/line-list/` | The container that lists lines and inserts an undo where a removed row used to be |
| `ui/line-row/` | One line. Used by both the sidebar and the full screen |
| `ui/checkout-link/` | The operation that proceeds to checkout. Cannot be pressed when proceeding is not possible |
| `ui/summary-card/` | Subtotal, notes and the path onward. Holds no container |
| `ui/subtotal/` | Displaying the subtotal |
| `ui/dock-handle/` | The handle of the container that rises from the bottom of the screen |
| `ui/summary-dock/` | A drawer that brings the summary up from the bottom of the screen. Only for widths that cannot place a side region |
| `ui/removal-notice/` | Displaying the guidance for restoring a removed line |
| `ui/quantity-stepper/` | Increasing and decreasing one line's quantity |
| `ui/match-stock-button/` | Adjusts a line with insufficient stock to the quantity that can be bought now |
| `ui/remove-button/` | Deleting one line |
| `ui/clear-button/` | Emptying the cart. With a confirmation step |
| `ui/action-error/` | Shows that an operation failed, next to that operation |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching and changing the cart, resolving representative images to display URLs |
| `model` | Display models (`Cart` / `Product`), `cart/issue-notice` that maps an issue to one sentence, `ActionState` |
| `components` | The containers screens are built from (drawer, scroll region, confirmation dialog, images) |
| `capabilities` | Band detection (`use-media-query`) and the direction in which to show the drawer (`use-scroll-direction`) |
| `stores` | Whether the contents are open. **The operation that opens it lives in another feature, so it becomes client-wide** |
| `logging` | A record when the outer frame's cart cannot be read. Leaves only a record without throwing |
| `observability` | Putting rendering on spans |

It also draws on other features' `facade/` — the checkout entry point (`checkout`) and the destination for
going back to look for products (`products`). Both are route identifiers their owners export.

## Action Return Contract

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `setCartItemQuantityAction` | `actions.ts` | `CartActionState` | `revalidatePath` | Shown next to that operation |
| `removeCartItemAction` | `actions.ts` | `CartActionState` | Same as above. The undo guidance goes where the vanished row was | Same as above |
| `clearCartAction` | `actions.ts` | `CartActionState` | Same as above | Same as above |
| `addToCartAction` | `facade/add-to-cart/` | `ActionState<void>` | Same as above. Opens the contents | Same as above |

**Only `addToCartAction` lives elsewhere.** Other features call it, and a facade section cannot reference the
feature's internals (`features-facade` in `architecture.ts`), so the Action is also placed inside the section.

**None carries an idempotency key.** Quantity is set rather than added, and both deletion and clearing produce the
same result if delivered twice.

## Test Perspectives

- [ ] Quantity is sent as a setting, not an addition
- [ ] The undo guidance appears where the vanished row was (resolved by the order shown, not by index)
- [ ] Removing several in a row lines up that many guidance entries, and an earlier one is not replaced
- [ ] When no line can be bought, the path to checkout cannot be pressed
- [ ] Even if the outer frame's cart cannot be read, screens unrelated to the cart do not fail

## Operations

- **The screen has exactly one loading UI.** The heading stays in the static shell and only the contents drop
  into the dynamic hole. The outer frame (`app/(shop)/layout.tsx`) reads the same cart too, but the fetch is
  memoized within one request (`adapters/server/api/cart.ts`), so round trips do not increase. **Splitting things
  that arrive together into further separate `<Suspense>` boundaries makes the screen append twice and shifts the
  position the reader started at**.
  The number of lines is unknown until fetched, so the frames are kept to what fits in one screen, and it never
  looks fuller than it is (`ui/skeleton`)

- **The backend holds the contents**. Server Components fetch them and pass them to the client container through
  props. Putting a copy in `stores` would create freshness management on the client side as well
- **Changes are `<form action>` + Server Action**. Quantity is set rather than added, and the same request
  delivered twice produces the same result, so no key against duplicate submission is needed
- **It holds no judgment of whether something can be bought or whether its price changed**. On every fetch the
  backend re-evaluates each line and the results arrive as `issues`. This feature decides only the wording and
  the presentation
- **The backend also returns the subtotal**. Only lines without issues are summed; even lines whose price merely
  changed are excluded. No per-line subtotal is shown. Showing one would mean multiplying unit price by quantity,
  bringing price computation back to the frontend
- **Thumbnails are shown as decoration**. Their alternative text is empty, and the path to the detail is carried
  by the name only. The adjacent text already carries the same product name; giving the image a name or a path
  too would read the same name twice in a row and put two paths to the same destination on one line. A line
  without an image falls back to a substitute image. **Products are not refetched per line** — the contract puts
  the representative image's object key on the line, and `adapters` resolves it to a display URL (because that is
  as far as the configuration can be read)
- **Product status is not shown**. It is not on the lines the contract returns, and showing it would mean
  fetching a product per line
- **There is no operation that decreases a quantity from 1**. A quantity of 0 is outside the contract's range,
  and removing a row is the delete operation's job. One operation does not carry two meanings
- **Only emptying the cart has a confirmation step**. Deleting one line is covered by offering an undo; clearing
  everything gets a confirmation because restoring it means remembering which products to re-add. The cost of a
  mistaken press grows with the number of lines
- **The undo memory lives outside the rows**. A removed row vanishes at that moment, so holding it inside the row
  would make the guidance disappear with it. It lives in `(shop)/layout.tsx`, and survives even when removing the
  last item turns the cart into its empty form. Whether to show it is derived from "is that product still in the
  cart", and it does not receive a withdrawal signal from the operation side
- **The undo appears in the same place as the vanished row**. If the place pressed and the place the guidance
  appears differ, the user has to trace again by eye which row vanished
- **The place is held by the order the screen was showing, not by index**. An index changes what it points at
  every time other rows are added or removed, and drifts when removing several in a row. **The order is
  information the server does not hold**; rather than rebuilding the previous form from the server's response,
  the side that showed it remembers it as is
- **Removing several in a row lines up that many entries**. Replacing an earlier guidance with a later deletion
  loses the way to restore just the earlier one. When the same product is removed again, its quantity has
  changed, so the old record is discarded
- **The summary changes place with width**. At widths that can hold a side region it sticks beside the body; at
  widths that cannot, it becomes a drawer that rises from the bottom of the screen. The drawer shows only while
  reading downward, and the handle opens it at any time. The contents are held once, in `ui/summary-card/`, and
  the caller absorbs the difference in container
- **It is mounted in `(shop)/layout.tsx`**. It must appear in the same place whichever screen adds to it, so it
  is not placed per screen
- **Where the contents go changes by band**. On PC they appear at the side; on tablet and phone they overlay the
  body ([`docs/rules.md`](../../../docs/rules.md#layout)). Stacking them below the body would let the inner
  scroll steal the outer scroll, leaving no way back to the body. The contents are held once, in `ui/contents/`,
  and the container side absorbs the difference in placement
- **`stores` holds whether it is open**. Right after adding to the cart it must be in the open state, and that
  operation lives in another feature. Holding open/closed on the container side would create a band where adding
  does nothing
- **Whether it is open is one and the same request regardless of band**. On PC the sidebar appears or disappears;
  below that the drawer opens or closes; the meaning is the single "I want to see the contents". It can be closed
  on PC too because the sidebar takes around 280px from the body; without closing, a user who once added to the
  cart would keep reading the body narrowed. The entry point to reopen it is in the header
- **The only endpoint exposed to other features is `facade/`**. "Add to cart" on the product side is a change to
  the cart, and this feature owns the operation. Features do not reference each other directly, so it is
  published as a section. **A section cannot reference the feature's internals** (`features-facade` in
  `architecture.ts`; if it could, internals would pass straight through the surface to the outside), so this
  operation's Server Action is placed inside the section rather than in `actions.ts`
- **The cart shown in the outer frame does not throw even when it cannot be read** (`shell-cart.ts`). The outer
  frame appears on every screen beneath it, so throwing here would bring down screens unrelated to the cart. An
  exception thrown by a layout at the same level is not caught by the child's `error` boundary
- **Two onward paths are placed**. The primary is 「購入手続きへ」 ("proceed to checkout"; U5 purchase
  confirmation), the secondary 「カートを見る」 ("view cart"; U4 cart page). This follows the standard pattern of
  implementations with a drawer. **The secondary is not dropped** because U5 is inside authentication, and U4 is
  the only path by which a logged-out user can check the cart contents on a full screen. This container is only
  about 280px wide, and changing quantities and deleting become hard here as lines increase
- **When no line can be bought, checkout cannot be entered**. Showing why you cannot proceed next to the lines is
  closer to the user's next action than telling them 「買えるものがない」 ("nothing can be bought") after they
  proceed

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. The operation endpoints lent to other features go out through `facade/`
- [0023](../../../docs/adr/0023-stores-kernel.md) — Acceptance criteria for the client state kernel. The line against putting copies in `stores`
- [0026](../../../docs/adr/0026-layout-shell-mount.md) — Mounting the shell and Providers. A mount that appears in the same place from every screen
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical layout and co-location. With one screen, the screen directory is omitted
- [0029](../../../docs/adr/0029-type-design-discipline.md) — Discriminated unions and parsing at the boundary. How submitted content is decoded
- [0040](../../../docs/adr/0040-routing-rendering-strategy.md) — Rendering strategy. `<Suspense>` boundaries placed per unit of what is awaited
- [0041](../../../docs/adr/0041-cache-components-decision.md) — Whether to use Cache Components (PPR). The conditions for keeping a static shell
- [0053](../../../docs/adr/0053-ui-component-interaction-seam.md) — The a11y seam of interaction. The seams for the drawer, handle and undo
- [0054](../../../docs/adr/0054-ui-catalog-storybook.md) — Catalog policy. Replacing Server Actions
- [0060](../../../docs/adr/0060-state-management.md) — Where state lives. The server / client line
- [0061](../../../docs/adr/0061-form-mutation-ux.md) — The canonical `<form action>` + Server Action mechanism
- [0063](../../../docs/adr/0063-mutation-result-notification.md) — How submission results are reported. When to use inline / toast / redirect
- [0070](../../../docs/adr/0070-backend-role-separation.md) — The responsibility line with the backend. The screen does not decide prices or eligibility
- [0079](../../../docs/adr/0079-auth-frontend-seam.md) — The frontend seam of authentication. Where carrying over the guest cart happens
- [0080](../../../docs/adr/0080-error-handling.md) — Error handling. Do not throw in the outer frame; do not bring the whole down for a partial error
- [0091](../../../docs/adr/0091-test-verification-methods.md) — Verification methods. Where async RSC lives
- [0100](../../../docs/adr/0100-accessibility-target.md) — The accessibility target level
- [0101](../../../docs/adr/0101-performance-budget.md) — Performance budget. What goes into the client bundle
- [0120](../../../docs/adr/0120-locale-aware-formatting.md) — Date and number formatting
