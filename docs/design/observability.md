# Observability

This document explains end to end **how logs, traces and measurements connect from the browser to the server and on to the collector**. The decisions on what to adopt and what not to belong to [ADR 0081](../adr/0081-observability-logging.md) (server side) and [ADR 0082](../adr/0082-client-observability.md) (browser side); this document covers **where in the code, and in what order,** those decisions are carried out, and the pitfalls you hit without reading the implementation.

The README of `src/logging/` and of `src/observability/` are each the entry point to their kernel. This document draws one line across both of them and `adapters` / `app` / `instrumentation.ts`. When in doubt, the ADR wins.

## Division of Labor Between the Two Kernels

Observability is split across two kernels. **`logging` is the writing side's contract, `observability` is the OTel implementation**, and the dependency runs in one direction only (`observability` → `logging`).

| Kernel | Owns | Hides |
| --- | --- | --- |
| `logging` | `Logger` (`debug` / `info` / `warn` / `error` and structured fields), the table of names to redact `REDACTED_FIELD_NAMES`, two injection points (`TraceContextExtractor` / `LogRecordSink`), `getLogger()` / `reportQuietly()` | Pino. No Pino type leaves `pino.server.ts` |
| `observability` | `NodeSDK` initialization, reading and writing trace correlation, the endpoint that turns rendering into spans, the OTLP Logs sink, the Web Vitals instruments | The OTel SDK and exporters. The surface `features` imports (`render-span.ts`) holds no `@opentelemetry/*` |

`logging` does not know `observability`. What attaches trace identifiers to log lines is a function-typed injection point, `TraceContextExtractor`, which `extractActiveTraceContext` in `observability/trace-context.server.ts` satisfies. Sending logs to OTLP has the same shape: `observability/otlp-log-sink.server.ts` implements `LogRecordSink`. **Only the boot boundary (`src/instrumentation.ts`) wires the two together.**

`observability` is divided into six parts.

| File | Role | `@opentelemetry/*` |
| --- | --- | --- |
| `initialize.server.ts` | Builds `NodeSDK` once per process and attaches an exporter per signal | Holds |
| `trace-context.server.ts` | Extracts identifiers from the current span / writes out `traceparent` / processes within the context of a `traceparent` the browser sent back | Holds |
| `render-span.ts` | `withScreenSpan` / `withPartSpan`. The surface `features` imports | **Does not hold** |
| `render-span-runner.server.ts` | The implementation that wraps rendering in a span. The boot boundary injects it into `render-span.ts` | Holds |
| `otlp-log-sink.server.ts` | Hands normalized log records to the OTel Logs API | Holds |
| `web-vital-metric.server.ts` | Records the Web Vitals the browser measured into histograms | Holds |

## The boot boundary wires everything

Next.js calls `register()` in `src/instrumentation.ts` while preparing the Node server. All observability wiring happens **here, in this order**.

1. `bootstrapConfig()` validates the env. Observability settings (`OBS_*`) become readable only here
2. If the API connection mode is `mock`, interception is set up (it comes after validation so the destination is never swapped using unvalidated values)
3. `initializeObservability(...)` — if even one signal is enabled, builds `NodeSDK` and calls `start()`. The resource is `service.name` only. Propagation is W3C `TraceContext` + `Baggage`. Instrumentation is `HttpInstrumentation` (the root span of incoming requests) and `UndiciInstrumentation` (outbound `fetch`; **propagates only to the origin of `APP_API_BASE_URL`**)
4. `configureRenderSpans({ screens, parts, run: runRenderSpan })` — injects the scope and implementation of rendering instrumentation. `screens` / `parts` are **the combination of `tracesEnabled` and `OBS_RENDER_SPANS`**, and the combining happens here
5. `initializeLogger({ level, traceContextExtractor, logRecordSink? })` — initializes Pino. `logRecordSink` is attached only when `OBS_LOGS_EXPORTER=otlp`
6. If both traces and logs are enabled, one boot log line is emitted inside a span named `observability.initialize`. **This is the correlation smoke check** — if that line carries a `trace_id` on the logging platform, the wiring works

