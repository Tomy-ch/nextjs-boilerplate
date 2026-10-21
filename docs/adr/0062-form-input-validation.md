# Form Input Validation UX (Client Validation and the Boundary for Reusing Generated zod)

This ADR unifies the **input validation UX** before submission into one. It defines the default of also performing display-level input validation (required / format / length, etc., for UX) on the client for immediate feedback, the **two-layer separation** of **display validation rules (hand-written zod schemas in `model`)** and **contract validation (the `adapters` boundary, generated schemas)**, and the boundary for reusing generated zod ([0072](0072-api-type-generation.md)) on the client (the concrete allowed range is under [0072](0072-api-type-generation.md)). Client validation is done with the **react-hook-form + zodResolver** that [0060](0060-state-management.md) adopts (what is fed to the resolver is the display-validation schema in `model`), and this is the layer that supplies field errors to the `ActionState` contract of the submission mechanics ([0061](0061-form-mutation-ux.md)).

## Status

Accepted

## Context

[0060](0060-state-management.md) **adopts react-hook-form + zod (`zodResolver`)** for form state. However, rhf + resolver is "a mechanism that runs validation"; "**with which schema and at what timing to validate, and how to separate it from generated wire schemas**" needs separate conventions. Left blank, form input, the most frequent thing in a boilerplate, would be inconsistent per feature in both validation timing and the handling of double management.

Input validation sits between the submission mechanics ([0061](0061-form-mutation-ux.md)) and result notification ([0063](0063-mutation-result-notification.md)), where the immediate-feedback UX before submission intersects with the type-leak boundary judgment of whether generated artifacts (wire schemas) may be reused for client input validation. This ADR lays down the former (the default of input validation UX = including which schema is fed to the resolver), and delegates the concrete allowed range of the latter to [0072](0072-api-type-generation.md), the authority on generated artifacts and type leaks.

## Decision

### 1. Client display validation and validation timing

- **Do not make input validation presuppose a server round trip**. Display-level input validation (required / format / length, etc., for UX) is also done on the client, with immediate feedback
- Default validation timing = **errors are shown at the point focus leaves the field. While focus is on it, validation only works in the direction of clearing what is shown and does not show new errors** (reward early, punish late). Not turning it red from the first character is so as not to report a field still being written as an error, and the point focus leaves is the earliest opportunity at which "the field has been finished" can be assumed. **A fix is reflected before focus leaves** — if it does not clear when fixed, the user cannot confirm whether it was fixed until they blur. Waiting until submit is not the default — it would force a round trip per error, and where to fix would not be known until submitting. Error wording is in Japanese (AGENTS.md Language Rules)
- **A field chosen from options has no default selection; an empty option comes first.** If the first option is selected by default, a value sent without checking cannot be distinguished from a value chosen intentionally, and validating a required selection field loses its meaning. Not having chosen differs from having chosen the first option
- Validation results reach the presentation layer as fieldErrors / formError of the submission mechanics' ([0061](0061-form-mutation-ux.md)) `ActionState` (the use of notification means is [0063](0063-mutation-result-notification.md))

### 2. Two-layer separation of validation (display rules vs contract validation)

Validation is **separated into two layers** (this separation is the key to consistency with [0072](0072-api-type-generation.md)'s ban on type leaks):

- **Display validation rules** = **hand-written zod schemas** held by `model` (what [0021](0021-frontend-responsibility.md) calls display validation rules). They are field rules for UX and, being **not a wire contract**, are outside the scope of [0072](0072-api-type-generation.md)'s ban on type leaks. **What is fed to client input validation (rhf's `zodResolver`) is this display-validation schema in `model`**, and when [0060](0060-state-management.md) says "the zod schema is the SSOT of the input contract, shared with the client's `zodResolver`", that SSOT refers to this display-validation schema. The same check is passed both before sending (client) and after receiving (Server Action) — the reason to check after receiving too is that the check before sending can be swapped out by the sender. The check and its wording are held in one place in `model`, not copied to both sides
- **Contract validation** = the `adapters` boundary. Requests are `.parse()`d with the generated request schema and responses with the generated response schema ([0071](0071-bff-api-integration.md) / [0072](0072-api-type-generation.md)). A contract breach is treated as a normalized error ([0080](0080-error-handling.md)). The default is **not feeding generated wire schemas directly to rhf's resolver** (not leaking generated artifacts into features/`model` = the ban on type leaks). Whether generated request schemas may be reused on the client is under [0072](0072-api-type-generation.md), as §3 says

