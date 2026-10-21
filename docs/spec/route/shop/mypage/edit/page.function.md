# `/mypage/edit` Edit Profile (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Fetching (CollectAll)

"The user's own information" and "the prefecture master" are composed side by side with `Promise.all` within the RSC.

```text
GET /v1/users/me    ┐
                    ├─ only placed side by side (no domain computation in between)
GET /v1/prefectures ┘
```

**The composition is not moved to the backend.** Neither result is a fetch condition for the other, and no computation is needed,
so lining them up on the frontend is enough. Moving it would add one contract for the screen's convenience
(the criterion for placing a line-them-up composition on the frontend is [screens.md, "Choosing a Composition Pattern (Implementation Guidance)"](../../../../screens.md#choosing-a-composition-pattern-implementation-guidance)).

The prefectures are static options for which the contract always returns all 47.

## Validation

The same display validation schema (`model/user/profile-schema.ts`, hand-written) is applied on both the client and the server.
The client side is for immediate feedback, and **passing it is no guarantee**. Validation against the contract is done separately by
the `adapters` boundary with the generated schema.

Required / optional is **derived from the validation schema** (`isRequiredProfileField()`). Enumerating it would allow a state where the rule was relaxed but
the screen still marks the field required. Only the building name is optional.

## Address Autocomplete

It runs when focus leaves the postal code and when `[住所を検索]` ("Search address") is pressed.

```text
Input field → /api/addresses (Route Handler) → adapters/server → GET /v1/addresses
```

- **Fields whose candidates split are not filled.** One postal code can point to several town areas, and taking the first unconditionally
  would silently fill in an address the user did not choose
- **The town area is filled only when the block / street number is empty.** The street number is not part of the completion, so overwriting would
  erase the street number the user wrote
- **It can proceed even when the lookup finds nothing.** The contract returns an external lookup failure as empty candidates rather than `503`, so
  the screen treats it the same as "not found" and lets the user continue entering by hand
- **The same postal code is not looked up twice.** Merely passing through the field without changing the value would issue a request. However,
  **when called by an operation, it looks up again** — an operation that does nothing when pressed is read as broken

## Submission

`<form action>` + `useActionState` + `useFormStatus` ([0061](../../../../../adr/0061-form-mutation-ux.md)).
Validation during input does not replace the submission mechanism. Even where JavaScript does not run, the form submits as is, and
the server side validates with the same schema.

**The identifier of the update target is not passed to the screen.** It is resolved inside `adapters`. Putting it in a hidden form field
would expose a value that has no reason to be in the browser.

On success, the Server Action requests revalidation so that the new content appears the next time my page is opened.

## Authorization

Same as my page ([`../page.function.md`](../page.function.md#authorization)). An unauthenticated actor is sent to login, and
an unregistered actor to registration (`/onboarding`), both with an instruction to return to this screen.
