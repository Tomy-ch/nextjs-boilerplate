# Error Handling

Settles the contents of the **`errors` kernel**, whose frame was reserved by [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md). It defines **a protocol-agnostic error classification (sentinels) / HTTP status normalization at the boundary / the App Router special-file hierarchy for errors / loading UI in `loading.tsx` and Suspense fallbacks / no swallowing and cause chains / when logs are emitted**.

## Status

Accepted

## Context

Left undecided, the responsibilities of App Router's `error.tsx` / `not-found.tsx` / `global-error.tsx`, the Error Boundary hierarchy, normalization of backend errors and the timing of log output get written in a different shape per feature. This ADR settles them.

The error classification is defined as **transport-independent sentinels**, **mapping to a protocol is done only at the boundary (edge)**, and **no swallowing / cause chains first / redaction** are made conventions — if the classification knew HTTP, `model` would know HTTP, and if the mapping were scattered, the same status would fall into a different classification depending on where it happened. This ADR lays this structure over the presentation layer.

## Decision

### 1. The `errors` kernel: protocol-agnostic sentinel classification

- Define **a transport-independent error classification (sentinels)** in the `errors` kernel. HTTP statuses and response formats are not held here
- The classification is referable from every layer ([0021](0021-frontend-responsibility.md) errors; the only kernel `model` may depend on)
- The HTTP-related classifications (those the presentation layer handles). The primary key of a sentinel is the **HTTP status** (unambiguous), and the stable error code per classification is held by the `errors` catalog (see "error code vocabulary" below):

| Sentinel (classification) | Stable error code | HTTP status | Origin |
| --- | --- | --- | --- |
| InvalidArgument | `BAD_REQUEST` | 400 | User-caused |
| Unauthenticated | `UNAUTHENTICATED` | 401 | User-caused |
| PermissionDenied | `FORBIDDEN` | 403 | User-caused |
| NotFound | `NOT_FOUND` | 404 | User-caused |
| Conflict | `RESOURCE_CONFLICT` | 409 | User-caused |
| PayloadTooLarge | `PAYLOAD_TOO_LARGE` | 413 | User-caused |
| UriTooLong | `URI_TOO_LONG` | 414 | User-caused |
| UnsupportedMediaType | `UNSUPPORTED_MEDIA_TYPE` | 415 | User-caused |
| Validation | `VALIDATION_FAILED` | 422 | User-caused |
| TooManyRequests | `TOO_MANY_REQUESTS` | 429 | User-caused |
| Canceled | `CANCELED` | 499 | User-caused |
| Unavailable | `SERVICE_UNAVAILABLE` | 503 | System-caused (implies retry) |
| Unimplemented | `NOT_IMPLEMENTED` | 501 | System-caused |
| Internal | `INTERNAL` | 500 | System-caused |

The sentinel names in the table are the conceptual names of the classifications. In code, the value is held as a kebab-case string (`"invalid-argument"`) and the named constant as UPPER_SNAKE_CASE (`ErrorKind.INVALID_ARGUMENT`; the shape of constants is [0028](0028-naming-convention.md)), and both point at the same classification.

- **Worker-oriented classifications (retryable / permanent / fatal) are not adopted**. That is an axis specific to messaging workers; the presentation layer holds only the HTTP taxonomy
- **The error code vocabulary is owned by this repo**: the codes in the table above are **this repo's vocabulary**, generated per classification by the `errors` catalog, and **never go out on the wire** (a failure a route returns carries only the message). The boundary does not read the connected service's `code` either (2 below). **The contract does not declare the value range of `ErrorResponse.code`** (`type: string`), so there is no means of matching it against the generated artifacts either. We therefore do not mechanically align with the backend's spelling, and instead **choose the name that is correct for the meaning of the classification** (401 is `UNAUTHENTICATED` because authentication has not been established, 403 is `FORBIDDEN` because authorization was refused). Error codes are not values of the wire contract, so [0028](0028-naming-convention.md)'s rule of not placing naming authority in the backend applies as is. When people match up logs, the correspondence can be taken by HTTP status — the primary key being the status is a more reliable correspondence than matching spellings. If an additional classification label is needed inside the frontend, it is not made to compete with this vocabulary either
- **`Canceled` (status 499, non-standard) is adopted as an independent classification**. Aborting a fetch (the dual timeout / `AbortSignal` of [0071](0071-bff-api-integration.md)) is a cut-off, not a failure, and folding it into a system-caused failure would make it a retry target
- **`UriTooLong` (414) is held separately from `PayloadTooLarge` (413)**. A large request body and a long URL carrying conditions differ in what the user should reduce. Folding them together can only say "the data being sent is too large", and does not convey that reducing the conditions would do

