---
imports-allowed: [model, errors, logging, config, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [components, capabilities, stores, business-logic]
test-requirement: integration
coverage-exclusions:
  - "src/adapters/server/taint/experimental-react.fixture.ts"
---

# adapters

The boundary adapters that hold external connections only: the backend API, BFF fetch, sending telemetry and
the like. They are split into `server/` and `client/` by execution context — **this is a split of placement,
not a split of the elements the boundary check sees** (where the elements divide is *Elements of This Layer*
below).

**What this app does not assemble a send for does not pass through here.** The bundled tag manager only loads its container, and the container's contents do the sending, so a client island in `app` takes it on ([0082](../../docs/adr/0082-client-observability.md)).
Rules that have no execution context — those that apply equally to requests either surface sends — go in `http/`, and the generated artifacts from the contract go in `gen/`. Both can be imported only from inside `adapters`.

## What Belongs Here

- Connections to external APIs / SDKs, and conversion from external types to display types
- Connections in `server/` that use secrets, and browser-facing connections in `client/`

## What Does Not Belong Here

- Business logic, UI, local browser APIs

## Elements of This Layer

The units the boundary check sees. **`server/` and `client/` do not appear here** — they are a split by
execution context, and the import permissions of both belong to the same `adapters`. What is split off is a
compartment, and **a compartment does not inherit the layer's permissions** — the layer's permissions apply
to the element type, so once carved out they no longer reach. That is why a compartment declares its own
dependencies itself.

| Element | Location | Reason for carving it out |
| --- | --- | --- |
| `adapters-gen` | `gen/` | Wire types generated from the contract. Left in the layer, they would pass straight through to `app` / `features`, which can reach `adapters` |
| `adapters-http` | `http/` | Rules for the shape of a request that both surfaces follow. Placed on one surface, they would not reach the other, and the rule would split in two |
| `adapters-auth` | [`server/auth`](server/auth) | Sealing and restoring the session. The optimistic check at the entry point needs only this, so `proxy` is spared from opening the whole of `adapters` |

**The dependency values are not copied here.** The source of truth is `RESTRICTED_AREAS` in `architecture.ts`,
and each compartment README's `imports-allowed` is generated from it (`pnpm gen:architecture`). A directory
that is not a compartment — one that merely divides placement within this layer, such as `server/http/` or
`client/telemetry/` — declares no boundary and inherits this README's declaration.

## Shape of a Fetch Endpoint

`server/api/<resource>.ts` holds the endpoints for one resource. One endpoint is made of three components.

| Component | Shape | Role |
| --- | --- | --- |
| Wire type | `type Wire<Resource> = z.infer<typeof <Operation>Response>` | The contract's shape. **Never leaves the module** |
| Mapper | `function to<Resource>(wire: Wire<Resource>): <Resource>` | From the contract's shape to `model`'s display type. Converting to `Date`, converting identifiers to branded types, and dropping fields not used for display happen here |
| Endpoint | `export const get<Resource> = cache(async (...) => to<Resource>(await get<Kind>Client().request({ ... })))` | Takes the connection point and returns the mapped value. This is the only public surface |

- **Wrap read endpoints in `react`'s `cache()`; do not wrap write endpoints** ([0071](../../docs/adr/0071-bff-api-integration.md), deduplication).
  It is normal for the outer frame and the screen to read the same value within one render, and requiring callers to
  "call it only once" makes the number of fetches change every time the tree is rearranged.
- **Distinguish how absence is expressed by prefix.** An endpoint for which absence is normal (the contract defines empty
  or `404` that way) is `find*` and returns `null` or empty; an endpoint for which absence is a failure is `get*` and
  throws `not-found`. `find*` folds only `not-found` — fold communication failures into "absent" too and an outage
  looks like something unregistered.
- **A `read*` endpoint folds an auxiliary value exactly once.** For a value the screen can stand without (such as a reference value accompanying the main subject), stack an endpoint that
  "records and returns `null` if it cannot be read" on top of the throwing endpoint, and the screen takes only that one. Letting each screen
  decide whether it may drop the value multiplies the same judgment by the number of screens and produces screens where only one side drops. The
  fact that it could not be read is recorded with `logging`'s `reportQuietly`.
- **Wrap variable path segments in `encodeURIComponent`.** The request boundary rejects `.` / `..` segments, but anything
  else is the wrapping side's responsibility.
- **Pass contract-defined headers per request through `headers`** (idempotency keys, identifiers the contract defines on
  its own). Where the contract defines a precedence, do not choose here; send both — choosing creates the same rule in two places.
- **The contract decides the order.** A list whose order the contract declares is not re-sorted when mapped, and numbers that
  exist only for sort order are dropped.
- **Do not expose internal identifiers on the public surface.** A value that an update or delete uses to point at its target
  is resolved by a memoized endpoint that is not `export`ed (shared by reads and writes within one render), and is not included in the type passed to the screen.
- **Do not accept conditions outside the contract's vocabulary.** For a period, accept only a half-open interval of instants (`model`'s `TimeWindow`);
  resolving "today" or "this month" on the calendar is the screen's job.

