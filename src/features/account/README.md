---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # whole-screen stories are the exception
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/account/__mocks__/**"
  - "src/features/account/account.fixture.ts"
---

# account

The screen slice for creating, checking, changing and ending your own registration.

## What Belongs Here

- Orchestrating the fetches of your own information, purchase summaries and the prefecture master
- Server Actions for registration, profile update and account closure (orchestration only)
- The judgment that decides where a protected screen sends you, from the authentication and registration state
- Displays dedicated to these screens (the registration card, the summary table, the registration and edit forms, the account closure confirmation)

## What Does Not Belong Here

- Direct dependencies on another feature
- Displays usable generically (`Card` / `Table` / `AlertDialog` / `Field` and the like come from `components`)
- Authentication itself (restoring and discarding the session is the domain of `adapters/server/auth`)

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `/mypage` | [`screen`](../../../docs/spec/route/shop/mypage/page.screen.md) / [`function`](../../../docs/spec/route/shop/mypage/page.function.md) | Required |
| `/mypage/edit` | [`screen`](../../../docs/spec/route/shop/mypage/edit/page.screen.md) / [`function`](../../../docs/spec/route/shop/mypage/edit/page.function.md) | Required |
| `/onboarding` | [`screen`](../../../docs/spec/route/auth/onboarding/page.screen.md) / [`function`](../../../docs/spec/route/auth/onboarding/page.function.md) | Required (with no registration yet) |

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetUsersMe` | Your own information. The registration check calls the same endpoint |
| `PostUsers` | Registration. Carries an idempotency key |
| `PutUsersDetail` | Profile update |
| `DeleteUsersDetail` | Account closure |
| `GetUsersMePurchasesSummary` | Purchase summary |
| `GetPurchases` | The entries listed in My Page's history dialog |
| `GetPrefectures` | Prefecture candidates. All 47 are returned as a fixed set |
| `GetAddresses` | Address autocomplete from a postal code. Via `/api/addresses` |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| My Page | success | `Page/Account/Mypage/Default` |
| | empty (no purchases) | `Page/Account/Mypage/NoPurchases` |
| | loading | `Features/Account/Mypage/Skeleton/Default` |
| Profile edit | success | `Page/Account/ProfileEdit/Default` |
| | loading | `Features/Account/Edit/Skeleton/Default` |
| | Showing errors | `Features/Account/Edit/ProfileForm/ValidationErrors` |
| | Address filled in | `Features/Account/Edit/ProfileForm/AddressCompleted` |
| | No match | `Features/Account/Edit/ProfileForm/AddressNotFound` |
| Registration | Per step | `Page/Account/Onboarding/{Default,AddressStep,ConfirmStepFilled}` |
| | Showing errors | `Page/Account/Onboarding/ValidationErrors` |
| | Autocomplete mechanism not working | `Page/Account/Onboarding/AddressUnavailable` |

error is taken by the route's `error` boundary (`src/app/(shop)/mypage/error.tsx` and
`src/app/(shop)/mypage/edit/error.tsx`).

## Structure

Create a directory per screen (`mypage` / `edit` / `onboarding`) and divide each by nature. What belongs to no screen sits
directly under the slice, not under a screen. **Registration and editing handle the same nine fields under
the same rules**, so the input fields and validation pieces sit directly under the slice.

| File | Role |
| --- | --- |
| `actions.ts` | Server Actions for registration, profile update and account closure. Hold only validation and classification; `adapters` does the communication |
| `__mocks__/actions.ts` | Replacing the Server Actions in the catalog. Exists only so the pressable operations can succeed |
| `form-state.ts` | The Server Actions' return types. Closes `ActionState<T>` over the screen's field names |
| `paths.ts` | The registration route, and building the destination that prompts registration |
| `facade/paths/` | The My Page and profile edit routes. Checkout points at them, so they go out to `facade/` |
| `registration-gate.ts` | The entry point of protected screens. Turns the authentication and registration state into a destination |
| `field-labels.ts` | Field names shown in input fields and the confirmation. One source for labels and headings |
| `parse-profile-form.ts` | Decodes the submitted `FormData` into a shape that can be passed to registration and update |
| `profile-rejection.ts` | Maps fields the backend rejected by name to wording in the same shape as the pre-submit validation |
| `use-error-visibility.ts` | Decides only when to show errors. Does no validation |
| `use-profile-fields.ts` | Runs validation and assembles one input field's props |
| `use-address-completion.ts` | Looks up an address from a postal code and decides the values to fill |
| `use-address-field.ts` | Applies autocomplete to the form. How blur is wrapped and where values are filled |
| `ui/text-field/` | A single-line input field |
| `ui/prefecture-field/` | The prefecture field. Candidates are static, so a native select presents them |
| `ui/postal-code-field/` | The postal code field. Holds the address search operation inside its frame |
| `ui/submit-button/` | The submit control. Holds how it looks while pressed, as a child of the `form` |
| `mypage/page-content.tsx` | Parallel fetching of your own information and the purchase summary |
| `mypage/view.tsx` | The My Page display. Lays out the two cards to read and, below a divider, account closure |
| `mypage/ui/profile-card/` | The registration display and the path to editing |
| `mypage/ui/purchase-summary-card/` | The purchase summary. Shows the breakdown by status in a table |
| `mypage/ui/purchase-history-dialog/` | The purchase history list. A dialog with local scrolling |
| `mypage/ui/action-row/` | The row of operations at the bottom. Paths to account closure and the site description |
| `mypage/ui/withdraw-button/` | Account closure. A client island holding the confirmation dialog and the submission |
| `mypage/ui/skeleton/` | The My Page loading UI |
| `edit/page-content.tsx` | Side-by-side composition of your own information and the prefecture master (CollectAll) |
| `edit/view.tsx` | The profile edit display. Owns the breadcrumbs |
| `edit/ui/profile-form/` | The arrangement. A client island |
| `edit/ui/skeleton/` | The profile edit loading UI |
| `onboarding/page-content.tsx` | Fetching the prefecture master, and generating the key for this one registration |
| `onboarding/view.tsx` | The registration display. A client island holding the step container and the submission |
| `onboarding/steps.ts` | Which field belongs to which step, and the judgment of whether that step can be completed |
| `onboarding/form-names.ts` | The `name`s of the hidden fields. Holds only spellings; validation is not placed on the reading side |
| `onboarding/parse-registration-form.ts` | Decodes the submitted `FormData` into a shape that can be passed to registration |
| `onboarding/ui/basics-section/` | The name and contact step |
| `onboarding/ui/address-section/` | The address step. Wires up autocomplete from the postal code |
| `onboarding/ui/confirm-section/` | The confirmation step. Holds no input fields and reads back the values to send |
| `onboarding/ui/skeleton/` | The registration loading UI |
| `account.fixture.ts` | Fixed values read by stories and tests |

### How registration and profile editing are divided

Things that change for different reasons are kept apart. Fixing any one of them needs no reading of the others.

| Concern | Owner | Reason to change |
| --- | --- | --- |
| Which values are correct | `model/user/profile-schema.ts` | The contract and business constraints |
| When to show errors | `use-error-visibility.ts` | A revision of the input validation UX rules ([0062](../../../docs/adr/0062-form-input-validation.md) below) |
| Running validation and assembling props | `use-profile-fields.ts` | When this screen's fields increase or decrease |
| Looking up the address | `use-address-completion.ts` | The autocomplete contract, or how it is cut off |
| Applying autocomplete to the form | `use-address-field.ts` | Which fields are filled |
| Decoding the input | `parse-profile-form.ts` | When the submission shape (`FormData`) changes |
| Mapping backend rejections to fields | `profile-rejection.ts` | When the contract's field names diverge from the form's field names |
| Step composition and whether you may proceed | `onboarding/steps.ts` | When the step division changes |
| Orchestrating the submission | `actions.ts` | When the update procedure changes |
| Arrangement | `edit/ui/profile-form/` / `onboarding/ui/*-section/` | Appearance |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching your own information, summaries, history, prefectures and address autocomplete; registration / update / account closure |
| `model` | The display validation schema (`user/profile-schema`), display models, idempotency keys, `ActionState` |
| `components` | The containers screens are built from (cards, tables, input fields, confirmation dialogs) |
| `errors` | Maps the classification of a failed submission to wording |
| `observability` | Putting rendering on spans |

It also draws on other features' `facade/` — login (`auth`), purchase destinations (`purchases`), the site
description (`site-info`).

## Action Return Contract

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `registerAction` | `actions.ts` | `ProfileFormState` | `redirect` to the return destination | Keeps per-field errors on screen |
| `updateProfileAction` | `actions.ts` | `ProfileFormState` | `revalidatePath`. Stays on the screen with a toast | Same as above |
| `withdrawAction` | `actions.ts` | `WithdrawFormState` | Discards the session and goes to the top | Keeps the confirmation open and reports inside it |

**No identifier pointing at the target appears in the return value or the submission.** It is resolved inside `adapters`.

## Test Perspectives

- [ ] The entry point that checks registration too sends an authenticated but unregistered user to registration
- [ ] A field that has focus shows no errors newer than when focus landed
- [ ] A postal code with split candidates does not fill the town area
- [ ] The operation looks different for "no match" and "autocomplete not working"
- [ ] The account closure confirmation stays open while sending and on failure

## Operations

- **Viewing and editing are separate routes**. Folded into one screen, the URL loses which state it was opened
  in, and neither going back nor sharing works
- **Composition is done on the frontend**. The "your own information" and "prefecture master" the edit screen
  needs are independent of each other; laying them side by side suffices. Making the backend do a composition
  with no domain computation in it adds one contract for the screen's convenience
  ([screens.md](../../../docs/spec/screens.md) §1)
- **Identifiers are not passed to the screen**. The internal identifier update and account closure use to point
  at the target is resolved inside `adapters`. Putting it in a hidden form field exposes a value that has no
  reason to be in the browser
- **Prefecture is a `SelectNative`**. The contract returns all 47 as a fixed, static set of candidates, so there
  is no reason to bring in a client island search UI
- **Validation runs on both client and server**. Both use the same display validation schema
  (`model/user/profile-schema.ts`), but the client side exists to answer immediately, and passing it guarantees
  nothing. Validation against the contract is done separately again at the `adapters` boundary
- **A field that has focus gets no new errors**. What is shown is capped at the wording displayed when focus
  landed. Without the cap, deleting a single character while rewriting makes 「入力してください」 ("please
  enter a value") appear. A fix is reflected by removing the error on the spot
- **Address autocomplete does not fill a field with split candidates**. One postal code can point to several
  town areas, and taking the first unconditionally silently inserts an address the user did not choose.
  Street numbers are not part of autocomplete, so the town area is filled only when the chome / street number
  is empty
- **You can proceed even if autocomplete fails**. The contract returns an outage of the external lookup as an
  empty candidate list rather than `503`, and the screen lets the user keep entering manually
- **"No match" and "autocomplete mechanism not working" are told apart**. The former fills once the postal code
  is corrected; the latter never fills however often it is looked up. The contract returns the two separately,
  so in the latter case the search operation is closed and the user is guided to manual entry. Leaving an
  operation that never does anything when pressed makes users doubt their own input and retry again and again
- **That autocomplete happened is announced**. A change in an input field's value alone does not reach a user
  who is not looking there
- **In the catalog, the catalog itself answers autocomplete**. `/api/addresses` is a Route Handler, so it does
  not exist in Storybook, and with nothing to answer only "no match" can appear. The destination is intercepted
  by `.storybook/msw/handlers.ts`; the postal codes that resolve are the following three, and anything else is
  no match

  | Postal code | Candidates returned | What it verifies |
  | --- | --- | --- |
  | `150-0001` | 東京都 / 渋谷区, two town areas | Fields with split candidates (town area) are not filled |
  | `220-0012` | 神奈川県 / 横浜市西区 / みなとみらい | The town area is filled only when the chome / street number is empty |
  | `000-0000` | None (mechanism not working) | The search operation is closed and manual entry is prompted |

- **Saving reports with a toast without leaving the screen; account closure leaves it**. The former is an
  operation that stays in the form's context; the latter has nowhere to stay once it succeeds
- **The account closure wording does not promise immediate effect**. Cancellations and restocking run with
  eventual consistency, so a user who sees the old state right after would suspect a failure
- **The account closure confirmation does not use `AlertDialogAction`**. That component closes the dialog when
  pressed, so both the sending indicator and the failure wording appear where the user is not looking. It
  closes only when the operation succeeds and the screen changes
- **The entry point of protected screens checks registration too**. Authentication and registration are
  separate states; the former is resolved only by logging in, the latter only by registering. The check calls
  `/v1/users/me`, so every screen passing this entry point does that fetch once per request. The fetch is
  collapsed by React's `cache()`, so screens that read your own information see no real increase
- **In registration, you cannot proceed past an unfilled step**. Server Actions apply the same rule, but
  learning on the spot is easier to fix than being told "it is missing" only after a round trip. Error wording
  is shown only for touched fields, while the judgment of whether you may proceed does not look at whether a
  field was touched
- **The idempotency key collapses duplicate registration submissions**. The point that assembled the screen
  makes one key and puts it on the submission, so however many times it is sent from the same screen, the
  user remains one person
- **Only the edit screen has breadcrumbs**. My Page is pointed at directly by the global nav, so breadcrumbs
  there would duplicate the same path

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. Actions hold only validation and classification
- [0026](../../../docs/adr/0026-layout-shell-mount.md) — Mounting the shell and Providers. How the global nav and breadcrumbs share the work
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical layout and co-location. Create a directory per screen and divide each by nature
- [0029](../../../docs/adr/0029-type-design-discipline.md) — Discriminated unions and parsing at the boundary. Registration steps and how input is decoded
- [0053](../../../docs/adr/0053-ui-component-interaction-seam.md) — The a11y seam of interaction. The seam for input fields and confirmation
- [0054](../../../docs/adr/0054-ui-catalog-storybook.md) — Catalog policy. Replacing Server Actions and autocomplete responses
- [0061](../../../docs/adr/0061-form-mutation-ux.md) — The canonical `<form action>` + Server Action mechanism
- [0062](../../../docs/adr/0062-form-input-validation.md) — Input validation UX. When to show errors, and which side holds the authoritative judgment
- [0063](../../../docs/adr/0063-mutation-result-notification.md) — How submission results are reported. Stay with a toast or leave the screen
- [0073](../../../docs/adr/0073-pagination-fetch-boundary.md) — The pagination / incremental fetch boundary. The path used when fetching from the client
- [0079](../../../docs/adr/0079-auth-frontend-seam.md) — The frontend seam of authentication. Where an actor who could not get in is sent
- [0080](../../../docs/adr/0080-error-handling.md) — Error handling. What the `error` boundary takes on, and degradation
- [0101](../../../docs/adr/0101-performance-budget.md) — Performance budget. What goes into the client bundle
