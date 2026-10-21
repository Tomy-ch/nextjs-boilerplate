# FormFeedback

## Purpose

Displays the result of a Server Action or native form as a summary the user can understand and the next action.

## Role and Public Components

| Component | Role |
| --- | --- |
| `FormFeedback` | Uses `Alert` to display a title, description, an optional request ID, and the next action. |

## Use Cases

Used to display results that concern the whole form, such as a failed save, a request to retry, or a note after processing completes.

## Responsibility Boundaries

It is a Server Component and does not own calling the Server Action, classifying errors, converting copy, or field-level validation. The feature converts these into meaningful props and passes them. Use `FieldError` for field-level errors.

## Storybook and Tests

Storybook checks the normal case, the request ID and the next action; tests check semantics, links and a11y.