None of 1–6 runs on the Edge runtime or in the browser (it branches on `NEXT_RUNTIME === "nodejs"`). Browser-side instrumentation starts from a different entry point (the `Telemetry` island, described below), and what the browser measures reaches this server-side SDK through the relay.

### Signal gates and rendering scope are separate axes

For `OBS_TRACES_EXPORTER` / `OBS_METRICS_EXPORTER` / `OBS_LOGS_EXPORTER`, **only `otlp` is enabled**; `none` and the empty string are disabled. A disabled signal creates no exporter, batch processor or metric reader. The endpoint is built by appending `/v1/<signal>` to the base `OTEL_EXPORTER_OTLP_ENDPOINT` (`getSignalEndpoint`).

`OBS_RENDER_SPANS` (`none` / `screen` / `part`) is not a signal but the axis of **what to instrument**. Even with `OBS_TRACES_EXPORTER=none`, if another signal is enabled `NodeSDK` sets up a tracer provider, and spans are recorded and then discarded — the output drops to zero but the cost of instrumentation remains. That is why the scope is held independently. The list of values belongs to [`env/README.md`](../../env/README.md).

## Injection is passed through a registered symbol

**This is the foremost trap you hit without reading the implementation.** Next builds the boot boundary (the graph reached from `instrumentation.ts`) and the RSC rendering side as **separate module graphs**. As a result the same file, such as `src/logging/logging.server.ts` or `src/observability/render-span.ts`, is **instantiated twice within one process** (`process.pid` is the same; only the per-module identity differs).

Put a value created at the boot boundary into a module variable such as `let logger`, and it exists only in the boot-side instance; `getLogger()` called from a Server Component looks at the uninitialized variable of the other instance and throws. The realm (`globalThis`) is shared, so as a place visible from both, the value goes on `globalThis` keyed by a **registered symbol** (such as `Symbol.for("nextjs-boilerplate.logging.logger")`), and the reading side checks its shape as "a value another instance wrote" before using it. `findLogger()` in `logging.server.ts` and `findConfiguration()` in `render-span.ts` have that shape.

This rule is needed only for values **created** at the boot boundary and **read** on the rendering side. Three things work as plain module variables, each for a different reason.

| Module variable | Why it works |
| --- | --- |
| `let sdk` in `initialize.server.ts` | A guard against double startup, touched only within the boot boundary. When the rendering side obtains a tracer it goes through `@opentelemetry/api`'s own global registration (also placed on `globalThis` with `Symbol.for`) |
| `cachedEnvironment` in `config/environment.ts` | Its source is `process.env`, which is shared across the process. The rendering-side instance simply re-evaluates the same value itself and does not wait for the boot side's value |
| `histograms` in `web-vital-metric.server.ts` | Merely a cache of instruments; the real thing is reached through `metrics.getMeter()` in OTel's global. Recreating it yields the same instrument |

When adding a new injection point, decide by "where does the value come from". **If it can only be created at the boot boundary, use a registered symbol**; if it can be re-derived from a process-shared resource, a module variable is enough.

## How One Trace Connects

This follows, in request order, how SSR, the browser's fetches and the backend beyond them become a single trace.

