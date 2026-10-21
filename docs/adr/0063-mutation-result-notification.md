# Notification UX for Mutation Results (Inline / Toast / Redirect, Live Regions)

This ADR unifies the **result notification UX** of mutating operations into one. It defines the convention for choosing whether an operation's result is shown **inline / as a toast / as redirect + message** by "**whether it stays in the form context or leaves it**", and **live region a11y** for conveying asynchronous state changes to assistive technology (the authority on the target level is [0100](0100-accessibility-target.md)). It is the layer that chooses the notification means with the submission mechanics' ([0061](0061-form-mutation-ux.md)) `ActionState` contract as input.

## Status

Accepted

## Context

[0052](0052-ui-component-policy.md) adopts UI / form components (shadcn family), but even with the components at hand, the convention of "**by which means (inline / toast / redirect) to show an operation's result**" is needed separately. Left blank, the means of notifying success / failure would vary per feature, and both implementers and users would lose a consistent UX.

The areas adjacent to result notification are split into [0080](0080-error-handling.md) (error normalization) / [0052](0052-ui-component-policy.md) (UI) / [0100](0100-accessibility-target.md) (a11y). Result notification is the layer that takes the `ActionState` returned by the submission mechanics ([0061](0061-form-mutation-ux.md)) as input and chooses the means by "is the result one that stays in the form context or one that leaves it". This ADR lays down the convention for that choice and the live region a11y requirement, and delegates the a11y target level to [0100](0100-accessibility-target.md).

## Decision

### 1. Choosing the notification means (does it stay in the form context or leave it)

The notification means is chosen by the return-value contract (`ActionState`; [0061](0061-form-mutation-ux.md)) and "**whether it stays in the form context or leaves it**":

| Means | Use | Supplier |
| --- | --- | --- |
| **Inline** (near the field / form) | Input validation errors and form-specific errors. The default for results that stay in the form context | fieldErrors / formError of `ActionState` (normalized sentinels; [0080](0080-error-handling.md)) |
| **Toast** | Ephemeral operation results that have left the form context (a save success without navigation, etc.) | The success value of `ActionState` |
| **Redirect + message** | Results that navigate to another screen after success (PRG) | The Server Action's `redirect()` + revalidation ([0071](0071-bff-api-integration.md) `revalidateTag` / `revalidatePath`) |

- The supply and validation timing of the input validation errors shown inline are under [0062](0062-form-input-validation.md). This ADR holds the choice of **by which means to display them**
- **Inline shows both an overall summary and per-field messages.** In forms with many fields, the messages beside the fields alone do not let one trace "where, and how many" are wrong. The summary carries the overall picture and navigation, and the field messages carry the on-the-spot pointing out. The branching condition is "is what needs fixing inside the input"; a failure of the submission itself (network, permission) has nothing to fix inside the input, so it is shown not in the summary but as feedback for the whole form
- **Presentation is chosen by the kind of failure, not by the wording.** `ActionState` holds "what happened" (a classification for machines) separately from "what to say" (wording for humans). When a screen chooses its presentation by the kind of failure (adding a reload path on a conflict, etc.), using the wording itself as the signal makes the choice silently break the moment a dynamic element is added to the wording. The two change for different reasons

### 2. Where the toast UI belongs

- **Where the toast UI belongs**: toast / notification components are placed and used in **the `components` kernel** (already settled by [0052](0052-ui-component-policy.md)'s component policy / [0021](0021-frontend-responsibility.md), which lets `components` hold UI state such as toasts). Direct vendor references are confined to the `components` kernel ([0052](0052-ui-component-policy.md)'s non-lock-in boundary)
- This ADR does not reassign the toast *component*; it holds **the convention for choosing** and the a11y requirement below

### 3. a11y (live regions; the authority is [0100](0100-accessibility-target.md))

- Toasts and asynchronous state changes are not conveyed to assistive technology visually alone, so **they are announced with live regions (`role="status"` / `role="alert"` / `aria-live`)**. Inline errors are associated with their field via `aria-describedby` / `aria-invalid`
- **The authority on a11y target levels and inspection timing is [0100](0100-accessibility-target.md)** (WCAG 2.x AA / biome a11y static checks + manual checks at implementation PRs). This ADR only lays down "**notification UI comes with a live region**" as a mandatory requirement of result notification UX, and does not redefine the level (avoiding double management)

## Prohibitions

- ❌ Letting the choice of notification means (inline / toast / redirect) vary per feature (Enforcement: Prose — **not mechanizable**. Whether a result stays in the form context or leaves it is a judgment about the screen's flow, not decided by the shape of the code)
- ❌ Choosing the notification's presentation by matching the wording (choose by classification; wording is for humans)
- ❌ Showing asynchronous notifications such as toasts without a live region (not conveyed to assistive technology = a [0100](0100-accessibility-target.md) violation) (Enforcement: `src/components/shell/toaster/toast-item.test.tsx` and `toaster.test.tsx` reject toasts without `role="status"` / `role="alert"`. Asynchronous state changes other than toasts are Prose — **not mechanizable**. Which changes count as asynchronous notifications is decided by the meaning of the screen)
- ❌ Placing the toast UI outside `components` / substituting it by introducing a UI component library other than shadcn in parallel ([0021](0021-frontend-responsibility.md) placement / [0052](0052-ui-component-policy.md)'s adoption of shadcn and ban on bundling in parallel) (Enforcement: Prose — **partly mechanizable**. Pulling the supplier of another UI library from outside `components` could be rejected with `no-restricted-imports` (the same form as for the icon supplier), but no rule exists. Whether toast-like UI was built by hand outside `components` is decided by the meaning of what it renders)

## Notes

- Day-to-day detailed rules (toast display duration, wording tone, etc.) are held by [docs/rules.md](../rules.md)

## Related ADRs

- [0061-form-mutation-ux.md](0061-form-mutation-ux.md) — submission mechanics (the supplier of the `ActionState` contract this ADR takes as input)
- [0062-form-input-validation.md](0062-form-input-validation.md) — input validation UX (the supplier of the field errors shown inline)
- [0080-error-handling.md](0080-error-handling.md) — errors sentinel / boundary normalization (the supplier of the errors `ActionState` carries)
- [0052-ui-component-policy.md](0052-ui-component-policy.md) — adopting UI / form components (shadcn family). Toast / notification components are used from `components`
- [0100-accessibility-target.md](0100-accessibility-target.md) — the authority on a11y target levels (the live region requirement itself is specified by this ADR)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — Server Action / revalidation (linked with redirect notification and reflecting mutations)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `components` (where the toast UI belongs)
