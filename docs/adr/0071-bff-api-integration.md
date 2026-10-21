# BFF / API Integration

This ADR defines **the placement of the API client that calls the backend API / the resilience of the fetch wrapper (timeout / retry / retry budget / circuit breaker) / error normalization / the receiving point of runtime response validation**. It settles how [0070](0070-backend-role-separation.md)'s thin proxy and ownership of boundary values are implemented as the actual HTTP calling layer.

## Status

Accepted

## Context

This ADR settles the scope of responsibility of `/api/*`, where external API clients live, and the fetch wrapper (retry / timeout / error conversion / logging). The premise is not scattering ad-hoc fetches across components and not implementing retry and timeout independently in each place; instead, outbound calls are gathered into one wrapper, which carries the resilience.

The resilience outbound HTTP should have is four things: **dual timeout / idempotent retry / retry budget / circuit breaker**. With a single-stage timeout, "give up one attempt" cannot be distinguished from "give up the whole call"; retry duplicates non-idempotent requests; retry without a budget piles load onto a degraded downstream (retry storm); and without a breaker, calls keep hammering during degradation and cannot fail fast. This ADR gives the wrapper these four, with default values.

## Decision

### Placement of the API client = the `adapters` kernel

- The backend API client (fetch wrapper) is placed in **the `adapters` kernel** ([0021](0021-frontend-responsibility.md); the only layer that can import `config` / the owning boundary of external connections). Raw `fetch` is not scattered across components and features. **`adapters` is split into two sides, server and client** (server = backend client, has secrets, may use config / client = same-origin BFF fetch, WebSocket, sending telemetry, no secrets). The details are governed by [0024](0024-adapters-server-client-split.md). This ADR's resilience (dual timeout / retry / breaker) applies mainly to `adapters/server`
- **The conversion** of generated types and zod schemas ([0072](0072-api-type-generation.md)) **is also owned at this boundary** ([0070](0070-backend-role-separation.md) ban on type leaks)

### Resilience of the fetch wrapper

All outbound calls are gathered through the fetch wrapper (raw `fetch` is not used directly), which provides the following:

- **dual timeout**: two stages, a **per-attempt timeout** and an **overall timeout**, expressed with `AbortSignal` / `AbortController` (`AbortSignal.timeout()`). If backoff would exceed overall, the retry is skipped (respecting the deadline). Defaults are per-attempt 3s / overall 10s, adjustable per downstream. **The maximum number of attempts is 3** — overall 10s is slightly more than three times per-attempt 3s, so further attempts are blocked by overall and never run
- **retry**: **idempotent methods (GET / PUT / DELETE) are retryable**, and **POST / PATCH are explicit opt-in** (only when an idempotency key is attached). Retryable conditions = 5xx / 429 / transport error. **Exponential backoff + full jitter**, respecting the `Retry-After` header
- **retry budget**: a per-downstream token bucket (default 10%) prevents retry storms
- **circuit breaker**: a closed / half-open / open state machine (defaults: failure rate 0.5 / sample 20 / open 5s / half-open probe 3). Held even with a single backend, so as to fail fast instead of hammering during degradation
- Adjusted with a per-downstream **Profile** (timeout / retry / breaker settings); when unspecified, the default Profile is used

**One connection point is placed per combination of downstream and classification ([0112](0112-data-classification-cache-boundary.md)).** The retry budget and circuit breaker live as state inside the client, so building several clients for the same downstream splits the judgment of whether it has degraded by however many there are, and neither budget nor breaker works as designed. Connection points are placed in `src/adapters/server/http/`, one per classification (`getPublicClient()` / `getUserScopedClient()`), and fetch endpoints pull one of them. The connection points placed one per classification in the "Caching and Revalidation of Data Fetching" section are these.

**Only one place, the user-scoped connection point, is handed the credential fetch endpoint.** The "the declaration is in one place, and reading it shows the resolution path" that the check [0112](0112-data-classification-cache-boundary.md) places on credential resolution requires (`project-rules/no-captured-bearer-token`: only an imported endpoint may be passed as the fetch endpoint) is satisfied by the connection point passing the fetch endpoint it imported. The fetch endpoint resolves from the session on every request, and the connection point holds no credentials.

**As a consequence, user-scoped requests share the circuit breaker and retry budget.** When failures continue on one endpoint and it is tripped, other user-scoped endpoints also fail fast. This is exactly the design value of resilience with the downstream as its unit. Sharing happens within the same module graph; at boundaries where the framework builds separate graphs (such as the startup boundary and rendering), connection points are built separately too.

