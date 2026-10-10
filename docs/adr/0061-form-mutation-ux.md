# The Canonical Mechanism for Form Submission Flows (`<form action>` + `useActionState` + `useFormStatus`)

This ADR unifies the **submission mechanics** of mutation flows into one. `<form action={serverAction}>` + `useActionState` (result state) + `useFormStatus` (pending) is the default form of the canonical submission flow, and the return-value contract `ActionState<T>` is laid down as "the vessel that input validation UX and result notification UX both rely on". [0060](0060-state-management.md) adopts react-hook-form + zod for form state, but rhf handles client input validation, and **submission itself merges into this ADR's Server Actions mechanism** (one submission mechanism). It provides the foundation of submission mechanics that rides on standards ([0010](0010-standards-and-non-lockin.md)).

## Status

Accepted

## Context

[0060](0060-state-management.md) **adopts react-hook-form + zod** for form state, and [0052](0052-ui-component-policy.md) adopts UI / form components (shadcn family), but what rhf handles is **client input state and validation**; the submission mechanics of "**how to send to the server and return the result**" are a separate layer. Forms, the most frequent UI in a boilerplate, would without conventions have even the skeleton of submission invented per feature (branching into a hand-written fetch inside `onSubmit` / an ad-hoc POST from rhf's `handleSubmit`, etc.), and neither the input validation of [0062](0062-form-input-validation.md) nor the result notification of [0063](0063-mutation-result-notification.md) could be unified without a vessel to ride on.

Submission mechanics are **the common foundation** of input validation and result notification. Both choose based on the return-value contract (`ActionState`), so first the "skeleton from sending until the result returns" needs to be fixed as one. This ADR handles only that skeleton; input validation UX before submission is handled by [0062](0062-form-input-validation.md), and result notification UX after submission by [0063](0063-mutation-result-notification.md). The relationship with rhf is split as "rhf = client input validation / submission = this ADR's `<form action>` + Server Action", without duplicating the submission mechanism.

Following [0010](0010-standards-and-non-lockin.md)'s standards conformance, the submission flow rides on the de facto of React 19 / the App Router (`<form action>` + `useActionState` + `useFormStatus`), and as a decision that rides on a standard, it attaches vendor-independent justification in the body.

## Decision

### 1. The canonical form of the submission flow (riding on the de facto)

- `<form action={serverAction}>` + `useActionState` (result state) + `useFormStatus` (pending) is the **default form** of the submission flow. Server Actions live in `actions.ts` inside a feature and only orchestrate ([0021](0021-frontend-responsibility.md) / [0040](0040-routing-rendering-strategy.md)). `"use client"` is pushed down to the leaves that handle input ([0040](0040-routing-rendering-strategy.md))
- **Vendor-independent justification** ([0010](0010-standards-and-non-lockin.md)): progressive enhancement (the `<form>` submits even with JS disabled) / PRG (Post-Redirect-Get is an established web-platform pattern) / centralizing pending and result state. Operational test = "with React / Next.js taken out of the justification, does a form that makes a server round trip hold as 'a standard HTTP form + progress display + result display'?" → Yes. Hence riding on the de facto without being bound by it

### 2. The return-value contract `ActionState<T>` (the vessel input validation and notification both rely on)

- The return-value contract `ActionState<T>` (field errors / form error / success value) is **a display result type** owned by `model` ([0021](0021-frontend-responsibility.md); the implementation is [`src/model/action-state.ts`](../../src/model/action-state.ts)), and is the vessel that serializes [0080](0080-error-handling.md)'s sentinels across the Server Action boundary and hands them to the client
- **Do not invent a return-value shape per Server Action; follow the common `ActionState<T>` contract**. The field errors that input validation ([0062](0062-form-input-validation.md)) returns, and the notification means that result notification ([0063](0063-mutation-result-notification.md)) chooses, both take this contract as input

### 3. Pending display

- Pending display defaults to `useFormStatus` (disabled / spinner during submit) and is required as part of the submission flow
- The conventions for preventing double submission (submit disabled + idempotency key) and for optimistic updates (`useOptimistic`) are held by [docs/rules.md](../rules.md) and are two sides of the same coin with [0071](0071-bff-api-integration.md)'s POST idempotency. This ADR stops at requiring pending

## Prohibitions

- ❌ Inventing a return-value shape per Server Action (follow the `ActionState<T>` contract, enabling [0062](0062-form-input-validation.md)'s input validation and [0063](0063-mutation-result-notification.md)'s common notification) (Enforcement: Prose — **mechanizable** (a typed lint could check whether the return type of functions exported by a `"use server"` module is `ActionState<T>`; no rule exists))
- ❌ Inventing the submission flow with a mechanism of our own other than `<form action>` + `useActionState` (ride on the standard de facto = [0010](0010-standards-and-non-lockin.md)) (Enforcement: Prose — **partly mechanizable**. Submission by a raw `fetch` from a screen could be rejected with `no-restricted-syntax` rejecting `fetch` calls outside `adapters`, but no rule exists. Whether a form with `onSubmit` is a mutation to the server or a URL / local operation is decided by its use)
- ❌ **Replacing the submission mechanism itself, duplicating it,** with a form state library such as react-hook-form (rhf is used for client input validation, and submission merges into this ADR's `<form action>` + Server Action; consistent with [0060](0060-state-management.md)'s adoption of rhf) (Enforcement: Prose — **not mechanizable**. The shape of calling rhf's API is the same whether submission is merged or replaced, and where it sends is decided by the meaning of the callback's contents)
- ❌ Submission without pending display (`useFormStatus` is required as the default)

## Notes

- This ADR, [0062](0062-form-input-validation.md) and [0063](0063-mutation-result-notification.md) together make up the single UX "from submitting a form until the result returns", but they are split per subject because their subjects (mechanics / input validation / result notification) differ
- Day-to-day detailed rules (the display threshold of the pending spinner, etc.) are held by [docs/rules.md](../rules.md)

## Related ADRs

- [0062-form-input-validation.md](0062-form-input-validation.md) — input validation UX before submission (supplies the field errors of `ActionState`)
- [0063-mutation-result-notification.md](0063-mutation-result-notification.md) — notification UX for mutation results (chooses the notification means with `ActionState` as input)
- [0060-state-management.md](0060-state-management.md) — adopting form state = react-hook-form + zod. rhf = client input validation / submission merges into this ADR's Server Actions mechanism
- [0052-ui-component-policy.md](0052-ui-component-policy.md) — adopting UI / form components (shadcn family). This ADR handles submission mechanics and works paired with the UI components
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — Server Action / POST idempotency (linked with pending and double submission)
- [0080-error-handling.md](0080-error-handling.md) — errors sentinel (the supplier of the errors `ActionState` carries)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `model` (owns `ActionState`) / orchestration in `actions.ts`
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — Server Actions / placement of `actions.ts` / pushing `"use client"` down
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance and non-lock-in (the foundation for justifying that the submission flow rides on the de facto)
