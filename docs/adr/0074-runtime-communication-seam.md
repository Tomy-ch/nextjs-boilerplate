# Bidirectional / Streaming Communication Seam (WebSocket / SSE)

The fetch wrapper in [0071](0071-bff-api-integration.md) builds its resilience (dual timeout / retry / retry budget / circuit breaker) on the **request/response (single round trip) assumption**. This ADR makes explicit **bidirectional / streaming communication (WebSocket / SSE)**, which that round-trip model structurally does not handle, as **a service not bundled (exclusion) + a named extension point (seam)**, and settles the contract for materializing the seam — transport / authentication / event granularity / ordering assumptions / reconnection / where mocks stop. The seam's physical "home" is already owned by [0024](0024-adapters-server-client-split.md) (`adapters/client`), so this ADR **wires it without re-deciding it**.

## Status

Accepted

## Context

The fetch wrapper in [0071](0071-bff-api-integration.md) **assumes request/response** and **has no endpoint for bidirectional or streaming communication**. This is "a runtime concern outside 0071's default model", and adding it later without a seam does not fit the dependency matrix of [0021](0021-frontend-responsibility.md).

The **physical placement** of this seam is already settled: client-side subscription IO is explicitly taken on by the **`adapters/client` element** of [0024](0024-adapters-server-client-split.md) (remote external system × client); 0024's decision table lists "WebSocket / SSE". **The state of the communication mechanism**, such as whether a stream is alive and the remaining reconnect backoff, belongs in the same place, and it is distinct from whether a line exists at all (a runtime capability) ([0022](0022-capabilities-kernel.md)).

This ADR therefore **sets up neither a new kernel nor a new home**. Having wired the existing home, it settles what was still open — **who owns the hosting of long-lived connections (the boundary call under the PaaS constraint of [0011](0011-no-docker.md))** and **the contract that would otherwise be re-chosen at every materialization** — from the design principles ([0010](0010-standards-and-non-lockin.md): standards conformance, no lock-in). Dynamic feature flags / progressive delivery, which also look like they sit "outside the round-trip model", have a different subject and are owned by [0078](0078-dynamic-feature-flag-seam.md).

The seam has a concrete implementation (§Notes). What this ADR owns is **the choices and the rejections**; the end-to-end explanation of the shape to satisfy — the overall flow, how ordering is handled, how reconnection is assembled, which layer owns what, the easy-to-hit pitfalls — is owned by [docs/design/realtime-delivery.md](../design/realtime-delivery.md).

## Decision

### 1. Hosting of long-lived connections is not bundled (exclusion)

**Split in two by the boundary call (the single question: is it another domain?)**:

- **Hosting of long-lived connections (a server that keeps sockets open) = another domain's responsibility (infra/backend) → cut at a boundary seam (not bundled)**. Under the PaaS / serverless assumption of [0011](0011-no-docker.md), the core cannot hold long-lived connections. The source of realtime is **a direct backend connection or an external managed service** (e.g. Pusher / Ably / Supabase Realtime / managed WebSocket / SSE gateway), and this repository **does not bundle** a realtime transport server. This is a consequence of [0070](0070-backend-role-separation.md) (business logic and connection hosting belong to the backend) / [0011](0011-no-docker.md), not a new constraint.
- **Client-side subscription / consumption = frontend territory → a named extension point (seam)**. Its home is already [0024](0024-adapters-server-client-split.md)'s **`adapters/client`**.

Enforcement: Prose — **not mechanizable**. Whether something is bundled is decided by the presence of dependencies and directories; there is nothing to turn into a rule.

### 2. The subscription seam's contract and division of responsibility

Define **the subscription seam's contract** placed in `adapters/client`: a client subscription adapter with connect / subscribe / message handlers / close, which, like the request/response wrapper of [0071](0071-bff-api-integration.md), **normalizes into the `errors` classification** (raw connection errors and close codes are not leaked to upper features; [0021](0021-frontend-responsibility.md)).