1. **Incoming request** — `HttpInstrumentation` creates the root span. Next.js's own instrumentation places spans such as `render route (app)` beneath it
2. **Rendering** — the top level of a screen wrapped with `withScreenSpan` opens a `render <module path>` span (next section). A `fetch` awaited in the body falls inside it
3. **Outbound `fetch`** — `UndiciInstrumentation` opens a span and injects `traceparent` / `baggage`. **It injects only into the origin of `APP_API_BASE_URL`**, and does not propagate to other origins (cut off with `ignoreRequestHook`)
4. **Handing it to the browser** — the root layout's `TelemetryHole` turns the current span into a W3C `traceparent` string with `findActiveTraceparent()` and passes it to the `Telemetry` island as props. It is a request-time value, so it sits inside `Suspense` and does not block rendering of the static shell
5. **Browser-side instrumentation** — after `Telemetry` mounts, it loads `adapters/client/telemetry/browser-tracer.ts` with a **dynamic import** and calls `startBrowserTracing(traceparent)`. It registers a `WebTracerProvider` and, with `FetchInstrumentation`, turns **every `fetch`** (fetches to the BFF, and the RSC requests the router issues for navigation and prefetching) into spans
6. **Choosing the parent** — **the browser does not start its own trace.** `DocumentRootContextManager` returns the context of the handed-over `traceparent` only when "nothing encloses the context". The instrumentation wrapping `fetch` takes its parent from the active context at call time, so every request becomes a child of the request that built the screen
7. **Relay** — browser spans are serialized to OTLP JSON by `BatchSpanProcessor` → `relayExporter` and sent with `navigator.sendBeacon` to the same-origin `/api/telemetry/traces`. `forceFlush` runs just before the screen becomes `hidden`
8. **On to the collector** — `adapters/server/telemetry/browser-traces.ts` validates only the shape of the envelope, overwrites `service.name`, replaces redacted attributes with the censor value, and then POSTs **without reinterpreting** to the `/v1/traces` of the collector the server-side configuration knows

In an execution where no `traceparent` is handed over (a statically generated screen), the context in 6 becomes `ROOT_CONTEXT` and a new trace starts in the browser. This is by design, not a defect — there is no request that could be the parent in the first place.

**Spans the browser created do not pass through the `observability` kernel.** `adapters/server` hands them to the collector as OTLP. All the kernel takes on is the writing-out in 4, and `withRemoteTraceContext`, which records exceptions within the context of the `traceparent` that came back.

## The Relay Endpoints

The browser is not allowed to call the collector directly, so a same-origin Route Handler receives the data. There are two endpoints.

| Endpoint | What it receives | Source of the contract | Receiving side |
| --- | --- | --- | --- |
| `POST /api/telemetry` | Reports in a shape this repository decided (Web Vitals / exceptions). The type is `adapters/http/telemetry-report.ts` | This repository | `browser-telemetry.ts` validates with zod and moves it onto a signal |
| `POST /api/telemetry/traces` | OTLP `resourceSpans` as is | OTel | `browser-traces.ts` validates only the envelope and forwards without reinterpreting |

They are split in two not because the contents differ but because **the sources of the contracts differ**. One can be changed for this side's convenience; the other cannot.

Neither endpoint requires authentication, so `readJsonBody` in `adapters/server/http/json-request.ts` owns the defenses that **reject before reading the body**.

- **415** if the content-type does not claim `application/json`
- **413** without reading if the declared `content-length` exceeds the limit. A request with no declaration, or a false one, gets **413** from the measured size after reading (the size is checked twice)
- **400** if it cannot be read as JSON, **400** if it does not match the contract shape
- On success, **204** with no body. The sender uses `sendBeacon` or a `fetch` with `keepalive`, neither of which reads the response

The limits are set per endpoint. The report endpoint allows **16 KB** (worked back from the size of the largest report the contract allows, serialized as UTF-8 JSON), and the trace endpoint **128 KB** (a size that fits the browser-side `maxExportBatchSize: 32`) and up to **4** `resourceSpans`. The browser-side truncation (`MAX_ERROR_*_LENGTH`, `MAX_EXPORT_BATCH_SIZE`) is a **copy** to keep traffic down, not the receiving side's basis.

The trace endpoint additionally owns two things. **Overwriting `service.name`** — passing the self-declared name through would let anyone write spans into the trace of any service, so it is aligned to the `OBS_SERVICE_NAME` the server knows. **Not surfacing failures in the response** — the collector being down is not a relay failure, and rethrowing would turn an observability-platform problem into a 500 from an unauthenticated endpoint. It emits one `warn` log line and returns 204.

Rate limiting and global circuit breaking are not here. Those are the responsibility of the edge / WAF ([ADR 0077](../adr/0077-bff-abuse-protection-boundary.md)).

## Rendering Instrumentation

`withScreenSpan(name, render)` / `withPartSpan(name, render)` return a component of the same shape with the component wrapped in a span. The span name is `render <name>`, and the tracer scope is `render`. Which one wraps it is decided by where the component sits.

