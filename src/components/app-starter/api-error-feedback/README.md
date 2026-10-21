# ApiErrorFeedback

## Purpose

Conveys a client-side API failure with an Alert or a Dialog, according to the screen's responsibility. It does not replace SSR `error.tsx` or page-level error displays.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ApiErrorAlert` | Displays the failure while keeping the context, such as in a form or a list. |
| `ApiErrorDialog` | Stops the action from continuing and prompts confirmation or a retry. `open` is managed by the caller. |
| `ApiError` | Represents the `client` / `server` / `network` classification, the display message, the request ID, and whether a retry is possible. |

## Use Cases

- `client`: a 4xx-equivalent failure that needs the user to correct something, such as input or permissions. Displayed as `warning`.
- `server`: a 5xx-equivalent failure on the service side. When a retry is possible, pass `retryable` and `onRetry`.
- `network`: unreachable or a timeout. Displayed as `destructive`; use a Dialog to stop the action, or an Alert when it can be handled in context.

`retryAfter` is used to display the retry wait time (seconds) the API returned, for example with 429. The countdown and deciding whether a retry has become possible are managed on the feature side. `retryPending` is passed to prevent double submission during a retry. Into `children`, compose only feature-specific auxiliary actions such as navigating to sign-in or a details page.

## Responsibility Boundaries

Both components are Client Components that handle browser-side opening/closing and retry actions. From a Server Component, pass the serializable value of `ApiError` as props, and wire `onRetry` and `onOpenChange` on the client shell side.

Deciding the status of the raw response, business-specific copy, retry processing and obtaining the request ID are done on the feature / adapter side, which normalizes into `ApiError` and passes it. The component itself owns no fetch or API client.

## Handling the Request ID

`requestId` is an opaque, server-generated identifier for linking server logs with contact from the user. Pass it only for failures that need investigation, such as 5xx, and display it on screen as the request ID. Tokens, personal information, internal URLs and the like must not be included in the request ID. It is normally omitted for 4xx input errors, and when the server was never reached, as with a network error, the value may not exist.

## Storybook and Tests

In Storybook, `ClientError` / `ServerError` show the in-context Alert, and `BlockingDialog` shows a failure that needs the action stopped. Tests check the roles of the Alert and Dialog, the retry action, and accessible roles.