**Division of responsibility**: ordering, duplicates, reconnection, cursor and connection state are transport concerns and are owned by `adapters/client`. Folding domain events (which notification changes which display, and how) is owned by the feature. `adapters` is a boundary, not the owner of business state ([0021](0021-frontend-responsibility.md) / [0024](0024-adapters-server-client-split.md)).

Enforcement: ESLint boundaries (the dependency table in `architecture.ts`) rejects paths that import a subscription **implementation** (including vendor clients) from `features` / `components`. **The browser built-ins `EventSource` / `WebSocket` are globals with no import, so boundaries does not catch them** — these are rejected by `no-restricted-syntax` in the same shape as `process` (`SUBSCRIPTION_CONSTRUCTION_SELECTOR` in `eslint.config.ts`, which forbids construction outside `src/adapters/client/stream/`). It looks **only at construction**; references as a type are not rejected — a type does not open a connection.

### 3. Transport defaults to SSE; WebSocket only when truly bidirectional

**Priority of means (ride on standards; [0010](0010-standards-and-non-lockin.md))**: one-way server→client push **defaults to SSE (`EventSource`)**, and **WebSocket is adopted only when true bidirectionality is required**. Periodic refetching (polling) is an exception within the bounds of not breaking [0060](0060-state-management.md)'s Server state default, and its convention is owned by [docs/rules.md](../rules.md).

**Vendor-independent justification ([0010](0010-standards-and-non-lockin.md))**: `EventSource` / `WebSocket` are WHATWG / W3C **web platform standards**, not Next.js-specific APIs (= they do not constitute framework lock-in). The independent grounds for defaulting to SSE = (1) it runs over HTTP and passes through existing proxies / CDNs / authentication infrastructure as is, (2) it is built into the browser, adds no dependency, and keeps the subscription endpoint to the shape of "open one URL", (3) without a source it degrades plainly to a direct backend connection — all properties of web standards, not "because Next.js recommends it". **That `EventSource` has built-in reconnection is not counted as a reason** — because Decision 8 decides not to use it.

Enforcement: Prose — **not mechanizable**. "Is it truly bidirectional" is a judgment about the use case and is not determined by the shape of the code.

### 4. Authentication is a short-lived ticket issued by the BFF, not one-time