**Limits, enums and formats the contract defines are re-exported from the generated artifacts rather than copying their numbers or spellings**
([0072](../../docs/adr/0072-api-type-generation.md), [docs/rules.md](../../docs/rules.md#url)).
In the form `export const <RESOURCE>_MAX: number = <generated constant>`, this layer is what hands them outward — `gen/` can be
reached only up to here. A table of spellings (such as the names of sort orders) is checked against the generated schema's type, as in
`as const satisfies Readonly<Record<string, Wire<Resource>Query["sort"]>>`.
When a value disappears from the contract the declaration becomes a type error, so a hand-copied list never silently stays stale after regeneration.

## Write Endpoints

- **Check the body against the generated type with `satisfies`** (`body: { ... } satisfies <Operation>Request`). As with the mapper,
  this is so a type tells you when the contract moved.
- **A create with no natural key always takes an idempotency key.** Even if the contract makes it optional, a resend without one simply
  becomes a second record. The caller creates the key (at the point the screen was opened) — create it on every send and a double submit becomes two
  records; the key must be bound to "one attempt". Only an endpoint that passes a key declares `idempotent: true`.
  The wrapper does not retry a `POST` / `PATCH` that does not declare it
  ([0071](../../docs/adr/0071-bff-api-integration.md)). An `idempotent: true` without a key fails neither the types nor any check.
- **Do not resend an operation that cannot be resent.** A create with no natural key, an increment (relative update), a multipart save and a state transition
  each either happen twice or become `conflict` if delivered twice. When no response came back, the only way to know whether it succeeded is to refetch
  and check.
- **Do not pass a state transition's response to the inner layers.** If the transition's response falls short of the screen's shape, the endpoint's
  responsibility ends at verifying that "a response matching the contract came back", and the screen refetches the changed value.
- **Do not mix updates that carry a version with relative updates.** A full replacement carries `version`, and the wrapper normalizes a mismatch to
  `conflict`. An increment carries no version — concurrent increments are not lost, so there is no reason to detect and reject
  a conflict.
- **To distinguish "leave untouched" from "clear" in a partial update, go through `PatchPayload<T>` in
  [`server/http/patch-payload.ts`](server/http/patch-payload.ts).** `JSON.stringify` drops keys whose value is `undefined`, so `{ name: undefined }`
  and `{}` are identical on the wire. To leave a field untouched, omit the key; to clear it, send `null` explicitly.

## Checking URL Conditions Against the Contract

How to decide between falling back and dropping is owned by [docs/rules.md](../../docs/rules.md#url). What this section holds is
the shape of the endpoint that drops values by checking them against the contract.

1. The Route Handler maps `URLSearchParams` to its raw form (a repeated key becomes an array) with `toRawQuery()` in
   [`server/http/search-params.ts`](server/http/search-params.ts). It does not interpret values
2. The endpoint's `parse<Resource>Query(raw)` coerces only the keys the contract declares as numbers, booleans or arrays. URL values are always
   strings, so without coercion they fail against an integer declaration. **Booleans coerce only `"true"` / `"false"`, and an unreadable
   spelling stays a string** — coercing it lets a typo silently fall to one side. For arrays, a condition with only one selection
   arrives as a single string, so it is normalized to an array, and duplicates are folded
3. Pass it through `safeParse` of the generated schema (`<Operation>QueryParams`). If the contract keeps a deprecated alias that fails when sent
   together with its successor, narrow to a single entry with `.omit()`
4. Return `{ ok: true, query } | { ok: false, invalidKeys }`. Rejected keys are returned as plain names rather than the validation
   library's types, and the screen decides how to show them

**The user decides the keys.** Writing into an empty object by index makes `__proto__` an assignment target, so build an array
and fold it with `Object.fromEntries`.

**The set of conditions that decides which records match is shared by the list and the count.** The offset and the sort order do not affect the count,
so they are not included. Add a condition to only one of them and the count shown disagrees with the list's contents.

## The fetch endpoint declares the value classification

**`createHttpClient` always takes a classification** ([0112](../../docs/adr/0112-data-classification-cache-boundary.md)).
A client is built by exactly one connection point per classification (`getPublicClient()` /
`getUserScopedClient()` in [`server/http/`](server/http/README.md)), and a fetch endpoint takes the connection point that matches its classification.

| Classification | What it carries | What it can hold |
| --- | --- | --- |
| `scope: "public"` | What can be fetched without naming a principal | `cache` / `tags`. **The type has no slot** for a credential source |
| `scope: "user-scoped"` | What is tied to a principal | Credentials. **The type has no slot** for `cache` / `tags` |

**An endpoint that can attach credentials is user-scoped, including the times it did not attach them.** Setting `allowAnonymous: true`
does not change this. The classification is a property of the endpoint, not a per-request outcome, so it is decided statically and can be closed off by types.

**A value that points at a principal is not necessarily a credential.** A header carrying an identifier the contract defines on its own also points at a principal.
An endpoint that carries such a value is also user-scoped — the test is not "is it authenticated" but "does the response vary
by principal".

What the classification closes off is the path by which "PII enters a shared cache". The store is shared on the server side and its key is the URL,
method, headers and body, so if a value that varies by principal lands there, one principal's response is handed to another.
**It is made the absence of an argument rather than a warning** because a warning protects only those who read it.

When a user-scoped value needs caching, the only means is `use cache: private` (not stored on the server; held only in the browser's
memory). **This is an explicit exception capability, not a general permission.**

## `use cache` is what persists across requests

**The fetch endpoint owns the lifetime** ([0071](../../docs/adr/0071-bff-api-integration.md)). Declare
`use cache` inside the endpoint that persists; `cacheLife` holds the lifetime and `cacheTag` holds the marker for discarding. Put them on the caller (feature / page)
and the same fetch gets a different lifetime per call site, and the places markers are attached scatter.

**Do not give the inner `fetch` a lifetime.** Fetches inside `use cache` all follow the outer lifetime, so
holding both means the inner one does not expire, and the outer one grabs the same stale response even when it refetches.

**Split discard markers by what triggers a change.** The spelling of markers is owned by [docs/rules.md](../../docs/rules.md#data-classification).
Aggregates and rankings change on different events, so piggybacking them on the resource's marker leaves stale
aggregates in place until the resource is touched — such an endpoint has no marker and is not cached either. **Do not keep a response
that includes its shape while something is down, either.** Under a contract that represents an external lookup being down as an empty candidate list, keeping it means serving empty even after recovery.
Even within the same public classification, how lifetime is thought about differs per endpoint.

**A lifetime is named by profile name; the seconds are held by `cacheLife` in `next.config.ts`.** The endpoint says only "what
lifetime it is", so values can move without touching the endpoint. **Do not put `expire` on the profile of a fetch that lands in the static shell**
— `expire` imposes a synchronous refetch on the one request right after traffic has been absent for that time, so if the fetch cannot reach its source there,
a route that could have served its static shell falls entirely into failure.

**What reliably persists is only what was baked into the static shell at build time.** The default store for `use cache` is process memory, so
on serverless, requests can land on different instances and some times no reuse happens, and across deploys the keys are
discarded wholesale. The "persists across deploys and instances" property that `fetch`'s `cache: "force-cache"` had is
lost here; **do not read request-time reuse as a guarantee**. When it becomes necessary, choose
`cacheHandlers` or `use cache: remote` (it depends on the deployment target, so the core does not choose).

**A module that has `use cache` cannot take `createHttpClient` directly.** A module that can take it directly is
in a position to build a user-scoped client too, and `project-rules/no-user-scoped-in-cached-module` stops it.
Instead, take **the connection point that builds only the public classification** (`getPublicClient()`) — that endpoint can build only
public clients, so the classification cannot be confused under a cache. The check reads direct imports and
one step beyond them ([docs/rules.md](../../docs/rules.md#data-classification)), so a module that takes the user-scoped connection point
cannot be taken from under `use cache` either. If you need an endpoint that reads the same resource without naming a principal (such as a sitemap that
walks a list to its end), put it in a separate module that takes only the public connection point.

There is one more reason for exactly one connection point per classification. The retry budget and the circuit breaker live inside the client
as state, so splitting clients toward the same downstream splits the judgment of whether it has degraded by the number of splits.
**The user-scoped side is consolidated into a single `getUserScopedClient()` for the same reason, and as a consequence all user-scoped endpoints
share one circuit breaker** — when failures persist on one endpoint and it trips, the other
user-scoped endpoints in the same module graph also fail without connecting ([0071](../../docs/adr/0071-bff-api-integration.md), the fetch wrapper's
resilience).

**Only a connection point (`CONNECTION_PORTS` in `architecture.ts`) can build a client.** Building one elsewhere is failed by
`project-rules/no-client-outside-connection-port`. A place that cannot be consolidated, such as a request to an IdP that takes its destination per call,
declares itself with `eslint-disable-next-line` and a reason.

## The connection point decides whether credentials are attached; the request decides whether sending is allowed

**Only the user-scoped connection point is given the credential source (`getBearerToken`).** Have each fetch endpoint
pass it, and every request from an endpoint that forgot to pass it goes out anonymously, failing neither the types nor any check.

**Whether a request may be sent when no credential could be obtained is declared by the request through `allowAnonymous`.** The contract declares whether
authentication is required per operation (OpenAPI's `security`), so the client is too coarse a unit. Set it only for operations whose
`security` the contract makes include `{}`. An operation with `security: []` takes
the public connection point. Even when set, a credential that was obtained is still attached. A request without it, when no credential can be obtained,
is not sent and fails with `unauthenticated`.

**Pass only the imported source.** Grabbing the value that builds `Authorization` on the spot breaks the pattern of reading `cookies()`
on every request, and the cached-scope defence (`next-request-in-use-cache`) silently drops off.
Only the single round trip that establishes a session, before any cookie exists, passes it under a different spelling, `bearerToken`.

Setting `allowAnonymous` wrongly fails neither the types nor any check. Set it on an operation that needs authentication and the times a credential
could not be obtained are also sent anonymously, and **the only way to notice is when the backend returns 401**.

**Do not attach credentials to a destination whose origin differs from the connection target.** A request given an absolute URL leaves the connection target, so attaching
credentials would hand them to that destination. The destination can come from an outside response such as Discovery, and a
convention of passing only relative paths does not stop it, so the request boundary compares origins to decide.

## Holding a backend-issued identifier in a cookie

The shape for placing an endpoint that, separately from authentication, entrusts the browser with an identifier the backend issued (one that can be held even unauthenticated).

- **Borrow the attributes from `baseCookieOptions()` in [`server/auth/session-cookie.ts`](server/auth/session-cookie.ts).** The rule of including the purpose in the prefix and the attribute defaults are owned by
  [docs/rules.md](../../docs/rules.md#data-classification), and each endpoint writes only its own judgment. It is kept separate from the authentication cookie because neither its lifetime nor its principal
  matches the session.
- **Match the lifetime to the issuer's expiry.** If the expiry is unknown, keep it until the browser closes; do not pick a number of years here.
  A cookie pointing at a target that has already disappeared becomes a value that points at nothing.
- **Treat an empty value as not held.** A state where the cookie remains but its content is empty can occur, and sending it as is
  makes the backend reject it as a shape violation.
- **Only the response of the operation that creates the issued value may receive it.** A response that does not carry it does not clear the local cookie,
  because the identifier already held is still alive.
- **Discard it in the logout teardown.** So that the next user to open the screen does not see the previous user's data.
- **Do not place it where the browser can read it.** Since that value is the only means of access, exposing it directly becomes a path
  to someone else's data.

## URL Budget

**A request that carries conditions in its URL has a budget of one.** Every hop on the path — browser / CDN /
reverse proxy / backend — has a limit on request-line length, and a request that exceeds it is
rejected before reaching the backend. The limits the contract declares for each condition compete for this one budget.

What is counted is **the byte length of the request target — the path and the query**. It is exactly the part carried on the request line,
so the same thing can be counted across paths to different targets. It is not a character count. One full-width character is 3 bytes in UTF-8
and expands to 9 characters when encoded.

**When you widen a contract's limit, recompute the budget.** A string condition's `maxLength`, a repeated condition's
`maxItems`, the cursor length — any of them moving changes the allocation. What one condition grows is subtracted from the room
the other conditions can use.

<!-- sample:begin -->
In the bundled sample, with every declared limit maxed out on the product list (`GET /v1/products`):

| Condition | Basis of the limit | Bytes |
| --- | --- | --- |
| `categoryCodes` × 32 | `maxItems: 32` / values up to 5 digits | 640 |
| `statusCodes` × 32 | Same as above | 576 |
| `keyword` | `maxLength: 255`. A full-width character expands to 9 bytes | 2,304 |
| `minPrice` / `maxPrice` | `maxLength: 40` × 2 | 100 |
| `minQuantity` / `maxQuantity` | int32, 10 digits × 2 | 46 |
| `sort` / `first` | enum and 3 digits | 28 |
| `after` | `maxLength: 512` | 519 |
| **Total** | | **about 4.2 KB** |

Filling `keyword` with 4-byte characters (emoji and the like) expands each character to 12 characters, and the total becomes about 5.0 KB.
Against the practical threshold (around 8 KB), it cannot be exceeded as long as the contract is honoured — conversely, the moment a limit
is widened this calculation breaks.
<!-- sample:end -->

**The threshold is the length the path rejects first; in practice it is around 8 KB.** The value is held by `NEXT_PUBLIC_HTTP_MAX_URL_BYTES`
([env/README](../../env/README.md)). It is not a literal because which hop rejects first is decided by the delivery
setup. Rewrite it to the minimum on your own path. `NEXT_PUBLIC_` is
replaced with a literal at build time, so changing it requires a rebuild.

The check is a single one in `http/url-budget.ts`, and only the two request boundaries call it —
`server/http/request.ts` and `client/http/request.ts`. **No per-screen pre-check is placed.** A screen cannot in principle know
the threshold, and placing one would multiply guessed constants by the number of screens. An overrun fails as `uri-too-long`, and
appears on the screen as one classification in `errors` ([0080](../../docs/adr/0080-error-handling.md)).

## Browser-Originated Fetch Endpoints

`client/api/<resource>.ts` holds only the endpoints that call the same-origin BFF (`app/api/**`) with `request()` in
[`client/http/request.ts`](client/http/request.ts), and the shape of the bodies a subscription carries
([0073](../../docs/adr/0073-pagination-fetch-boundary.md)).

- **Write the validation schema by hand.** What this path receives is not the backend's response but the display shape the BFF built,
  so the contract's generated artifacts have a different shape and do not pass. It is still validated because the principle of not passing an unvalidated response to the UI
  applies equally on the client side.
- **The server-side endpoint reduces what an incremental fetch receives to a shape JSON can carry.** If the first page (via RSC) and
  the continuation (JSON) differ in `Date` or in whether optional values are present, the display breaks partway through the accumulated list. Dates that became
  strings through JSON are restored here with `z.coerce.date()`.
- **`client/` uses `zod/mini`.** `request()` accepts `zod/v4/core`'s `$ZodType`, so
  the flavour does not matter — if a shared layer required one flavour, callers' migration would stall on that one place.
- **No endpoint carries a body.** Operations that create state from the browser belong to Server Actions. What passes here is only
  fetches and argument-less `POST`s such as ticket issuance.
- **No timeout, retry or circuit breaking.** `adapters/server` holds those behind the BFF, and holding them here too
  would run two retries with separate accounting on the same request.
- **Do not fold `401` / `403` / `404` into internal failures** ([0080](../../docs/adr/0080-error-handling.md)).
  A screen whose session expired while reading needs to prompt a re-entry, and a subscription that keeps reconnecting cannot stop unless it can tell
  a counterpart that will not recover.
- **An endpoint that swallows failures is placed under a different name from the throwing endpoint.** Only for endpoints like autocomplete, where "do nothing" is correct even when it cannot be reached,
  and even then a thrown failure is not reinterpreted as a different meaning such as "the mechanism is broken" — what is unknown
  stays unknown.
- **Place constants the client only reads in a module separate from the one holding the validation schema**
  ([docs/rules.md](../../docs/rules.md#url)). An import that reads one `const` puts the whole zod schema set
  into the browser bundle.

## Relaying Browser-Originated Telemetry

**Do not let the browser call the collector directly** ([0081](../../docs/adr/0081-observability-logging.md)).
Neither the endpoint nor the credentials are exposed to the browser; the same-origin BFF receives it and puts it onto OTLP. This path
splits into three, and each boundary holds something different.

| Location | What it holds |
| --- | --- |
| `http/telemetry-report.ts` | The report shape shared by the sending and receiving sides. Only the types and the lengths to truncate to before sending |
| `client/telemetry/report-telemetry.ts` | Assembles measurements and exceptions into reports and sends them with `sendBeacon` |
| `client/telemetry/browser-tracer.ts` | Browser-side instrumentation. Loaded only through a dynamic import |
| `server/telemetry/browser-telemetry.ts` | Validates reports and puts them onto signals |
| `server/telemetry/browser-traces.ts` | Hands spans the browser created to the collector |

**Validation exists only on the receiving side.** The sending side has the same length declarations, but those exist to keep traffic down,
and the sender can be replaced. It is an endpoint that requires no authentication, so the receiving side checks for itself
([0077](../../docs/adr/0077-bff-abuse-protection-boundary.md)).

**Only the receiving side can import `observability`.** Web Vitals are emitted as per-metric histograms,
so it touches OTel's Metrics API, and exceptions are recorded in the context of the returned `traceparent`, so it touches the trace-correlation API
([0082](../../docs/adr/0082-client-observability.md)).
**This permission mechanically extends to `client/` too.** The boundary check does not distinguish `server/` from `client/` —
what separates elements is the compartment, not the execution context, and both `server/` and `client/` sit in the same `adapters` element
(*Elements of This Layer* below). What actually works is **`observability` declaring `server-only` per
module**, so the build fails the moment the client takes it. **The only one that does not declare it is
`render-span.ts`**, a surface features import, so it intentionally enters the browser bundle
([observability/README.md](../observability/README.md)) — **neither the layer check nor `server-only` stops that.**
The same shape exists for `config` — ADR 0021 permits server config only to `adapters/server`, but
mechanical enforcement applies at layer granularity.

**Browser-side instrumentation is loaded only through a dynamic import.** The request boundary (`client/http/request.ts`) is loaded the moment
a screen opens, so drawing an edge from there to OTel would put the weight of instrumentation on the initial load. What turns a request into a
span is the instrumentation that wraps `fetch`; the request boundary's code knows nothing of instrumentation.

**It wraps more than the requests you make yourself.** RSC requests the router issues for screen transitions and prefetching are also
covered. Wrap only the places you call yourself and client transitions drop out of the trace and become roots of separate traces.
In exchange, more spans land in one trace — prefetches are issued for as much of the screen as is visible.

## A subscription holds only the opening-and-reading side

The side that **holds** the long-lived connection is the backend; this layer is the side that **opens and reads**
([0074](../../docs/adr/0074-runtime-communication-seam.md)). It holds only the locations below, and holds neither the connection,
nor event numbering, nor who gets what.

| Location | What it holds |
| --- | --- |
| `client/stream/subscription.ts` | The state machine of one subscription. The branches for ticket issuance, connection, reconnection and giving up |
| `client/stream/ordering.ts` | The window that fixes out-of-order arrival, and the memory of the position delivered |
| `client/stream/backoff.ts` | The wait before reconnecting |
| `client/stream/envelope.ts` | Reading the envelope and control directives. **Holds no body shape** |
| `client/stream/cursor.ts` | How positions are represented and compared |
| `client/stream/use-stream.ts` | Binds a subscription to a component's lifetime |

**The body shape is declared by the per-resource module** (`client/api/<resource>.ts`). The envelope is the same regardless of feature,
while the contents differ per event type. A type not in the contract fails that validation and does not flow upward.

**The browser connects directly to the backend's stream.** `EventSource` cannot carry arbitrary headers, so
the credential arrives as **the URL to connect to**, carrying in its query a short-lived ticket issued by the same-origin relay (`app/api/**/stream-ticket`).
The ticket is not passed as a value because the more the browser side assembles and handles it, the more paths there are
to copy it into UI text or logs.

**A round trip the contract-driven mock cannot represent is refused at the ticket endpoint** ([mocks/README.md](../../mocks/README.md#購読sseは差し替えません),
*Subscriptions (SSE) are not replaced*). If only the ticket issuance succeeds, the browser keeps reconnecting to a destination that does not exist.
When `getApiConfig().mode === "mock"`, the ticket endpoint throws `not-found`, stopping the screen in the same state as when there is
nothing to subscribe to.

**The `integration` declaration does not apply.** The subscription's round trips with the outside are taken as
arguments — clock, randomness, waiting and connection — and what is checked is the state machine's branches. There is no HTTP boundary to imitate,
so it is verified in the `unit` shape — feeding inputs (reversed order, duplicates, delays beyond the window, control directives) and matching transitions directly.

## Register what must not be passed to the client

`server/taint/taint.ts` is the hook for [0030](../../docs/adr/0030-environment-variable-management.md).
Pass a tainted object or value to a Client Component and **rendering fails at runtime**.

| What is tainted | Example | Where it is registered | Lifetime |
| --- | --- | --- | --- |
| Server objects containing credentials | The session record (holding an Access Token / ID Token) | Where that object is born | The object itself |
| Fetch results containing PII | A principal's details with contact details, address and date of birth | The fetch endpoint (right after mapping the contract's shape to the display type) | The object itself |
| String secrets | Signing keys, external service keys | The side that **reads** the value (`config` cannot bring in react) | The singleton holding the value |

**This layer does not decide what is PII.** The classification and where it lives are owned by
[0112](../../docs/adr/0112-data-classification-cache-boundary.md); this layer only carries that classification over to a
runtime checkpoint.

### Reference Implementation

Taint the mapped value at the fetch endpoint. **Do not taint at the call site** — every new endpoint would need the same line,
and a path where it was forgotten becomes a hole as is.

```ts
export const getAccount = cache(async (): Promise<Account> => {
  const account = toAccount(
    await getUserScopedClient().request({ path: "/v1/accounts/me", schema: GetAccountResponse }),
  );

  taintObjectReference(
    "主体の詳細には連絡先が含まれます。Client Component へ渡すのは画面が使う項目だけにしてください",
    account,
  );

  return account;
});
```

A string secret registers the value itself. It cannot be tracked by reference, and the registration's lifetime is held by
the singleton that holds the value.

```ts
taintUniqueValue("署名鍵は server 専用です", config, config.sessionSecret);
```

**The message is the only clue for whoever hits the failure.** Write not only "do not pass this" but what to pass instead.
The failure happens at the passing side, and whoever is there does not know what to choose.

**It is not the primary mechanism.** It tracks only by reference, so it does not reach copies (`{ ...record }`) or derived values
(`` `Bearer ${token}` ``). The primary defence is minimizing fetch scope and the Client DTO; this is an aid that catches, at runtime,
a mis-send that got past that ([0112](../../docs/adr/0112-data-classification-cache-boundary.md)).

**Go through this hook rather than calling `react` directly.** Tests replace this module boundary, and that the real thing works is
confirmed by `taint/taint.test.ts` with the RSC serializer. This avoids placing an "if the hook exists, call it" branch inside the defence
— with one, the check silently drops off along with the hook the day it disappears.

## Operations

- **The `integration` declaration applies to modules that make round trips with the outside**. Those that directly hold `fetch` (or an injected
  `fetchImpl`) are covered, and there the HTTP boundary alone is the subject, mocking the inside to check types and shapes
  ([0090](../../docs/adr/0090-testing-strategy.md)). **Pure conversions with no external IO**
  (`http/url-budget.ts` / `server/http/search-params.ts` / `server/http/retry-policy.ts` /
  `server/http/error-status.ts` / `server/http/error-response.ts` / `server/http/json-request.ts` /
  `client/telemetry/route-pattern.ts` / `server/telemetry/browser-telemetry.ts` and others that only map
  values before and after the boundary) are verified in the `unit`
  shape — matching values directly without imitating HTTP. Imposing a boundary test on something without a boundary
  leaves nothing to check against. **`http/` holds only this shape** — it is the place for rules with no execution context,
  so anything with round trips to the outside belongs to `server/` or `client/`
- **For an endpoint with `use cache`, the lifetime profile name and the `cacheTag` arguments are also observed**. They are
  declarations outside the HTTP boundary, but getting their spelling wrong fails neither the type check nor lint, and surfaces at runtime only as
  "invalidated but still stale". Replace `next/cache` at the module boundary and check what the endpoint declared.
  **That is as far as it can be checked** — whether the declared profile name exists in `next.config.ts`, and whether caching
  actually takes effect, cannot be known in this layer (the former is the build's, the latter the static shell measurement's)
- **MSW imitates the HTTP boundary** (only in files that import `vitest.setup.msw`;
  [docs/testing-conventions.md](../../docs/testing-conventions.md)). `serveJson` / `serveStatus` /
  `serveWrite` assign responses, and `watchFetch` inspects the `fetch` arguments passed to the wrapper. Credentials are replaced at the module boundary through
  `../auth/session`, and configuration through `@/config/environment` with `PARSED_ENVIRONMENT`.
  A client-side endpoint only needs `vi.stubGlobal("fetch", ...)`
- **`<endpoint>.contract.test.ts` assigns no responses and works against the handlers generated from the contract itself**
  ([`scripts/lib/untested-modules.ts`](../../scripts/lib/untested-modules.ts)). The fields a mapper exposes are matched
  as an array with `Object.keys(...).sort()` — the generated handlers return every field of the contract, so checking only a few fields
  lets both mapping omissions and leaked wire fields pass. Only cases that look at the mapper's branches themselves assign responses.
  Relying on randomly drawn results makes the seed's consumption sequence shift and fail every time the mock's value range changes

- `server/` may use server config; `client/` does not use secrets
- External and generated types are converted here and not leaked inward

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: components` — do not import UI components | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) dependency matrix. Machine: ESLint boundaries |
| `forbidden: capabilities` — do not import `capabilities`. Local browser APIs such as reading storage / clipboard / cookies do not go here either | An import is a violation (the machine fails it). References to `localStorage` / `sessionStorage` / `navigator.clipboard` / `document.cookie` are also violations | [0024](../../docs/adr/0024-adapters-server-client-split.md) prohibitions. Machine: ESLint boundaries (imports only) |
| `forbidden: stores` — do not import `stores` | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) dependency matrix. Machine: ESLint boundaries |
| `forbidden: business-logic` — hold only connections and the conversion from external shapes to display types. Do not compute values the contract does not return | violation. When it cannot be read whether something is a conversion or a business judgment, suggestion | [0070](../../docs/adr/0070-backend-role-separation.md) prohibitions / [0021](../../docs/adr/0021-frontend-responsibility.md), the responsibilities it assigns each kernel |
| `client/` does not import server config (`*.server.ts`) and holds no secrets. It may read `NEXT_PUBLIC_` public constants | violation | [0024](../../docs/adr/0024-adapters-server-client-split.md) prohibitions / this README, *Relaying Browser-Originated Telemetry*. The machine sees only layer granularity and does not distinguish `server/` from `client/` |
| No client hooks or `"use client"` in `server/`. Conversely, no `server-only` modules in `client/` | violation | [0024](../../docs/adr/0024-adapters-server-client-split.md) prohibitions |
| The type the public surface returns is a display type; `gen/`'s generated types are not passed straight through | A violation if the public surface's declaration names a generated type. A suggestion if a generated type escapes through inference | [0070](../../docs/adr/0070-backend-role-separation.md) prohibitions / this README, *Operations*. The machine fails direct imports of `gen/` only |
| Only the relay's receiving side (`server/telemetry/`) imports `observability` | violation | This README, *Relaying Browser-Originated Telemetry*. The machine sees only layer granularity |
| Values that must not be passed to the client are tainted at the fetch endpoint, not at the call site. `react`'s taint API is called through `server/taint/taint.ts` | A violation if `react`'s taint API is called directly outside `taint.ts`. A suggestion if a fetch endpoint containing PII does not taint (what is PII is owned by 0112) | This README, *Register what must not be passed to the client* / [0112](../../docs/adr/0112-data-classification-cache-boundary.md) |
| Contract-derived limits, enums and formats are re-exported from `gen/`, not copied as numbers or spellings | A violation if a numeric literal or string table is declared separately when the generated artifacts hold the same declaration. A table checked against a generated type with `satisfies` passes | [0072](../../docs/adr/0072-api-type-generation.md) / [docs/rules.md](../../docs/rules.md#url) / this README, *Shape of a Fetch Endpoint* |
| A create endpoint with no natural key takes an idempotency key, and `idempotent: true` is set only together with a key | A violation if an `idempotent: true` request lacks the `Idempotency-Key` header. A suggestion for a create endpoint that takes no key (whether a natural key exists is owned by the contract) | [0071](../../docs/adr/0071-bff-api-integration.md) prohibitions / this README, *Write Endpoints* |

## Related ADRs

The decisions this layer's code depends on. **Comments do not point at ADRs directly; they follow this section** —
ADR numbers and sections both move, so the place where a move can be noticed is consolidated into one ([docs/rules.md](../../docs/rules.md#comments)).
Compartments with their own child-directory README ([`server/auth`](server/auth) /
[`server/http`](server/http) / [`server/telemetry`](server/telemetry) /
<!-- sample:replace-begin -->
[`client/stream`](client/stream) / [`client/telemetry`](client/telemetry) / [`gen`](gen)) are covered by that README's section.
<!-- sample:replace-with -->
<!-- = [`client/stream`](client/stream) / [`client/telemetry`](client/telemetry)) are covered by that README's section. -->
<!-- sample:replace-end -->

- [0024](../../docs/adr/0024-adapters-server-client-split.md) — The `server/` / `client/` split, and the external connection boundary on the client side
- [0021](../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries (only `server/` can take server config)
- [0020](../../docs/adr/0020-adopted-architecture.md) — Inward dependencies, and not leaking external types into inner layers
- [0070](../../docs/adr/0070-backend-role-separation.md) — The line of responsibility with the backend. Holding no business logic
- [0071](../../docs/adr/0071-bff-api-integration.md) — The external API client and fetch wrapper, and fetch endpoints owning lifetimes
- [0072](../../docs/adr/0072-api-type-generation.md) — Generated artifacts from the contract, and taking limit and format constants from `gen/`
- [0073](../../docs/adr/0073-pagination-fetch-boundary.md) — The fetch boundary for pagination and incremental fetching
- [0075](../../docs/adr/0075-file-upload-seam.md) — The file upload seam (signed direct PUT and the multipart exception)
- [0079](../../docs/adr/0079-auth-frontend-seam.md) — The boundary that builds credentials, and handling requests that name a principal
- [0080](../../docs/adr/0080-error-handling.md) — Normalizing backend-originated failures into classifications
- [0081](../../docs/adr/0081-observability-logging.md) — Not letting the browser call the collector directly; the BFF relays
- [0082](../../docs/adr/0082-client-observability.md) — Collecting Web Vitals and client exceptions, and where the sending surface lives
- [0112](../../docs/adr/0112-data-classification-cache-boundary.md) — Fetch endpoints declare their classification, and the type closes off the cache and credential slots
- [0030](../../docs/adr/0030-environment-variable-management.md) — Handling secrets, and the hook that registers what cannot be passed to the client
- [0040](../../docs/adr/0040-routing-rendering-strategy.md) — Revalidation triggers (stale values remain until a refetch happens)
- [0090](../../docs/adr/0090-testing-strategy.md) — Per-layer verification responsibilities (the range the `integration` declaration covers)