| Target | Wrapping endpoint | Default |
| --- | --- | --- |
| The top level of a screen (`page-content` / `view` under `features/<name>/<screen>/`, compositions that own fetching on the static-shell side) | `withScreenSpan` | Enabled (`OBS_RENDER_SPANS=screen`) |
| Components a feature owns (`<screen>/ui/**`) | `withPartSpan` | Disabled (opened with `part`) |

The wrapping side (`render-span.ts`) reads the configuration on `globalThis`, hands off to the injected `run` if the scope is enabled, and calls the component as is if not. In an execution with no injection (tests, Storybook, the browser) it creates nothing.

The wrapped side (`render-span-runner.server.ts`) runs rendering with `tracer.startActiveSpan`. If the return value is a Promise it **returns the original Promise as is**, and closes the span after it resolves / rejects — returning a derived Promise would change what React waits on. If rendering throws, the span is set to `ERROR`, and an `Error` is recorded as an exception and rethrown. However, throws Next uses for control flow, such as `notFound()` / `redirect()`, are told apart with `unstable_rethrow` and not recorded as failures.

**A span covers only the execution of that component itself.** Children render after React has received the return value, so a child's span does not fall inside this span; it sits as a sibling under the same parent (`render route (app)`). The duration of the whole screen belongs to `render route (app)`.

## Web Vitals are metrics, exceptions are logs

The browser measures two kinds of things, and they go onto different signals.

**Web Vitals** are picked up with `useReportWebVitals` from `next/web-vitals`, sent to `/api/telemetry`, and recorded on the server side into **a histogram per metric** (such as `browser.web_vital.lcp`). The attributes are only three: `http.route` and `browser.web_vital.rating` / `browser.web_vital.navigation_type`. They are metrics rather than events because emitting events would attach the relay POST's span to every record, making them parent and child of requests in which no measurement took place. This report holds no `traceparent` — metrics cannot hold traces.

`http.route` carries the **route pattern** (`/docs/[slug]`), not the path of one instance. The browser side restores it with `toRoutePattern(usePathname(), useParams())`. What is carried is **the route where loading started**; even if a client navigation changes the route, it is not the route at the time of reporting (CLS / INP accumulate until the user leaves and are tied to the load).

Buckets are held per metric. Time metrics use a series in milliseconds and `CLS` a series from 0 to 1; left to the default buckets, all of `CLS` falls into the first bucket and the percentiles are determined by interpolation alone.