### 2. HTTP status normalization at the boundary (once only)

- The conversion from the backend response's raw HTTP status → sentinel classification + stable error code + user-facing message is done **exactly once, at the `adapters` boundary** (the details of [0071](0071-bff-api-integration.md)'s normalization of raw statuses into `errors` = this ADR)
- **Raw HTTP statuses and raw errors are not leaked to inner layers / the UI** (consistent with [0071](0071-bff-api-integration.md)). Unknown errors are coerced to `Internal` (500)
- User-facing messages are in Japanese (AGENTS.md Language Rules). The message text is held by the catalog per classification (this ADR defines the correspondence table between classifications and codes)
- **From the body of a failed response, only `details` is read.** The body is read only for statuses for which the contract declared detail identifiers (endpoints that declared `ErrorResponseWithDetails`), and put into `ErrorMeta.details`. Mapping field names to display names is on the feature / form side. **`message` is not read** — it would show the wording the connected service chose as is, so a string we did not choose would reach the user (messages are held by the catalog per classification). **`code` is not read either** — `ErrorResponse.code` has no declared value range, so even if we branched on its spelling, regenerating the contract could not detect a mismatch. The primary key of the classification stays the HTTP status
- **The additional information the boundary holds for a failed response is two items: `requestId` and `details`**. `traceId` / `correlationId`, arrays of objects such as `fieldErrors`, and other shapes are not adopted. If the connected service adopts them, change the response conversion in `adapters` and `ErrorMeta` to match the contract — inner layers see only `ErrorMeta`, so the place to change is closed there
- **Failing to read the body does not substitute for the original failure.** A body that is not JSON or has a shape different from the contract can occur on the path, but either case is folded into "no details". An attempt that got no response does not inherit the fields a previous attempt named (the classification and the details would come from different attempts)
- **The client path is classified at the same boundary too.** `adapters/client`, which calls the same-origin BFF, does not rethrow raw statuses as is either, and maps them to this correspondence table. In particular, do not fold `Unauthenticated` (401) into `Internal` — folding it lets the caller treat it only as "a failure that can be retried", producing a screen that can offer only a reload while the credential has expired (retrying is wrong for 401 / 403 / 404; `components/app-starter/auth-state-feedback`)
- **Degrading auxiliary values is folded once at the boundary instead of being decided per screen.** For a value that exists only for display and without which the screen still works (an accessory such as supplementary display pulled from another endpoint), place in `adapters` a variant that returns `null` when unreadable, and keep the throwing variant too. Making each screen write try / catch multiplies the same judgment by the number of screens, and produces screens where only one side fails. **Conversely, a value where screens disagree on whether it may be dropped is not folded** — folding is possible only when it can be asserted that "every screen treats it the same way"

### 3. The App Router special-file hierarchy for errors

- `error.tsx` (recovery UI at a segment boundary) / `global-error.tsx` (errors in the root layout) / `not-found.tsx` (404) are thin boundaries that **only display the normalized error code / message**. Raw errors and stacks are not leaked to the screen
- **Mind the production redaction behaviour** (the official Next.js `error.js` file convention): in production, **the `message` of an error thrown from a Server Component is redacted**, and the client error boundary (`error.tsx`) receives **only a generic message + `error.digest` (an auto-generated hash for matching against server logs)** (a throw originating in a Client Component passes the original message). Therefore **do not rely on the throw path** for "displaying the normalized message". User-facing messages are resolved by one of the following:
  - (a) **Expected errors (mainly user-caused 4xx)**: do not throw; **pass them as values in the Server Action's return value (ActionState / `useActionState`)** (the official guide's "model expected errors as return values"; consistent with [0040](0040-routing-rendering-strategy.md)'s adoption of Server Actions)
  - (b) **Unexpected errors (system-caused 5xx)**: `error.tsx` stays at displaying generic wording + `digest`, and the cause is resolved by matching `digest` against the boundary log (6 below)

  Both are compatible with this ADR's classification (the origin column in 1 above) and boundary normalization (2 above). Which one a feature uses is decided per feature
