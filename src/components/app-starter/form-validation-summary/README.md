# FormValidationSummary

## Purpose

Summarizes the whole form's validation errors in one place and lists links to each input.

## Role and Public Components

| Component / Type | Role |
| --- | --- |
| `FormValidationSummary` | The summary of validation errors. Renders nothing when there are no errors. |
| `FormValidationError` | The definition of one entry in the summary. It has `fieldId` and `message`. |

## Use Cases

Used in forms with many fields, so that after submit the user can trace "where" and "how many" things are wrong. `fieldId` is the `id` of the corresponding input, and each entry in the summary becomes a link to that field.

## FormFeedback / FieldError vs This Component

| | What it handles |
| --- | --- |
| `FormValidationSummary` | **The list of validation errors**. Jumps to the field to fix |
| [`FormFeedback`](../form-feedback/README.md) | **The summary of the submission result**. Success, failure, next action, request ID |
| `FieldError` | Copy attached to **an individual field** |

The summary does not replace `FieldError`. **Show both.** The summary gives the overall picture and the navigation, and `FieldError` points out the problem next to the input; these are different roles. When the submission itself fails (lost connection, server-side error), `FormFeedback` handles it; this component handles only validation errors. It renders nothing on success.

## Responsibility Boundaries

It does not own validation rules, classifying errors, or converting them into copy. The feature converts them into copy that makes sense to the user and passes it.

**It does not own moving focus.** It is rendered as a Server Component, so it receives the `id` and the caller (the client boundary) moves focus. The summary itself has no `tabIndex`, so if you want it to receive focus, the caller adds one.

## Accessibility

It goes through `Alert`, so it has `role="alert"`. When the summary appears after submit, it is announced to assistive technology.

Each entry is a link so the user can move to the field with the keyboard alone. The copy itself is the link, so when read aloud, "what to fix" and "where it jumps" are the same unit.

Note that WCAG 2.x AA does not require an error summary itself (the target level in ADR 0100). The basis for this component is not conformance but the practical need in forms with many fields.

## Storybook and Tests

Storybook checks multiple errors, a single error, a replaced heading, the no-error case, and wiring across the whole form. Tests check that nothing is rendered when there are no errors, that it is announced as `role="alert"`, that each error becomes a link to its field, replacing the heading, that it receives the `id`, that it does not replace `FieldError`, and automated a11y checks.