**Exceptions** (`window`'s `error` / `unhandledrejection`) are sent to the same endpoint and, on the server side, put into a structured log via `getLogger().error(...)` with **`exception.type` / `exception.message` / `exception.stacktrace` / `http.route`** attached. Recording happens inside `withRemoteTraceContext(report.traceparent, ...)`, so **the `trace_id` is that of the request that built the screen**. If none was handed over, it is recorded with `ROOT_CONTEXT` and not tied to the span of the relay request. One page load sends at most **8** (the `Telemetry` island counts them).

**Exceptions caught by an error boundary do not take this path.** React only forwards exceptions caught by an explicit boundary (your own `error.tsx` / `global-error.tsx`) from `onCaughtError` to `console.error`, and **does not fire `window`'s `error`**. Only exceptions that fall to the built-in implicit boundary reach `window`. Most fetch failures are caught by `error.tsx`, so **the path you most want to record is the one that slips through here.**

If you also want to keep failures received at a boundary, the only way is to **call the report from the boundary's side**. But `global-error.tsx` replaces the root layout entirely, so **at that point the island is already gone** — the report endpoint has to be reachable from outside the island.

## Redaction and the Query Boundary

The table of names to redact is **one: `REDACTED_FIELD_NAMES` in `src/logging/logger.ts` (`authorization` / `cookie` / `password` / `token`)**, and both logs and spans consult it. It applies in three places.

| Place | What it applies to | How |
| --- | --- | --- |
| `redactFields` in `pino.server.ts` | Fields before they go to stdout and the OTLP sink | Lowercases the name, matches it against the table, and replaces the value with `[REDACTED]` |
| Pino `redact` in `pino.server.ts` | Pino's own output | Passes the same table as `paths` |
| `censorSecret` in `browser-traces.ts` | Attributes of spans the browser created | Replaces the `value` of a `key` matching the same table with `{ stringValue: "[REDACTED]" }` |

**Redact by name, ignore the shape of the value.** The span side applies it at the relay because that is the only place everything passes through — applying it in the browser would still leave the sender able to swap it out.

The query is not dropped. Putting a value that must be kept secret into the query is itself the mistake, and redacting it in the trace protects nothing. However, **it is not put into the span name** — this is not a secrecy requirement but an aggregation one: conditions differ per request, so including them in the name scatters one path across different names. On the browser side, `nameByPath` renames to `<method> <pathname>` and puts `url.path` in an attribute. The default instrumentation keeps the URL including the query in `url.full`, so read that when tracing individual requests.

## No Vendor SDK in the Inner Layers

`@opentelemetry/*` may be imported only by `observability/*.server.ts`, `adapters/server/telemetry/`, `adapters/client/telemetry/browser-tracer.ts`, and `instrumentation.ts`. What `features` touches is the two functions of `observability/render-span.ts` and `logging`'s `Logger`, neither of which exposes OTel types. The only external dependency `logging` holds is Pino, and that does not leave `pino.server.ts` either.

SaaS SDKs such as Sentry / Datadog / Faro are not bundled. The target is any OTLP backend, and switching takes only `OTEL_EXPORTER_OTLP_ENDPOINT` and the collector-side configuration.

## Common Pitfalls

### A value created at the boot boundary and put in a module variable does not reach the rendering side

As described above, the same file is instantiated twice in one process. When newly adding the shape of calling `initializeX()` at the boot boundary and `getX()` from a Server Component or Route Handler, the place to put it is `globalThis` keyed by `Symbol.for`. Tests run in a single module graph, so **it does not reproduce in tests**. If "throws because it is not initialized" appears on a real deployment, suspect this first.

### `OBS_TRACES_EXPORTER=none` does not stop instrumentation

If another signal is enabled, the tracer provider is set up, and rendering spans and `fetch` spans are created and then discarded. To cut the cost of instrumentation, use `OBS_RENDER_SPANS=none`. Conversely, even with `OBS_RENDER_SPANS=screen`, no rendering spans appear if traces are disabled — the boot boundary does the combining.

### A rendering span's duration is not the total of its subtree

`render <name>` covers only its own body; the rendering of children sits alongside as siblings. For "this screen is slow", look at `render route (app)`. What the top-level span answers is "did it get that far" and "what did the body wait on". Calling children directly as functions to nest them loses the Suspense boundaries and the streaming units.

### An outbound `fetch` without a parent does not become a span

`UndiciInstrumentation` is built with `requireParentforSpans: true`. A `fetch` issued outside an incoming request (static generation at build time, inside boot processing) does not become a span, and no `traceparent` is injected. This is not "the span disappeared"; there is simply no request to be its parent.

### Propagation goes only to the API origin

`traceparent` / `baggage` are attached only to requests to the same origin as `APP_API_BASE_URL`, not to the IdP's or third parties' origins. Do not treat a trace that breaks at another origin as a "bug" and widen the propagation targets — this narrows who may receive `Baggage` ([ADR 0081](../adr/0081-observability-logging.md)).

### Attribute names differ by the span's origin

Even within the same trace, Next.js's own instrumentation (scope `next.js`) uses the pre-v1.0 names `http.method` / `http.target` / `http.status_code`, while this repository's instrumentation (`browser-telemetry` / `@opentelemetry/instrumentation-undici`) uses `http.request.method` / `url.path` / `http.response.status_code`. Filtering by only one set of names drops all of the other.

### Next.js's own `fetch` spans put the query in the name

The `fetch` spans Next.js opens itself put the URL with its query straight into the span name, so names scatter per request. The Undici span covers the same traffic, and its name holds only the path. To suppress them, use `NEXT_OTEL_FETCH_DISABLED=1`.

### In dev, the same Web Vitals arrive twice

React's Strict Mode calls effects twice, and `useReportWebVitals` does not unsubscribe, so two registrations with the measuring code remain. A production build sends them once. Browser-side trace startup (`startBrowserTracing`) lets the second call pass through with a `started` guard — without the guard, the second `provider.register()` silently fails, only the `fetch` instrumentation gets wrapped twice, and every later request becomes two spans in a parent-child pair.

### On statically generated screens the browser trace does not connect

`traceparent` is taken from the active span, so it is available only in request-time rendering. On a statically generated screen `Telemetry` receives `undefined`, and the browser starts a new trace. Exception records also go in without a trace. The only way to connect them with SSR is to make that screen dynamic.

### The authenticity of `traceparent` cannot be verified

The value the browser sends back is checked only for its format (`00-<32hex>-<16hex>-<2hex>`) and for not being all zeros. Anyone can claim any trace ID, so **never use trace linkage as the basis for authorization or auditing**. An unreadable value leaves the context empty, and is never tied to the span of the relay request.

### While delivery is stopped, browser-originated reports do not arrive

While stopped, `src/proxy.ts` refuses everything other than `GET` / `HEAD` with 503, and the only paths it lets through are `/maintenance` and `/api/health`. The `/api/telemetry` family is `POST`, so it fails. Exceptions and measurements that happen on a screen during the stop are kept nowhere — this is the consequence of stating the stop's promise in full at its own boundary, not something to work around by opening an endpoint.

### `getLogger()` throws before initialization

Calling `getLogger()` in an execution that does not pass through the boot boundary (tests, scripts that do not go through `instrumentation.ts`) throws. `reportQuietly()` exists **so that a failure to record does not also fail the thing being recorded**, and every receiving side of the relay is wrapped in it. Anyone newly adding observability uses the same shape inside processing whose success or failure is visible to the user.

### Putting an `Error` or a `Date` straight into a field leaves it empty

The OTLP sink (`toOtlpValue`) drops everything other than `string` / `number` / `boolean` / `null` / `Uint8Array` / arrays / plain objects, and enumerates objects with `Object.entries`. An `Error`'s `message` / `stack` are non-enumerable, so it becomes `{}`, and a `Date` becomes `{}` too. Put values into log fields **after converting them to strings**, as in `exception.message`. The exception log in `browser-telemetry.ts` has that shape.

### Never import `@opentelemetry/api` into `render-span.ts`

`features` imports this file, so it also goes into the browser bundle. Bring `@opentelemetry/api` along and the CJS build Vite pulls in references `__dirname`, which the browser lacks, and **it fails at module evaluation** — not a single story that imports that surface can render. The implementation goes in `render-span-runner.server.ts`, and the boot boundary injects it.

### Route Handlers do not initialize observability themselves

The `/api/telemetry` family of handlers calls neither `initializeObservability` nor `initializeLogger`. They only use what the boot boundary has already set up, via the registered symbol and OTel's global. Starting to touch the SDK inside a handler produces either a double startup or a separate provider with a configuration different from the boot side's.

## Related ADRs

- [0081](../adr/0081-observability-logging.md) — structured logging / OTLP-only / per-signal gates / trace correlation / redaction. The foundation of this document
- [0082](../adr/0082-client-observability.md) — the decision to put browser-side traces / Web Vitals / exceptions onto the BFF relay, and why they are taken as metrics
- [0077](../adr/0077-bff-abuse-protection-boundary.md) — the minimal defenses the relay endpoints hold themselves, and the scope delegated to the edge
- [0021](../adr/0021-frontend-responsibility.md) — the line by which kernels do not read config directly but receive injection from the boot boundary
- [0024](../adr/0024-adapters-server-client-split.md) — the home of the sending surface (`adapters/client`) and the receiving side (`adapters/server`)
- [0030](../adr/0030-environment-variable-management.md) — supplying `OBS_*`, and not exposing the endpoint through `NEXT_PUBLIC_`
- [0101](../adr/0101-performance-budget.md) — the decision to make Core Web Vitals the primary metric. The good / poor thresholds are not in this document either