- Placement is **per route segment under `src/app/`** (by App Router convention, special files work only under `app/` — [0027](0027-directory-structure.md); special-file naming is [0028](0028-naming-convention.md)). The granularity of Error Boundaries follows the segment hierarchy. The component for the error display's contents is placed on the feature side, and the special file delegates to it thinly ([0040](0040-routing-rendering-strategy.md) driving adapter principle)
- **No business logic is written** in `error.tsx` and the like ([0040](0040-routing-rendering-strategy.md) driving adapter)

### 4. Loading UI in `loading.tsx` / Suspense fallbacks

The **loading UI of the normal path = `loading.tsx` / `<Suspense fallback>`**, the counterpart of the abnormal path = `error.tsx` (3 above), is put under the same discipline of a "thin display boundary":

- `loading.tsx` (a segment's pending UI) and `<Suspense fallback>` are **thin display boundaries responsible for the loading UI**. They pair with `error.tsx`, and none of them holds business logic. The content component is placed on the feature side, and the special file delegates to it thinly (same as error.tsx / [0040](0040-routing-rendering-strategy.md) driving adapter principle)
- **Where to place `<Suspense>` boundaries (their granularity) is owned by [0040](0040-routing-rendering-strategy.md)'s rule on boundary granularity.** What is defined here goes only as far as the fallback of a placed boundary being a thin display boundary with no business logic
- `loading.tsx` is also an App Router special file under `app/` ([0027](0027-directory-structure.md) / [0028](0028-naming-convention.md))
- **A missing primary resource is served with 200.** Under [0041](0041-cache-components-decision.md), while `Cache Components` is enabled, a dynamic route always streams from the static shell. Headers go out before the body, so even if `notFound()` is reached afterwards the status is already 200, and a URL pointing at a nonexistent item is served as 200. **This cannot be solved by how the route is written** — it does not change without `loading.tsx`, without `<Suspense>`, or by declaring `export const instant = false`. The workaround Next itself suggests is a pre-check in `proxy`, but [0043](0043-middleware-policy.md) limits `proxy` to a pre-filter that only reads cookies, so it is not adopted
- **Not-found is conveyed by `noindex` and the screen.** Since the status cannot convey it, the means of conveying it are the screen `not-found.tsx` returns and the `<meta name="robots" content="noindex">` that `notFound()` inserts. This prevents indexing. **What it cannot prevent is readers that judge by status** — external monitoring, DAST and non-JS clients cannot distinguish it from success. This cost was accepted in [0041](0041-cache-components-decision.md)
- **As a result, some screens have no loading state.** "Each screen designs the four states loading, empty, error and success" in `docs/rules.md` *State Display and Loading* does not mean "always build all four" but "design the four, and implement and test the ones it owns". Building components for states it does not own leaves skeletons referenced from nowhere. **Write in the README that you decided not to own it, and why**
- **Suspense × PPR interaction**: `Cache Components` is enabled ([0041](0041-cache-components-decision.md)), so the position of `<Suspense>` **is the boundary between the static shell and a dynamic hole itself**, and how to place it is owned by [0040](0040-routing-rendering-strategy.md). The fallback is served as part of the static shell until that dynamic hole fills
- **A fallback takes up space.** So that the surroundings do not move the moment the dynamic hole fills, the loading UI renders a frame the same size as the real thing ("loading prefers a skeleton close in shape" in `docs/rules.md` *State Display and Loading*, and "do not move the position of controls because of displays that come and go with state" in *UI Components and Interaction*). Only a dynamic hole with nothing to render (measurement and the like) may use `null` as its fallback
- **The UI convention for the fallback's look (skeleton / spinner)** depends on the use case and is not settled here

### 5. No swallowing, cause chains, redaction

- **Errors are not swallowed (no swallowing)**. Each error is either handled / wrapped and propagated, or, if logically unreachable, thrown explicitly
- The original error's type and information are kept in the chain. **The chain is kept with TypeScript's `Error` `cause` (`new Error(msg, { cause })`)**
- **Errors containing confidential information are redacted before being wrapped**. PII / tokens / passwords are not put in logs or responses

### 6. When logs are emitted

- An error is logged **once at the boundary** (the normalization point in `adapters` / the route's error boundary), suppressing double logging
- **5xx (system-caused) = error level / 4xx (user-caused) = warn level**. The specifics of logging (schema, destination, trace correlation) are authoritative in **[0081](0081-observability-logging.md)**

### Boundary Granularity

`error.tsx` is placed **outside the range whose loss would hurt**. Everything inside a boundary is swapped out wholesale, so the wider the boundary, the more paths disappear on a single fetch failure. It is placed directly under the route so that the header, nav and footer remain even if that route's body fails.

**On screens that tolerate partial failure, take it in the display rather than at a boundary.** Do not swap out the whole screen for one line of content that is allowed to fail (use the notification means of [0063](0063-mutation-result-notification.md)).

**A boundary's message can name only down to the granularity at which the boundary was placed.** A boundary that covers the screens beneath it with one sheet does not learn which screen failed. The message placed there takes a form that does not name the target. If a message naming the failed target is needed, place a boundary per such screen — the message's requirement decides the boundary's granularity.

## Prohibitions

- ❌ Giving the `errors` kernel HTTP statuses / response formats (the classification is transport-independent; conversion is at the boundary) (Enforcement: ESLint `no-restricted-syntax` (rejects the identifiers `http` / `status` / `response` and `http(s)` string literals in `src/errors/**`). Holding numeric statuses or response shapes under other names is Prose — **not mechanizable**. Whether the meaning of a number or a type comes from the transport is not determined by its spelling)
- ❌ Leaking raw HTTP statuses, raw errors or stacks to inner layers / the UI (normalize at the boundary)
- ❌ Swallowing errors (no swallowing) / putting confidential information in logs or responses without redaction (Enforcement: the name table in `src/logging` (pinned by `pino.server.test.ts`) masks confidential log fields by name. Swallowing is Prose — **not mechanizable**. Whether a `catch` that folds into a value is swallowing or the degrade of §2 is decided by intent)
- ❌ Writing business logic in `error.tsx` / `global-error.tsx` / `not-found.tsx` / `loading.tsx` / Suspense fallbacks (thin display boundaries) (Enforcement: Prose — **not mechanizable**. What is business logic is decided by the meaning of the processing, not by the shape of the special file)
- ❌ Logging the same error in multiple places (once at the boundary) (Enforcement: Prose — **not mechanizable**. Whether the same error is recorded several times is decided by the runtime path, not by the shape of the code at one place)
- ❌ Folding `Unauthenticated` (401) into `Internal` (§2; it gets mixed with retryable failures) (Enforcement: Prose — **not mechanizable**. Which classification it maps to is decided by the content of the mapping and is visible only within the range of written tests)
- ❌ Writing the degrade of values the screen does not need in order to work as per-screen try / catch (§2; fold at the boundary) (Enforcement: Prose — **not mechanizable**. Whether a value is not needed for the screen to work is decided by the meaning of the screen, not by the shape of `try` / `catch`)
- ❌ Designing on the premise that the absence of a primary resource can be conveyed by status (§4; under enabled `Cache Components` it is served with 200) (Enforcement: Prose — **not mechanizable**. It is a design premise and does not appear in code)
- ❌ Building components for states the screen does not own (§4; leaves unreferenced skeletons)

## Related ADRs

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the `errors` kernel (referable from every layer / the only one `model` may depend on)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the boundary that normalizes raw statuses into the errors classification (this ADR defines the details of the correspondence table)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the position and granularity of `Suspense` boundaries / the driving adapter principle (the placement and responsibilities of `error.tsx` / `loading.tsx` are settled by this ADR)
- [0028-naming-convention.md](0028-naming-convention.md) — naming of App Router special files
- [0081-observability-logging.md](0081-observability-logging.md) — schema, destination and trace correlation for error logs
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — the contract for backend errors (the premise of normalization at the boundary)
