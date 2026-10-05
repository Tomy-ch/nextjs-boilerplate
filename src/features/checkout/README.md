---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # the other feature's facade/ and whole-screen stories are the exception
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/checkout/__mocks__/**"
  - "src/features/checkout/checkout.fixture.ts"
---

# checkout

The screen slice that checks the cart contents, confirms the purchase and reports that it succeeded.

## What Belongs Here

- The check before confirmation (destination, order contents, subtotal) and orchestrating the confirming submission (Server Action)
- Fetching the purchase that succeeded, and showing the receipt and breakdown
- Reading the reference conversion into the display currency (the purchase is not stopped if it cannot be read)
- Issuing the idempotency key that represents one confirmation

## What It Borrows

It does not hold the purchase display itself. The receipt, line items and billing breakdown are borrowed from
[`purchases/facade/`](../purchases/facade/). **What the purchase completion shows is the same purchase as the
purchase detail**; with a different appearance per screen, the two could not be compared as a receipt.

Switching between the amount and the reference conversion is
[`AmountWithReference`](../../components/design-system/display/amount-with-reference/README.md).
Both the purchase confirmation (the cart subtotal) and the purchase completion (the purchase total) use it, and it
carries no subject vocabulary, so it lives in `components`.

## What Does Not Belong Here

- Changing the cart (quantity, deletion and clearing are the domain of `cart`; this screen only holds the path back)
- Editing the destination (registration data is the domain of `account`)
- Computing amounts (the backend decides the subtotal, tax, shipping and total)
- Judging whether something can be bought or whether its price changed (same as above; it only reads the issues that arrive)

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `/checkout` | [`screen`](../../../docs/spec/route/shop/checkout/page.screen.md) / [`function`](../../../docs/spec/route/shop/checkout/page.function.md) | Required |
| `/checkout/complete` | [`screen`](../../../docs/spec/route/shop/checkout/complete/page.screen.md) / [`function`](../../../docs/spec/route/shop/checkout/complete/page.function.md) | Required |

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetCartsMe` | The cart before confirmation. Read once more right before confirming to rebuild the lines |
| `GetUsersMe` | The destination. Uses the registration data as is |
| `GetExchangeRates` | The reference conversion. The purchase is not stopped if it cannot be read |
| `PostPurchases` | Confirming the purchase. Carries an idempotency key |
| `GetPurchasesDetail` | The purchase the completion screen refetches |
| `PutCartsMeItem` | When a price change is acknowledged, re-sets that line at its current quantity |
| `DeleteCartsMeItem` | After success, removes the purchased lines from the cart |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Purchase confirmation | success | `Page/Checkout/Confirm/Default` |
| | empty (no line can be confirmed) | `Page/Checkout/Confirm/Empty` |
| | Cannot proceed (no line can be bought) | `Page/Checkout/Confirm/Blocked` |
| | Some lines are excluded | `Page/Checkout/Confirm/WithExcludedLines` |
| | The reference conversion could not be read | `Page/Checkout/Confirm/WithoutReference` |
| | loading | `Features/Checkout/Confirm/Skeleton/PC` |
| | Checking a price change | `Features/Checkout/Confirm/PriceChangeConfirm/Default` |
| Purchase completion | success | `Page/Checkout/Complete/Default` |
| | The reference conversion could not be read | `Page/Checkout/Complete/WithoutReference` |

error is taken by the route's `error` boundary (`src/app/(shop)/checkout/error.tsx`). When the completion screen
cannot read what it points at, it is `not-found.tsx`.

## Structure

Create a directory per screen (`confirm` / `complete`) and divide each by nature.
What belongs to neither screen sits directly under the slice, not under a screen.

| File | Role |
| --- | --- |
| `actions.ts` | The purchase confirmation Server Action. Holds only orchestration and classification; `adapters` does the communication |
| `__mocks__/actions.ts` | Replacing the Server Action in the catalog |
| `form-state.ts` | The confirmation's return type. Closes `ActionState<T>` in this screen's shape |
| `form-fields.ts` | The name of the form field carrying the signal that a price change was acknowledged |
| `order.ts` | Extracting the lines to put on the purchase, and judging which lines changed price |
| `checkout.fixture.ts` | A fixed cart and purchase read by stories and tests |
| `paths.ts` | The completion screen's location, and the search conditions put on it |
| `facade/paths/` | The checkout entry point. The cart draws on it as its destination |
| `confirm/page-content.tsx` | Parallel fetching of the cart and registration data, adding the reference conversion |
| `confirm/view.tsx` | The purchase confirmation display. Splits contents and summary left and right |
| `confirm/ui/shipping-card/` | Checking the destination, and the path to change it in the registration data |
| `confirm/ui/order-lines/` | Restating what will be confirmed, and the path back to the cart |
| `confirm/ui/order-line-row/` | One restated line. The issue display is borrowed from `cart`'s [`facade/line-issues/`](../cart/facade/line-issues/) |
| `confirm/ui/order-summary/` | Subtotal, notes and the confirming operation. The caller decides the container |
| `confirm/ui/place-order-form/` | The confirming submission. The form that sends as is |
| `confirm/ui/price-change-confirm/` | The form that checks before sending when a price changed |
| `confirm/ui/place-order-submit/` | The submit part and the failure display. Shared by the two forms |
| `confirm/ui/place-order-state/` | The container that holds the confirmation's submission state once on the screen and distributes it to the two forms |
| `confirm/ui/skeleton/` | The purchase confirmation loading UI |
| `complete/page-content.tsx` | Fetching the purchase that succeeded. `not-found` if what it points at cannot be read |
| `complete/purchase-code.ts` | Reads the purchase the completion screen shows from the search conditions |
| `complete/view.tsx` | The purchase completion display. Receipt, breakdown, line items and the next paths |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching the cart, registration data and reference conversion, and confirming the purchase |
| `model` | Display models (`Cart` / `Purchase` / `User`), idempotency keys, `ActionState` |
| `components` | The containers screens are built from (cards, confirmation dialogs, the operation band, loading UI, amount switching) |
| `errors` | Maps a confirmation failure to the classification the screen shows |
| `logging` | A record when the cleanup (removing from the cart) fails. The completion keeps being shown |
| `observability` | Putting rendering on spans |

It also draws on other features' `facade/` — the purchase display (`purchases`) and the wording of issues raised
on lines (`cart`). Why they are borrowed is under What It Borrows. The destinations leaving this screen (cart,
destination editing, product list, purchase detail) are likewise drawn from the routes the owners' `facade/`
(`cart` / `account` / `products` / `purchases`) export.

## Action Return Contract

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `placeOrderAction` | `actions.ts` | `PlaceOrderFormState` | `redirect` to the completion screen. Removes the purchased lines from the cart | Shows the classification next to the confirming operation |

How idempotency keys and submissions without the acknowledgment signal are handled is under Design Decisions.

## Test Perspectives

- [ ] Confirmation rebuilds the lines from the cart at that moment, not from what the screen was showing
- [ ] The Action stops a submission without the acknowledgment signal
- [ ] The completion is shown even if the cleanup (removing from the cart) fails
- [ ] Confirmation works even when the reference conversion cannot be read
- [ ] There is one idempotency key per assembly of the screen

## Design Decisions

**Only lines that cannot be bought are excluded.** Lines whose price merely changed are put on the purchase.
Excluding them would silently drop what the user meant to buy. However, **that a price changed is checked at the
confirming operation** — it asks "may the purchase proceed as is", and only submissions carrying the
acknowledgment signal go through. A submission without the signal is also stopped on the Server Action side
(because there are calls that do not go through the screen).

**Acknowledgment is conveyed by re-setting that line at its current quantity.** Setting replaces the previously
presented price with the current one, so on the next fetch the issue disappears and the line is included in the
subtotal. The subtotal sums only lines without issues, so on the screen before the check, the lines whose price
changed are not in it. A note says so.

**The confirming submission rebuilds the lines from the cart at that moment.** Sending back what the screen was
showing would allow confirming on stale assumptions even if stock or prices changed while the screen was left
open.

**One idempotency key is made per assembly of the screen.** Pressing twice or resending via a reload still leaves
one purchase, and reopening the screen with the intent to buy again gives a different key.

**On success, the user is sent to a different URL.** Showing the completion on the same screen would make a
reload erase the completion and the back operation return to the pre-confirmation screen. The completion screen
refetches the purchase to render it, so sharing it or reloading shows the same contents.

**The frontend removes the purchased lines from the cart after success.** A purchase does not empty the cart.
Even if removal fails, the completion is shown. The purchase has already succeeded, and hiding the completion
because the cleanup failed would make it look as if the purchase had failed.

**The purchase continues even if the reference conversion cannot be read.** What is billed is the amount in the
base currency; the conversion is an accessory that helps the reader grasp the magnitude.

**The reference conversion waits within the same `Suspense` boundary as the lines.** The conversion is looked up
after the subtotal is settled, so it arrives later, but whether it arrived makes a switch appear or not below the
subtotal, which moves the confirming operation beneath it
([`docs/rules.md`](../../../docs/rules.md#ui-parts)). The added wait is capped by the HTTP client's retry budget
and circuit breaker. **If the order is changed so that the switch sits after the confirming operation, the
conversion alone can be split into an inner boundary.**

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. `cart` / `purchases` are touched only through their `facade/`
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical layout and co-location. Create a directory per screen and divide each by nature
- [0040](../../../docs/adr/0040-routing-rendering-strategy.md) — Rendering strategy. Where to place fetch boundaries
- [0053](../../../docs/adr/0053-ui-component-interaction-seam.md) — The a11y seam of interaction. The seam between confirmation and submission
- [0054](../../../docs/adr/0054-ui-catalog-storybook.md) — Catalog policy. Replacing Server Actions
- [0063](../../../docs/adr/0063-mutation-result-notification.md) — How submission results are reported. The success notice and where to return
- [0070](../../../docs/adr/0070-backend-role-separation.md) — The responsibility line with the backend. The screen does not decide amounts or success
- [0080](../../../docs/adr/0080-error-handling.md) — Error handling. What the `error` boundary takes on, and partial errors
- [0100](../../../docs/adr/0100-accessibility-target.md) — The accessibility target level. Never distinguish by color alone