- **The browser calls the backend's stream endpoint directly.** Under [0079](0079-auth-frontend-seam.md) the Access Token is not in the browser, and `EventSource` cannot carry arbitrary headers, so the credential is **put in the query** as **a short-lived ticket issued by the BFF (Route Handler)**. The ticket-issuing endpoint is a request that names a principal, so it is a user-scoped endpoint ([0112](0112-data-classification-cache-boundary.md))
- **Within the standards, there is no path to carry a credential in a header.** The `EventSource` constructor accepts only a URL and `withCredentials` (`EventSourceInit` in [WHATWG HTML "Server-sent events"](https://html.spec.whatwg.org/multipage/server-sent-events.html)), and the browser `WebSocket` also accepts only a URL and subprotocols ([WHATWG WebSockets Standard](https://websockets.spec.whatwg.org/)). **Falling back to WebSocket does not change how the credential is carried**, so authentication concerns do not move the transport choice (Decision 3)
- **The shape where the BFF relays the stream and attaches a Bearer is not adopted.** The relay point would end up holding a long-lived connection, which is exactly what Decision 1 keeps out of the core ([0011](0011-no-docker.md)). The BFF relays only the ticket-issuing round trip; the subscription is opened directly by the browser
- **The ticket is bound to principal × subscription unit × stream scope and has a lifetime (TTL).** The binding and the TTL limit the scope of reuse
- **It is not one-time.** One-time tickets would require a BFF → backend issuing round trip on every reconnection. What causes reconnection is the stream side (5xx / network drop), so failures there would convert into load on the issuing endpoint, multiplied by the number of reconnections. The browser's built-in reconnection is also designed on the premise of reusing the same URL, and one-time tickets collide with that premise. Within the TTL, reconnect with the same ticket; issue a new one only once it is exceeded
- **The ticket rides in the URL, so the URL is not put into messages, logs or span attributes.** `logging` redaction **masks by name and does not look at the shape of values** ([0081](0081-observability-logging.md)), so it does not reach a ticket inside a URL string. When wrapping an exception message from the browser, name the value and remove it with `errors`' `redactMessage`

Enforcement: the issuing endpoint being user-scoped is `createHttpClient`'s classification argument (types; [0112](0112-data-classification-cache-boundary.md)). Not putting the URL into messages is Prose — **not mechanizable**. The content of a message is not determined statically.

### 5. A stream carries events, not messages

**A stream carries events that each have a name per meaning** (a shape like `<resource>.created`), not a **transport word** like "message", nor a **broad name** that mixes body changes and state changes (one `<resource>.updated` carrying both). A broad name makes the receiver re-decide what happened by looking at the body, and that decision gets invented per feature.

Enforcement: partly mechanizable. The event types are declared by the contract side, and `adapters/client` validates received events with a zod schema (discriminated union) that discriminates by type name — a name not in the contract fails validation. The granularity of names itself is contract design: Prose — **not mechanizable**.

### 6. The only thing the client assumes of a stream is monotonic increase per unit

- The sequence increases monotonically per subscription unit. **Gaps are normal, and SSE delivery order is not guaranteed either** — the client assumes neither
- **Ordering and deduplication are owned by `adapters/client`**, and only ordered events flow upward. **"Wait until the gap fills" is rejected** — since gaps are normal, the condition to keep waiting never holds. Leaning toward requiring continuity would bake an assumption about the backend implementation (another domain) into the client's wait condition
- An event delayed beyond the ordering window is not inserted into an already-rendered position; instead, **refetch the initial-display fetch endpoint (Decision 7) to reconcile**

Enforcement: unit tests of the subscription adapter in `adapters/client` (with reversed order, duplicates and delays beyond the window as input). The assumption side is Prose — **not mechanizable**. What the backend guarantees does not appear in this repository's code.

### 7. Initial display is a fetch, submission is a round trip; the stream is used for neither

- **The initial display** is assembled by a Server Component's fetch endpoint (the History projection), and **the cursor returned in that response becomes the subscription's starting position**. The shape that assembles the initial state by replaying the stream is not adopted — the initial display would depend on the subscription succeeding, and the screen would not appear while the stream is down
- **Submission** is done by a Server Action → `adapters/server` round trip ([0061](0061-form-mutation-ux.md)), **attaching an `Idempotency-Key` and declaring `idempotent: true`** (POST idempotency in [0071](0071-bff-api-integration.md)). The stream is not made a submission path — a submission failure has to return to the caller as a classification, and a stream has no such round trip
- An optimistic addition **carries a client-assigned id in the submission and is matched by the id echoed back in the event**. Optimistic rows that cannot be matched are not kept

Enforcement: the `idempotent: true` declaration is read by `isRetryableMethod` in `retry-policy.ts` (types and unit tests). Not setting `idempotent` without attaching `Idempotency-Key` is Prose — **not mechanizable**. The meaning of the header is invisible to the wrapper.

### 8. Reconnection is our own; `EventSource`'s built-in reconnection and `Last-Event-ID` are not used

- The resilience of [0071](0071-bff-api-integration.md) (dual timeout / idempotent retry / breaker) works for **single round trips** and **cannot be applied as is** to long-lived streams. Stream-side resilience has a different shape — **reconnect backoff + jitter / liveness / resume-from-cursor** — and is owned by the subscription seam in `adapters/client`
- **`EventSource`'s built-in reconnection is not used.** Built-in reconnection reconnects only on a network drop; if the response is anything other than 200, it fails the connection to `CLOSED` and does not reconnect ([WHATWG HTML "Server-sent events"](https://html.spec.whatwg.org/multipage/server-sent-events.html)). A connection rejected for an expired ticket lands there, so the path back to issuing can only be built outside built-in reconnection. The wait before reconnecting is the reconnection time set by `retry:`, adding further backoff is optional for the user agent, and there is no hook for the page to apply jitter — when the server closes connections all at once, every client comes back almost simultaneously. Neither the return to issuing nor the spreading can coexist with built-in reconnection, so `onerror` immediately calls `close()` and we reconnect ourselves
- **`Last-Event-ID` is not used; the cursor is made explicit every time.** Only built-in reconnection sends `Last-Event-ID`; it is not carried on a connection we reopen ourselves. Two paths for the resume position would require a rule deciding which one is correct
- **Backoff applies only to 5xx and network drops.** A 401 (`unauthenticated`) from issuing is treated as an expired session and ends in re-login; a 403 (`permission-denied`) from the stream side is treated as lost permission and ends. That retrying is wrong for 401 / 403 is the same as in [0080](0080-error-handling.md)

- **Instructions after the response is committed arrive as in-band control events.** After commit the status cannot change, so this is the only path for the sender to say "what it wants done". **The client branches only on the instructed action**, treating the reason as a stable value for the record — branching on the reason makes a client unaware of a newly added reason fall to the default branch, and which way it falls cannot be read from the declaration. Instructions to stop, re-authenticate or resynchronize transition **after the client closes from its side, without waiting for the server to disconnect**. Waiting without closing lets built-in reconnection run to the same URL
- **Assume the connection may drop without any control instruction arriving.** Delivery of instructions is not guaranteed, and recovery must also work from a bare disconnect. Instructions are a cue for acting quickly and correctly, not a precondition for recovery

Enforcement: the classification of termination and the transition per control instruction are unit tests of the subscription adapter in `adapters/client/stream`. Not using built-in reconnection is Prose — **mechanizable** (a check detecting an implementation that does not call `close()` in `onerror` can be written, but no rule exists).

### 9. Not swapped with mocks

`mocks/` is a one-way place holding only MSW handlers generated from the contract, and SSE cannot be generated from the contract. Adding hand-written handlers would break that one-way flow. **During development, connect to the real backend; the means of raising events is owned by the backend side.** What Storybook shows is the state a feature takes as the result of a subscription, and that is given via props ([0054](0054-ui-catalog-storybook.md)).

Enforcement: the `mocks/` README states that its files are not edited by hand, and the `mocks` area is reachable only from the boot boundary (`RESTRICTED_AREAS` in `architecture.ts`). Not placing an SSE handler is Prose — **not mechanizable**.

## Prohibitions

- ❌ Bundling a realtime transport server (hosting of long-lived connections) in the core (the PaaS assumption of [0011](0011-no-docker.md) = another domain; a direct backend connection or an external service)
- ❌ Writing WebSocket / SSE subscriptions directly in `features` / `components` (same shape as the raw-fetch prohibition of [0071](0071-bff-api-integration.md); subscription seam = `adapters/client`; [0024](0024-adapters-server-client-split.md). Enforcement: boundaries rejects the import, and `no-restricted-syntax` rejects construction of the globals — the latter is put in place at materialization)
- ❌ Leaking raw connection errors / close codes / stream exceptions upward (normalize into the `errors` classification; [0021](0021-frontend-responsibility.md)) (Enforcement: `src/adapters/client/stream/subscription.test.ts` (end when issuing returns unauthenticated / permission-denied, etc.) rejects the subscription adapter's classification. Whether raw values get mixed into an exception message is Prose — **not mechanizable**. The content of a message is decided at runtime)
- ❌ Giving transport-concern state (ordering / duplicates / reconnection / cursor) to a feature, and giving domain-event folding to `adapters` (crossing the division of responsibility) (Enforcement: Prose — **not mechanizable**. Which state is a transport concern and which is domain folding is a judgment of responsibility and is not determined by the shape of the code)
- ❌ Applying the request/response resilience of [0071](0071-bff-api-integration.md) (dual timeout / retry / breaker) as is to long-lived streams (different shape = reconnect backoff / liveness / resume)
- ❌ Using the Access Token as the stream credential (it is not in the browser; [0079](0079-auth-frontend-seam.md). The credential is a BFF-issued ticket)
- ❌ Putting a URL containing a ticket into exception messages, logs or span attributes (redaction that masks by name does not reach it; [0081](0081-observability-logging.md))
- ❌ Subjecting 401 / 403 to backoff ([0080](0080-error-handling.md); retrying follows the same path)
- ❌ Using `Last-Event-ID` together with a cursor query (there would be two sources of truth for the resume position)
- ❌ Hand-writing SSE handlers in `mocks/` (breaks the one-way flow of generation from the contract)

## Notes

- **The subscription seam has a concrete implementation.** It lives in `src/adapters/client/stream/`, and consists of native `EventSource` + a thin client (the priority of means = standards conformance, is unchanged). Even if native is not enough and an external client is adopted, the core keeps the seam and places it within the frame of [0010](0010-standards-and-non-lockin.md) (vendor-independent justification + swappable behind the adapters/kernel boundary, no direct vendor references scattered through features/components) / [0004](0004-library-management.md) (exact pin / `pnpm audit`).
- **The ticket-issuing relay and the subscription's home are separate.** Issuing is relayed by a same-origin Route Handler (`src/app/api/<resource>/…/stream-ticket/`), and the subscription itself is opened by the browser directly to the backend. What the relay returns is not the raw ticket value but **the URL to connect to**, so that the browser side does not gain assembly and handling (the constraint of not putting the URL into messages, logs or spans is owned by Decision 4).
- **What belongs to the contract side is not decided here.** The query parameter name for the resume cursor / the format and interval of heartbeats / the means of raising events during development / the ticket TTL are owned by the backend contract. What they require of the client-side design is enumerated by [docs/design/realtime-delivery.md](../design/realtime-delivery.md).
- This ADR is an exclusion (a not-bundled declaration written alongside a named seam). Rules for periodic client fetching such as polling / relative-time updates are out of this ADR's scope ([docs/rules.md](../rules.md)). This ADR handles only the **bidirectional / streaming** seam (dynamic delivery flags are [0078](0078-dynamic-feature-flag-seam.md)).

## Related ADRs

- [0078-dynamic-feature-flag-seam.md](0078-dynamic-feature-flag-seam.md) — dynamic feature flag / progressive delivery seam (a separate subject outside the round-trip model)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — request/response fetch wrapper and resilience (the parent that names the "area not handled" this ADR covers; POST idempotency opt-in)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `adapters/client` (the physical home of WebSocket / SSE; this ADR wires the subscription seam's contract)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — the distinction between communication-mechanism state and runtime capability
- [0011-no-docker.md](0011-no-docker.md) — PaaS / serverless assumption (grounds for long-lived connection hosting = another domain)
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — business logic and connection hosting belong to the backend (grounds for realtime source = another domain)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance (EventSource / WebSocket = riding on web standards) + vendor-independent justification for no lock-in
- [0060-state-management.md](0060-state-management.md) — Server state default (grounds for restraining polling / reactive supply)
- [0061-form-mutation-ux.md](0061-form-mutation-ux.md) — submission is a Server Action round trip
- [0079-auth-frontend-seam.md](0079-auth-frontend-seam.md) — the Access Token is not in the browser (grounds for the ticket approach)
- [0080-error-handling.md](0080-error-handling.md) — 401 / 403 are not retried
- [0081-observability-logging.md](0081-observability-logging.md) — redaction masks by name (grounds for it not reaching a ticket in a URL)
- [0112-data-classification-cache-boundary.md](0112-data-classification-cache-boundary.md) — the issuing endpoint is user-scoped
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — subscription results are shown via props
- [0144-decision-enforcement-pairing.md](0144-decision-enforcement-pairing.md) — how to write the enforcement for each decision
