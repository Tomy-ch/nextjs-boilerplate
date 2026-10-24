---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features]
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/coupons/__mocks__/**"
  - "src/features/coupons/coupons.fixture.ts"
---

# coupons

The screen slice where the user checks the coupons they hold, each with its status, and claims one with a campaign code. The two
share one screen because the only proof of a claim is one more row in the list.

## What Belongs Here

- Deciding a held coupon's status (unused / used / expired / not yet usable) from its three times and "now"
- The claim: validating the input, sending it with an idempotency key, and mapping the result to the screen
- Laying out the list rows: which time is worth showing for which status

## What Does Not Belong Here

- Whether a coupon can be used with the current cart, and the discount it would give (the purchase procedure asks the contract for that; this slice never computes it)
- The reason a code cannot be claimed (the contract does not distinguish them, and this slice does not guess)
- The discount's wording (face value, cap, scope) — `model/coupon`
- Defining and suspending campaigns (owned by `admin`)

## Routes and Contracts

| Route | Spec | Authentication |
| --- | --- | --- |
| `/mypage/coupons` | [`screen`](../../../docs/spec/route/shop/mypage/coupons/page.screen.md) / [`function`](../../../docs/spec/route/shop/mypage/coupons/page.function.md) | Required |

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetUsersMeCoupons` | The coupons held, newest issued first. Used and expired ones are included |
| `PostCampaignsClaims` | Claims one coupon with a campaign code. Carries an idempotency key |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Coupons | success (all four statuses) | `Page/Coupons/Wallet/Default` |
| | empty | `Page/Coupons/Wallet/Empty` |
| | tiers | `Page/Coupons/Wallet/{Tablet,Mobile}` |
| | loading | `Features/Coupons/Wallet/Skeleton/Default` |
| Claim field | idle / submitted empty / claimed / pending | `Features/Coupons/Wallet/ClaimForm/{Default,EmptySubmitted,Claimed,Pending}` |
| | code rejected (`422`) | `Features/Coupons/Wallet/ClaimForm/Rejected` |
| | conflict (`409`) / unavailable, both holding the code until the outcome is known / unreadable request | `Features/Coupons/Wallet/ClaimForm/{InProgress,Unavailable,Malformed}` |
| | narrow tier | `Features/Coupons/Wallet/ClaimForm/Mobile` |
| Coupon list | all statuses / empty / long values / narrow tier | `Features/Coupons/Wallet/CouponList/{AllStates,Empty,LongValues,Mobile}` |
| Submit button | enabled | `Features/Coupons/Wallet/SubmitButton/Default` |

**The screen has no error state of its own.** A claim failure is shown beside the claim field, and a fetch failure is caught by the
route's `error` boundary (`src/app/(shop)/mypage/coupons/error.tsx`).

## Structure

| File | Role |
| --- | --- |
| `actions.ts` | The Server Action for claiming |
| `form-names.ts` | The name of the field a claim carries. **Holds no validation** — the input needs only the spelling |
| `form-state.ts` | The Server Action's return type |
| `parse-claim-form.ts` | Extracts the code and the idempotency key from the submitted content |
| `holding-status.ts` | Decides a held coupon's status at a given time, and its name |
| `facade/paths/` | The route this feature owns. **The entry My Page points at** |
| `wallet/page-content.tsx` | Fetches the held coupons and assembles the screen |
| `wallet/view.tsx` | The screen. Owns the breadcrumbs, and places the claim field above the list |
| `wallet/ui/claim-form/` | The claim field. A client island holding the input and the idempotency key |
| `wallet/ui/submit-button/` | The claim control. Reads the sending state as a child of the `form` |
| `wallet/ui/coupon-list/` | The held coupons with their status. Rows are for reading and are not pressable |
| `wallet/ui/skeleton/` | Loading UI. Keeps the claim field's place so it does not move when the list arrives |
| `coupons.fixture.ts` | Fixed held coupons read by stories and tests |
| `__mocks__/actions.ts` | Replaces the Server Action in the catalog |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching the held coupons (`server/api/coupons`) and claiming (`server/api/campaigns`) |
| `model` | The display type (`coupon/HeldCoupon`), the discount's wording, dates and money, `ActionState`, idempotency keys |
| `components` | The list, the status marker, the input field, the breadcrumbs and the feedback containers |
| `errors` | Classifying a failed claim |
| `observability` | Puts rendering on spans |

It also draws on other features' `facade/` — login (`auth`), and the My Page route (`account`) for the breadcrumbs.

## Action Return Contract

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `claimCouponAction` | `actions.ts` | `ActionState<void, "code">` | `refresh()`. Stays on the screen with a toast | A field message for an empty or rejected code (one wording, whatever the reason), or a message beside the form. If authentication has expired, `redirect` to login with this screen as the return destination |

**An idempotency key is always attached, and it is renewed once a response settles the claim.** A claim cannot be undone, and one
sent again under another key yields another coupon. The contract's `409` answers a claim still being processed under the same key, so
the form declares that meaning to `useSubmissionKey`. After a `409`, an unavailable service or a network failure the same key is sent
again, so a claim that went through whose response was lost is not claimed twice. After a success, a rejected code (`422`) or an
unreadable request (`400`) the next claim carries a new key. While the outcome is open the field is `readOnly` and says why, so the
resend carries the code that was sent.

## Test Perspectives

- [ ] Each row tells unused / used / expired / not yet usable apart, including the exact moments `usableFrom` and `expiresAt` are reached
- [ ] When several statuses hold at once, the one that can no longer change wins (used, then expired, then not yet usable)
- [ ] A rejected code (`422`) shows one wording, whatever the reason behind it
- [ ] Sending again after a conflict, an unavailable service or a lost response carries the same idempotency key; after a success, a rejected code or an unreadable request, the key changes
- [ ] While the outcome of a claim is open, the code cannot be edited and the field says why
- [ ] A success clears the input and reports it in a toast; a failure keeps the input

## Operations

- **"Now" is read by the route and passed down.** The status is decided against it, so reading the clock inside this slice would make it
  impossible to fix in verification
- **The status says nothing about the cart.** 「未使用」 means the coupon itself is unused, not that the current cart can use it; the
  purchase procedure answers the latter with its own contract
- **The code is sent as typed.** Whitespace and letter case are ignored by the contract, so normalizing here would be a second copy of a
  rule the backend owns. Only an empty code is stopped, because it is always rejected — on pressing, with a message beside the field, never by disabling the button
- **A lost response is not recovered by a mechanism.** When a claim's response never arrived, the user checks the list before claiming
  again; the list is the only place a claim leaves a trace

## Related ADRs

- [0061](../../../docs/adr/0061-form-mutation-ux.md) — Claiming is a Server Action round trip
- [0062](../../../docs/adr/0062-form-input-validation.md) — Where input validation is held
- [0063](../../../docs/adr/0063-mutation-result-notification.md) — A success that stays on the screen is reported in a toast
- [0080](../../../docs/adr/0080-error-handling.md) — The route boundary receives a fetch failure
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical placement and co-location