### 3. The boundary for reusing generated zod on the client (the concrete allowed range is held by 0072)

- Whether the **request-body schemas** of generated zod ([0072](0072-api-type-generation.md)) may be reused for client input validation (avoiding double management of schemas) **touches [0072](0072-api-type-generation.md)'s ban on type leaks and its jurisdiction over generated artifacts**
- **This ADR defines only the principle of "avoid double management" and the two-layer separation above; the concrete allowed range for putting generated schemas into the client bundle is held by [0072](0072-api-type-generation.md)**. 0072 takes the form of not putting generated schemas on the client and distributing **only the constants** for the limits and formats the contract defines, in a module separate from validation. When client input validation needs values derived from the contract, it pulls those constants, not the schema itself

## Prohibitions

- ❌ A UX that shows input validation only via a server round trip (also validate for display on the client) (Enforcement: Prose — **not mechanizable**. Which fields need display validation before sending is decided by the meaning of the field, not by the shape of the form)
- ❌ Confusing display validation rules (`model`, hand-written) with generated wire schemas (`adapters/gen`), leaking generated schemas into `model` / feature domain logic ([0072](0072-api-type-generation.md) ban on type leaks) (Enforcement: ESLint boundaries (`adapters-gen` in `RESTRICTED_AREAS` of `architecture.ts`) rejects direct imports of generated artifacts from `model` / `features`. Passing them through via the public surface of `adapters` is Prose — **not mechanizable**. Whether the type the public surface returns is a generated type or our own view type is decided by the origin of the inferred type, not by the shape of the import)
- ❌ Settling in this ADR the concrete allowed range for reusing generated zod on the client (the authority is [0072](0072-api-type-generation.md)) (Enforcement: Prose — **not mechanizable**. Which document holds that decision is a judgment about the documents' contents and does not appear in code)
- ❌ Letting validation timing vary per feature (default = show at the point focus leaves, and only work toward clearing while focused) (Enforcement: Prose — **not mechanizable**. The moment of display is decided by runtime focus transitions and is visible only in per-form tests)
- ❌ Showing new errors on a field that has focus (it would reproach the user mid-edit) (Enforcement: Prose — **not mechanizable**. Whether something is shown while focused is decided by runtime focus transitions and is visible only in per-form tests)
- ❌ Putting a default selection on a field chosen from options (unselected and the first option become indistinguishable) (Enforcement: Prose — **partly mechanizable**. Whether a form's `select` has an empty first option can be detected from the shape of the JSX, but no rule exists. Whether that field is an input or a switch of conditions that may have a default is decided by its use)

## Notes

- **rhf's `reValidateMode` alone cannot satisfy §1**. That setting takes effect only after submit, and errors shown on blur are not reconsidered on change. Written naively, it yields a "does not clear even when fixed" state, and since the setting is declared, reading alone does not reveal it. To satisfy the default, validate already-blurred fields on change too, and cap what is shown while focused at "the wording at the time focus arrived"
- Day-to-day detailed rules (the exact values of validation timing, wording tone, etc.) are held by [docs/rules.md](../rules.md)

## Related ADRs

- [0061-form-mutation-ux.md](0061-form-mutation-ux.md) — submission mechanics (the supplier of the `ActionState` contract that carries this ADR's validation results)
- [0063-mutation-result-notification.md](0063-mutation-result-notification.md) — notification UX for mutation results (the layer that displays this ADR's field errors)
- [0072-api-type-generation.md](0072-api-type-generation.md) — generated zod / ban on type leaks (the authority on the allowed range for client reuse)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — contract validation at the `adapters` boundary (`.parse()`)
- [0080-error-handling.md](0080-error-handling.md) — normalized errors for contract breaches
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `model` (owns display validation rules)
- [0060-state-management.md](0060-state-management.md) — adopting form state = react-hook-form + zod (`zodResolver`). What is fed to the resolver is this ADR's `model` display-validation schema (the zod SSOT)
