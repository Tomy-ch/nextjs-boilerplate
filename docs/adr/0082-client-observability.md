# Client Observability (Web Vitals RUM / Client Error Collection / Product Analytics Seam)

[0081](0081-observability-logging.md) defines only the frame, "browser-side telemetry uses the BFF relay as its seam", and [0101](0101-performance-budget.md), while adopting Core Web Vitals as its primary metric, delegates **the collection path for field values (RUM)** to this ADR. This ADR **settles the browser-originated paths — browser-side traces / Web Vitals RUM / client error collection / product analytics —** that ride on this 0081 seam. All of them are "IO leaving the browser", and the sending surface is placed in `adapters/client`, which [0024](0024-adapters-server-client-split.md) explicitly placed.

## Status

Accepted (partial exclusion)

## Context

[0081](0081-observability-logging.md) settles server-side structured logs / OTel / vendor-neutral OTLP, and on the browser side goes only as far as **declaring the seam**: "values measured on the client are sent to the server via `/api/*` (BFF) and exported over OTLP on the server side (not sent directly to a SaaS)". What flows through it (CWV field values / client errors / user behaviour) is not enumerated in 0081's body.

- **Web Vitals RUM**: [0101](0101-performance-budget.md) takes CWV (LCP / INP / CLS) as its primary metric but limits measurement to the lab (CI Lighthouse), so without a path for field values the state is **"there is a metric but no field values"**.
- **Client error collection**: [0080](0080-error-handling.md) / [0081](0081-observability-logging.md) are complete on the server side, and errors that happen in the browser remain nowhere — **observability is missing one wing**.
- **Product analytics seam**: the side of the line [0131](0131-cookie-consent.md) drew with "operational telemetry is distinguished from user behaviour tracking" (= behaviour tracking). Even with no SaaS bundled, whether measurement calls are written directly in components or go through an abstraction remains a structural question for the core.

[0024](0024-adapters-server-client-split.md) set up the `adapters/client` element and explicitly assigned **telemetry sending / analytics sending** to its "contents" column, so the physical home of the paths is settled. This ADR defines what is sent from that home and the policy for triggering and gating.

## Decision

All paths ride on 0081's **browser → BFF relay seam**. Sending surface = `adapters/client` ([0024](0024-adapters-server-client-split.md)); receiving = `app/route-handler` (`route.ts` → `adapters/server` → OTLP / server log; the thin proxy of [0025](0025-app-layer-elements.md)). **Nothing is sent directly from the browser to a SaaS / collector** (0081 Prohibitions).

**Collection and sending are placed in `adapters`, not in the `observability` kernel.** What `observability` holds is the OTLP export endpoint and instrumentation; the path that assembles browser-originated sends (`adapters/client`) and the path that receives them and moves them onto signals (`adapters/server`) are IO with the outside world, and belong to the home of [0024](0024-adapters-server-client-split.md).

The four paths are divided by the signal they ride on.

| Path | Signal | Relay endpoint |
| --- | --- | --- |
| Browser-side traces (§0) | traces | An endpoint that passes OTLP through as is |
| Web Vitals RUM (§1) | metrics | An endpoint that receives reports in a shape this repository decided |
| Client errors (§2) | logs | Same as above |
| Product analytics (§3) | — | Does not go through the relay. The tag manager talks to the delivery origin directly |

The endpoints are split in two because **the contracts come from different places** — OTLP is decided by OTel, so it is passed through without reinterpretation; the report shape is decided by this repository, so it is validated and moved onto a signal.

### 0. Browser-side traces = adopted

- The **OTel Web SDK** runs in the browser and turns browser-originated outbound requests into spans. Export goes through the relay, and neither the collector endpoint nor credentials are exposed to the browser (0081).
- **What is wrapped is every `fetch`.** Wrapping only the fetches we call ourselves misses the RSC requests the router issues for navigation and prefetching, which become roots of separate traces. In exchange, more spans land on one trace.
- **Span names are set as method and path** (the actual path, not `GET /docs/[slug]`). The instrumentation's default is the method only (`GET`), which does not hold which route the request is for. The query is not put in the name — conditions differ per request, so including them scatters the same route across different names.
- **The browser does not start its own trace.** It receives from the server the `traceparent` of the request that assembled the screen and takes it as its parent. This makes one trace from SSR through to the fetches that screen issues later. In executions where it is not passed (statically generated screens), a new trace is started.
- **Instrumentation is loaded after the first render.** Putting the assets for measurement into the initial load worsens the very values [0101](0101-performance-budget.md) places as its primary metric.
- **The service name is overwritten by the relay.** It is an endpoint that requires no authentication, so passing the browser's self-declared name through as is would let anyone write spans into the trace of any service. The browser does not need to know which service it is part of.
- **Vendor-independent**: the OTel SDK is a CNCF implementation, not an observability SaaS, and the destination is any OTLP backend (same logic as §1).

