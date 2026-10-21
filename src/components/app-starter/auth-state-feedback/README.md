# AuthStateFeedback

## Purpose

Displays the states of not being signed in, lacking permission, and not found, together with the way out of them.

## Role and Public Components

| Component | Role |
| --- | --- |
| `AuthStateFeedback` | An SSR-first component that displays the heading, description and icon for the state. |
| `AuthSignInAction` | A link that does a document navigation to the Route Handler that starts sign-in. |
| `AUTH_STATE` / `AUTH_STATE_MESSAGE` | The states handled and their default copy. When displaying in an overlay, the copy alone can be used. |

## States Handled

| State | HTTP | Next action |
| --- | --- | --- |
| `unauthenticated` | 401 | Sign in |
| `session-expired` | 401 | Sign in again |
| `forbidden` | 403 | Go back to a return destination in the app, ask an administrator |
| `not-found` | 404 | Go back to a return destination in the app |

`unauthenticated` and `session-expired` are the same 401, but someone who had signed in once needs to be told that "what they were entering will be lost", so the copy is split.

404 is handled here because some operations return 404 rather than 403 to hide the existence of a resource the user has no permission for. From the user's point of view the next action is the same as 403.

## `ApiErrorAlert` vs This Component

For 401 / 403 / 404, retrying the same action does not change the result. The retry path provided by [`api-error-feedback`](../api-error-feedback/README.md) is wrong for these states, so this is a separate component. Failures of communication or processing itself are handled by `ApiErrorAlert`; states where the user must take a different action are handled by this component.

## The Sign-In Link

`AuthSignInAction` renders an `a`, not `next/link`. Starting sign-in is a redirect from the Route Handler (`/api/auth/*`) to the IdP, which a client-side navigation cannot handle.

Building the `href` and validating `returnUrl` are owned by the caller. Limiting the return destination to a same-origin relative path so it cannot be an external URL is the responsibility of the feature / adapter; this component uses the URL it receives as is.

## Responsibility Boundaries

It does not own session validation, permission decisions, or classifying status codes. The feature maps the result normalized by `adapters/server` to a state and passes it.

The heading and description can be replaced. When you can say concretely which permission is missing, write it more concretely than the default copy.

When the message must stop the action, the caller builds an `AlertDialog` and puts the `AUTH_STATE_MESSAGE` copy and `AuthSignInAction` inside it. This component has `role="alert"`, so it is not nested inside `role="alertdialog"`.

## Storybook and Tests

Storybook checks the 4 states, replaced copy, and the case assembled as an overlay. Tests check the default copy for each state, that only insufficient permission is shown as a warning, that it has `data-state`, replacing the copy and the link, that the sign-in link does not do a client navigation, and automated a11y checks.