**Whether a request may be sent without credentials is declared by the request (`allowAnonymous`).** The contract declares per operation whether authentication is required (OpenAPI's `security`), so the client unit is too coarse. It may be set only where the contract includes `{}` in that operation's `security`; operations with `security: []` (no authentication required) pull the public connection point. Setting it by mistake only makes the request without credentials a 401 at the backend, not a leak. Enforcement: Prose — **mechanizable** (the contract's `security` and the request's `allowAnonymous` can be cross-checked per operation; no rule exists).

**Places that build a client outside a connection point write the reason on the spot.** This covers requests to an IdP that receive the connection target (issuer) per call or by injection, and the single round trip that establishes a session. Where building is allowed is declared by `CONNECTION_PORTS` in `architecture.ts`.

### Error normalization (do not leak raw status)

- Raw HTTP status is not leaked upward (feature / UI); it is **normalized into the classification (sentinels) of the `errors` kernel** ([0021](0021-frontend-responsibility.md) errors). The wrapper holds the mapping table HTTP status → stable error code (`NOT_FOUND` / `VALIDATION_FAILED`, etc.)
- **The details of the normalization table and conversion into user-facing messages are governed by [0080](0080-error-handling.md)**. This ADR defines the existence of the boundary "adapters normalize raw status and return it as an errors classification"
- Logging uses the `logging` kernel ([0021](0021-frontend-responsibility.md); config values are received by injection)

### The receiving point of runtime response validation

- Responses get **runtime validation at the `adapters` boundary** (zod `.parse()`). This is the point that implements [0070](0070-backend-role-separation.md) (ownership of boundary values = the frontend is the last line of defense against contract breaches), and generating the validation schemas is governed by [0072](0072-api-type-generation.md) (orval + zod)
- A response that fails validation (a contract breach) is treated as a normalized error (above)

### SSRF guard (conditional)

- On the normal path from the frontend to our own backend, an SSRF guard is **unnecessary**. Only when the `/api/*` BFF **calls external (untrusted) URLs** is an egress guard (destination allowlist) considered. This ADR records only the policy "unnecessary in the core; only when calling external URLs"

### Server Actions

- Mutating calls are made from Server Actions ([0040](0040-routing-rendering-strategy.md); `actions.ts` inside a feature) through the adapters' client. Server Actions only orchestrate and hold no business logic

### Caching and Revalidation of Data Fetching

[0040](0040-routing-rendering-strategy.md) defines only "no rendering mode is enforced", and the caching design of data fetching is held by this ADR. It settles **the caching and revalidation conventions of the data layer** (an axis separate from resilience; ownership of Next.js's data cache is placed here):

- **Built on uncached by default** (the Next.js 16 fact in [0040](0040-routing-rendering-strategy.md) = `fetch` is not cached by default), **caching is opt-in**. No global cache regardless of use is laid down by default
- **The owning layer of cache directives**: declaring what to cache (`use cache` / `cache: 'force-cache'`, etc.) and revalidation (`revalidateTag` / `revalidatePath` / `cacheLife` / `cacheTag`) are held by **the layer that owns data fetching = `adapters` (the fetch wrapper) and the Server Components / features that call it**. Like resilience, they are gathered at the boundary rather than scattered across components
- **Cache tag naming** corresponds to wire resources (operationId / entities), consistent with [0072](0072-api-type-generation.md)'s generation boundary. **The scheme has two levels, `<resource>` and `<resource>:<identifier>`**, and resource names are aligned with the collection names of the backend contract. Screen names and feature names are not used. **Tags are attached in one place, the `adapters` that owns the fetch**; that module exposes them as constants, and `features` / `app` use only those constants. The more sides write the strings, the more spelling mismatches appear as "invalidated, yet still stale"
- **Revalidation after mutations**: after a mutating Server Action (above / [0040](0040-routing-rendering-strategy.md) `actions.ts`) succeeds, the affected tags / paths are invalidated with `revalidateTag` / `revalidatePath` (or `router.refresh()`). This layer defines the default path that prevents "updated, yet the screen is stale / refetched twice". **The unit is the fetch endpoint that owns that data**: if the owning endpoint is in the cache, invalidate its tag; if not, re-render. A call that discards the whole app (`revalidatePath("/", "layout")`) is not an ownership boundary — it is an exception only when the updated value appears in the outer frame attached to every screen, with the reason written on the spot. **The exception names itself with `eslint-disable-next-line project-rules/no-app-wide-revalidate`** — if a marker is needed, align with the ecosystem's standard spelling and do not invent a prefix of our own (`docs/rules.md#comments`). **A form that places a dedicated endpoint in `adapters` is not adopted** — whether the exception is needed is decided by the screen side's circumstances, yet the endpoint would become part of the public surface of `adapters`. `adapters` is declared internal (`knip.ts`), so in a configuration with no screen pulling that endpoint, it would show up in the dead-code check as an export never called
- **Only what can be fetched without naming a principal may go into the cache**. The Data Cache is shared on the server side, and its key is URL, method, headers and body. Putting in a fetch that carries credentials splits the key per principal, so reuse hardly happens while only the stored entries multiply by the number of principals. **Do not attach tags (`next.tags`) to what is not put in** — tags attach only to what is in the cache, so both the side that attached them and the side that invalidates them appear to work while doing nothing
- **Deduplication**: duplicate fetches within the same request are eliminated with React `cache()` / fetch memoization, suppressing duplicate calls to the BFF and backend
- **`Cache Components` is enabled** ([0041](0041-cache-components-decision.md)). The uncached default above still applies; `use cache` is attached to what should be kept, the lifetime is held by `cacheLife`, and the tag for discarding by `cacheTag`. The owning layer (the fetch endpoint and the RSC that calls it), the spelling of tags, and the link to mutations do not change
- **`use cache` can be placed at three granularities** (page / function / component). **Lean it toward the fetch endpoint side.** Placing it on the calling side gives the same fetch a separate lifetime per call, scattering where the discard tags attach
- **Lifetimes are named by profile name.** The seconds are held by profiles defined in `cacheLife` in `next.config.ts`, and the endpoint side says only "what it is the lifetime of". The values alone can be moved without touching a single endpoint
- **Do not put `expire` on the profile of fetches that land in the static shell.** `expire` imposes a synchronous refetch on the single request right after traffic has stopped for that time, so if the fetch target cannot be reached then, a route that should have served its static shell falls entirely into failure. Without it, refetching always happens in the background, and even on failure the last content read keeps being served
- **What `use cache` reliably keeps is only what was baked into the static shell at build time.** The default store is process memory, so on serverless each request may land on a different instance and there are occasions when no reuse happens, and across deployments everything is discarded along with the keys. This is what is lost relative to `fetch`'s `cache: "force-cache"` (the Data Cache, which survives across deployments and instances), and **request-time reuse must not be read as a guarantee**. When there is a need to keep things across instances, choose `cacheHandlers` or `use cache: remote` — both depend on the deployment target, so the core does not choose ([0010](0010-standards-and-non-lockin.md))
- **Do not put individual cache directives (`cache` / `next.tags`) on fetches inside `use cache`.** The inside follows the outer lifetime as a whole, so holding it twice means the inside does not expire and the outside grabs the same stale response even when it refetches
- **A module that has `use cache` does not pull the kernel that builds clients directly.** It goes through **the connection point placed one per classification**. A module that can pull it directly is also in a position to build a user-scoped client, and the "before putting into the cache" stage of [0112](0112-data-classification-cache-boundary.md) rejects that import
- **An endpoint that has `use cache` is also called at build time.** The cache contents are produced during the build, so **reachability from the build environment to the fetch target becomes a premise**. When building in an environment that cannot reach it, choose `APP_API_MODE=mock` (the environment definitions of [0011](0011-no-docker.md)) — then the build stands up the handlers generated from the contract as an HTTP endpoint and is self-sufficient for the fetch target. This is a constraint accepted in exchange for fewer request-time round trips
- **User-scoped values are not placed under `use cache`** ([0112](0112-data-classification-cache-boundary.md)). The only means is `use cache: private`, and it is an explicit exceptional capability. Enforcement is held by `project-rules/no-user-scoped-in-cached-module` and the framework's `next-request-in-use-cache`
- Concrete values (what, how much, with which tag) are use-case dependent and not settled here (this ADR defines the owning layer and the default policy = opt-in, gathered at the boundary, linked to mutations)

### Implementation libraries

- Retry / backoff / circuit breaker are implemented ourselves on top of standard `fetch` + `AbortSignal`. Adding a utility goes through [0004](0004-library-management.md)'s adoption flow (exact pin / `pnpm audit`)

## Prohibitions

- ❌ Scattering raw `fetch` across components and features (go through the adapters' wrapper) (Enforcement: Prose — **mechanizable** (calls to `fetch` outside `adapters` could be rejected with the same `no-restricted-syntax` as the subscription `SUBSCRIPTION_CONSTRUCTION_SELECTOR`; no rule exists))
- ❌ Leaking raw HTTP status upward (normalize into the errors classification) (Enforcement: `src/adapters/server/http/request.test.ts` and `src/adapters/client/http/request.test.ts` reject the wrapper's mapping of status to classification, and ESLint `no-restricted-syntax` (`src/errors/**`) rejects bringing transport vocabulary into the errors kernel. Paths that do not go through the wrapper are Prose — **mechanizable** (no rule rejects raw `fetch` outside `adapters`))
- ❌ Unconditionally retrying non-idempotent methods (POST / PATCH) without an idempotency key (Enforcement: `src/adapters/server/http/retry-policy.test.ts` and `request.test.ts` (no retry for POST / PATCH without a declaration) reject the wrapper's default. Whether an `idempotent: true` declaration comes with an idempotency key is Prose — **not mechanizable**. The meaning of headers is not visible to the wrapper)
- ❌ Retrying without a retry budget / circuit breaker (preventing retry storms) (Enforcement: `src/adapters/server/http/request.test.ts` (fails without connecting while tripped / no retry once the budget is exhausted) and `retry-budget.test.ts` / `circuit-breaker.test.ts` reject the wrapper's retries. Retries written outside the wrapper are Prose — **not mechanizable**. Whether something is a retry is decided by the meaning of the control flow, not by shape)
- ❌ Writing business logic in the `adapters` fetch wrapper (external connection and conversion only; [0021](0021-frontend-responsibility.md)) (Enforcement: Prose — **not mechanizable**. Whether something is business logic or conversion for an external connection is a judgment about the layer's responsibility, not decided by the shape of the code)
- ❌ Building a client outside a connection point (one per combination of downstream and classification) (Enforcement: ESLint `project-rules/no-client-outside-connection-port`. Where building is allowed is `CONNECTION_PORTS` in `architecture.ts`; places that cannot be brought in line name themselves with a reason in `eslint-disable-next-line`)
- ❌ Passing responses into inner layers without validation (zod validation at the adapters boundary; [0070](0070-backend-role-separation.md) / [0072](0072-api-type-generation.md)) (Enforcement: types (the server / client wrappers take `schema` as a required argument) and both wrappers' `request.test.ts` (rejecting responses that differ from the contract as internal). Raw `fetch` that does not go through the wrapper is Prose — **mechanizable** (no rule rejects `fetch` outside `adapters`))
- ❌ Scattering cache / revalidation directives across components (gather them in the owning layer of data fetching = adapters / the calling RSC)
- ❌ Putting `cache` / `next.tags` on a `fetch` inside `use cache` (the lifetime becomes double, and the outer refetch grabs a stale response)
- ❌ Laying down a global cache regardless of use by default (uncached by default, opt-in) / leaving stale display by not revalidating affected tags / paths after a mutation

## Notes

- The BFF runtime config destination for values to change without redeploying (the responsibility [0030](0030-environment-variable-management.md) handed over) is handled in this layer (BFF / API integration). Caching is mandatory, and it is kept off user-perceived latency. The concrete design (endpoint / caching scheme) is settled per use case under this ADR's policy (if a design branch arises, this ADR is amended)

## Related ADRs

- [0070-backend-role-separation.md](0070-backend-role-separation.md) — thin proxy / contract SSOT / ownership of boundary values (this ADR's parent decision)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — responsibilities and dependencies of the `adapters` / `errors` / `logging` kernels
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — the two-sided server/client split of `adapters` and the client-side external connection boundary (subdivides this ADR's adapters)
- [0072-api-type-generation.md](0072-api-type-generation.md) — type + zod generation (the supplier of response validation schemas)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — Server Actions (the call site for mutations) / rendering modes (the caching design of data fetching is held by this ADR's "Caching and Revalidation of Data Fetching" section)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — where BFF runtime config escapes to
- [0080-error-handling.md](0080-error-handling.md) — the normalization table HTTP status → error classification and user-facing messages (the details of this ADR's error normalization)
- [0081-observability-logging.md](0081-observability-logging.md) — logging / trace propagation for the fetch wrapper