### 1. Web Vitals RUM = adopted

- Collect LCP / INP / CLS and others with `useReportWebVitals` (a hook built into Next.js), send them to the server via the same-origin BFF, and **export over OTLP on the server side** (0081). This **closes the missing path for field values** against the lab measurement (CI Lighthouse) of [0101](0101-performance-budget.md). No thresholds are placed — the budget of [0101](0101-performance-budget.md) is held on the lab side, and field values are read as distributions.
- **Vendor-independent justification** ([0010](0010-standards-and-non-lockin.md)): CWV are industry-standard metrics from web.dev / W3C (0101 has already adopted them independently as its primary metric) / the sending transport is OTLP/OTel = vendor-neutral (0081) / the BFF relay keeps secrets unexposed ([0030](0030-environment-variable-management.md)) and avoids lock-in. **With RUM observability vendor SDKs (Datadog RUM, etc.) removed from the justification, the configuration that collects CWV over OTLP/OTel still holds** = no lock-in (0081's stance is OTLP/OTel vendor-neutral with no vendor SDK bundled, assuming no particular vendor). Using `useReportWebVitals` is a consequence of the settled decision "we chose App Router" (the handling of framework-specific APIs; 0010), not feature-specific lock-in.
- **RUM observability SaaS is not bundled (exclusion)** (consistent with 0081; going through a Collector / OTLP is the baseline).
- **On the server side it is held as metrics (a histogram per metric)**. What is wanted is percentiles over real users, and having the instrument hold the distribution costs less to read and to retain than assembling it every time from individual records. The official semantic conventions give web vitals only the event name `browser.web_vital` and define no metric name, but emitting events attaches the relay request's span to every record, making it a child of a request in which no measurement happened.
- This is **operational telemetry (performance)**, **distinguished from the user behaviour tracking** that [0131](0131-cookie-consent.md) puts under the consent gate. → **Not subject to the consent gate by default** (§4 below).

### 2. Client error collection = adopted

- Capture `window`'s `error` / `unhandledrejection` and send them to the **server log** (0081) through the BFF relay. **Exceptions caught by error boundaries do not ride this path** — React only routes an explicit boundary's catch to `console.error` and does not fire `error`, so if you also want it recorded at the boundary, report from the boundary's side.
- **Records are tied to the trace of the request that assembled the screen** (the `traceparent` of §0 is put on the report and sent back). If it is not passed, no trace is attached — attaching the relay request's span would make it a child of a request in which no exception happened.
- The error classification uses the sentinels of the `errors` kernel ([0080](0080-error-handling.md)). **The sending side goes only up to a cap count per page load**, and **holds no sampling** — if a rate is needed, add it in front of the relay endpoint.
- **Masking is done on the receiving side**, dropping only the attributes that match the name table of [0081](0081-observability-logging.md). **The exception message and the contents of the stack are not sanitized** — this layer can only account for values it assembled itself (ownership of boundary values in [0070](0070-backend-role-separation.md)). What may be put in a message is decided by the caller.
- **Vendor-independent**: visualizing browser-side errors fills the wing of observability that 0080 / 0081 left complete only on the server side, and the collection path is structured logs / OTLP (0081) = vendor-neutral. Error-monitoring SaaS is not bundled (the same exclusion logic as §1).
- **Treated as operational telemetry** (not subject to the consent gate; 0131. The line is drawn in this ADR's section on the consent gate line).

### 3. Product analytics seam = bundle a tag manager

- **A tag manager is bundled** ([0131](0131-cookie-consent.md)). What is bundled is **only the slot that loads the container**, and what to measure is held by the container's contents.
- **Physical placement = a client island in `app`** (`src/app/analytics.tsx`). Not `adapters/client`. What that place takes on is **the paths where this app assembles the sends** (§1 RUM / §2 client errors), whereas the tag manager **only loads, and the sending is done by the container's contents**. Setting up a source adapter for something that does not assemble sends only adds one more passage.
- **Only this island may pass values into `dataLayer`**. Touching it directly from a feature / component scatters what goes outside.
- **Consent gating**: product analytics is exactly what 0131 subjects to consent (user behaviour tracking). The gate is applied **not by checking a predicate just before the call, but by not mounting the island itself** — while the pure-function gate predicate of [0031](0031-policy-state-supply.md) (default = "gate everything without consent") is false, `src/app/consent.tsx` does not render the island. **Assets whose fetching starts the moment the element exists cannot be stopped by a predicate** (the reason 0131's lightweight consent mechanism stops them by not rendering the island). The concrete granularity of the gate and the consent source depend on the use case and are not defined here (consistent with 0031).
- **Vendor-independent**: what is bundled is only the slot that loads the container, and **which measurement vendor to connect to is held by the container's contents**. Changing vendors does not change the core's code. Removing it only takes emptying the container ID, and a deployment with it removed carries no library in its initial JS ([0131](0131-cookie-consent.md)).

### 4. The consent gate line (operational telemetry vs behaviour tracking)

[0131](0131-cookie-consent.md) limits what the consent gate covers to **user behaviour tracking**, distinguishing it from the operational telemetry of [0081](0081-observability-logging.md). This ADR applies that line as is:

- **RUM / client errors = operational telemetry → not subject to the gate by default** (operational measurement of performance / failures).
- **Product analytics = behaviour tracking → gate required** (§3; the 0031 predicate).
- However, **there may be jurisdictional requirements that subject field RUM to consent**, so an extension point is left for reusing the same 0031 gate predicate as §3 when you want to gate RUM / client errors (the core default conservatively treats them as operational). This boundary depends on jurisdiction and is not fixed in the core.
- **An identifier linking visits from the same browser is handed out only while consent is given.** Handing it out before consent means giving out the identifier and then asking for consent. **When consent is withdrawn, delete it** — expiry, deletion by the user and choosing again are all treated the same. This is a promise of the whole mechanism, including the pre-filter, and mounting / unmounting the island alone is not enough (the identifier remains as a cookie).

### 5. The physical BFF endpoint

- What this ADR settles is the **seam** (the 0081 relay / the `adapters/client` sending surface / `adapters/server` receiving) and **splitting the relay endpoint in two by where the contract comes from** (the table under Decision — an endpoint that passes OTLP through as is / an endpoint that receives reports in a shape this repository decided). Whether to split the report-receiving endpoint further per signal depends on the use case and is not fixed by the core.
- **Protection of the relay endpoint** (rate limiting / body size limit / abuse countermeasures for an unauthenticated endpoint) is **out of this ADR's reach**. It is an infra-domain boundary seam = owned by [0077](0077-bff-abuse-protection-boundary.md). This ADR defines only the sending path and refers to 0077 for the protection policy (they are tightly coupled, so cross-references keep local reasoning).

## Prohibitions

- ❌ Sending RUM / errors directly from the browser to a SaaS (BFF relay seam; [0081](0081-observability-logging.md)). **The only exception is the tag manager behind the consent gate**, which in principle cannot be passed through the relay, so [0131](0131-cookie-consent.md) takes it on along with its consequences. **The exception is closed to that path** — §1 RUM and §2 client errors keep going through the relay (Enforcement: `src/config/security-headers/security-headers.test.ts` (pins `connect-src` to `'self'` and the backend's origin, opening the measurement destinations only for deployments that declared a container ID) and the E2E watch for `securitypolicyviolation`)
- ❌ Bundling an observability SaaS SDK (contrary to the OTLP neutrality of [0081](0081-observability-logging.md)). **The product-analytics tag manager is bundled by decision of [0131](0131-cookie-consent.md) and is outside this prohibition** (Enforcement: none — a decision not to adopt. That no observability SaaS SDK is among the dependencies is itself the state, and a change adding one appears in the `package.json` diff)
- ❌ Touching `dataLayer` from anywhere other than the consent-gated island (§3). Once a firing IF is set up, writing directly without going through that IF is likewise forbidden ([0031](0031-policy-state-supply.md)) (Enforcement: Prose — **mechanizable** (`no-restricted-syntax` / `no-restricted-imports` rejecting references to `dataLayer` and imports of `@next/third-parties` send functions outside `src/app/analytics.tsx`; no rule exists))
- ❌ Firing product analytics without the consent gate (the 0031 gate predicate is required; [0131](0131-cookie-consent.md))
- ❌ Handing out the visit-linking identifier before consent / keeping it after consent is withdrawn (§4) (Enforcement: `src/proxy.test.ts` (no measurement id is issued while consent is absent or refused, and it is removed when consent is withdrawn) and `e2e/journeys/consent.spec.ts`)
- ❌ Putting attributes that match the name table of [0081](0081-observability-logging.md) without masking them (Enforcement: receiving-side redaction (`src/adapters/server/telemetry/browser-traces.test.ts` and `src/logging/pino.server.test.ts`) masks attributes matching the name table. A new receiving endpoint that does not go through the table is Prose — **not mechanizable**. Whether a path goes through the table is decided by wiring, not by the shape of the attributes)
- ❌ Putting principal-specific values into exception messages or stacks on the assumption that they are masked (their contents are not sanitized) (Enforcement: Prose — **not mechanizable**. Whether a value in a message is principal-specific is decided by where the value came from, not by the shape of the expression)
- ❌ Placing a browser-originated sending surface anywhere other than `adapters/client` (raw fetch in a feature / component, etc.) ([0071](0071-bff-api-integration.md) / [0024](0024-adapters-server-client-split.md)) (Enforcement: Prose — **mechanizable** (`no-restricted-syntax` rejecting calls to `fetch` and `navigator.sendBeacon` in `features` / `components`; no rule exists))

## Notes

- **Wiring consent**: product analytics is wired with the gate predicate of [0031](0031-policy-state-supply.md) (applied by not mounting the island; §3). Whether RUM / client errors need consent **depends on jurisdiction and is not settled in the core**; it stays at the conservative default of operational = not subject to the gate + an extension point for reusing the 0031 predicate (§4).
- **Protection is delegated to [0077](0077-bff-abuse-protection-boundary.md)** (§5). Protecting the unprotected public relay endpoint is a boundary seam leaning toward another domain, and it is stated explicitly that what is referred to is spread outside this ADR.
- The concrete sending implementation (batching / `sendBeacon` vs `fetch` / sampling rate) depends on the use case (what the core provides goes only up to the seam, and this concerns §1 RUM / §2 client errors).
- **The core does not choose the measurement product itself**: what is bundled goes only as far as the tag manager (the slot that loads the container), and what goes into the container is not defined here. Bundling a SaaS SDK directly would let the choice of that one narrow the options — with a tag manager, reconnecting is just swapping the container's contents. Where to set up a firing IF once tags start sending values is owned by §3. **The consent gate predicate actually exists on the [0131](0131-cookie-consent.md) / [0031](0031-policy-state-supply.md) side**. Note that §1 RUM / §2 client errors are operational telemetry (0081, OTLP) and are outside the scope of this note.

## Related ADRs

- [0081-observability-logging.md](0081-observability-logging.md) — browser → BFF relay seam / OTLP only / SaaS not bundled. This ADR makes those paths concrete
- [0101-performance-budget.md](0101-performance-budget.md) — CWV as primary metric / lab measurement. This ADR complements it with the field-value (RUM) collection path
- [0131-cookie-consent.md](0131-cookie-consent.md) — consent gate scope = behaviour tracking (product analytics) / the distinction from operational telemetry (RUM / client errors)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `adapters/client` (the home of the paths where **this app assembles the sends**; the tag manager is not placed here — §3)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — supply of the consent gate predicate (product analytics: the island is mounted only while the predicate is true)
- [0080-error-handling.md](0080-error-handling.md) — error classification sentinels / redaction (classification and masking of client errors)
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md) — protection of the relay endpoint (where §5 delegates)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the client → BFF fetch path (the implementation layer of sending)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — not exposing secrets / BFF runtime config (grounds for the BFF relay)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance + vendor-independent justification (the foundation of the RUM path's validity)
