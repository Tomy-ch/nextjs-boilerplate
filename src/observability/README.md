---
imports-allowed: [] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [business-logic, direct-config-access]
test-requirement: unit
---

# observability

The kernel for server-side traces, metrics and logs using OTel. It does not import configuration values; they are injected from the boot side.

## What Belongs Here

- OTel SDK initialization, traces, per-signal enablement
- The entry that puts rendering on spans (the only public surface called from `features`)
- The entry that puts browser-side measurements received by the relay onto signals (called from `adapters/server`)
- Writing out and reading back the trace correlation handed to the browser (the root layout writes it out, and `adapters/server` records in the context that comes back)
- Building per-signal destinations (`getSignalEndpoint`; the destination the relay hands to the collector is decided by the same function)

## What Does Not Belong Here

- Business logic, direct references to config, lock-in to a specific RUM SaaS

## Structure

- `initialize.server.ts` initializes the Node.js runtime's `NodeSDK` only once per process. It sets the official semantic convention `service.name` on the resource and propagates W3C Trace Context and W3C Baggage. The HTTP instrumentation creates traces for incoming HTTP requests, and the Undici instrumentation injects trace context into server-side `fetch` calls to allowed API origins. Propagation works only when some signal is enabled and the SDK has been constructed. Allowed destinations are matched by `URL.origin` — the path is ignored, and context is injected only into origins whose scheme, host and port all match. Outgoing requests without a parent span are not turned into spans (`requireParentforSpans`). A second call does nothing regardless of its arguments — the run-once check is based on whether the SDK exists, not on argument identity.
- `trace-context.server.ts` writes out and reads back the trace correlation. It extracts the trace ID and span ID from the currently active span (this function is injected into logging at the boot boundary), writes the same span out as a W3C `traceparent`, and records within the context of the `traceparent` the browser sent back.
- `render-span.ts` turns rendering into spans. **It is the surface features import, and it does not import OTel.** Both the coverage and the wrapping implementation are received by injection from the boot boundary. What it covers and how to read it are owned by "Rendering Instrumentation" below.
- `render-span-runner.server.ts` is the implementation that wraps in a span. This is the side that uses `@opentelemetry/api`, and the boot boundary injects it into `render-span.ts`.
- `otlp-log-sink.server.ts` converts the normalized records logging hands over into the OTel Logs API. The logger name is the service name, `severityText` is the level name, and `severityNumber` is OTel's corresponding value. Attributes are normalized recursively into the shape OTLP accepts — primitives, `null` and `Uint8Array` as is, objects as nested maps, and arrays only when every element can be carried, dropping the whole array if even one element cannot. Anything else (`undefined` / symbol / function) is not sent.
- `web-vital-metric.server.ts` records the Web Vitals measured by the browser as OTel metrics. The scope name is `browser-telemetry` — a scope denotes not what was measured but **the mechanism that measured it**, and the scope tells these apart from the server's own signals. Owned by "Browser-Side Signals" below.

## Rendering Instrumentation

`withScreenSpan(name, render)` and `withPartSpan(name, render)` return a component of the same shape that wraps the given component in a span. The span name is `render <name>`, and `name` takes the module path from `src/`. The tracer's scope name is `render`. **User input must never be mixed into a span name** — if names scatter per request, aggregation by name no longer works.

The two differ in what they cover. `withScreenSpan` covers **the top level of a screen** (`page-content` and `view` under `features/<name>/<screen>/`, plus compositions that do fetching on the shell side; on a screen split into static shell and dynamic hole, several stand per route), and `withPartSpan` covers **components a feature owns** (`ui/`). The steps for instrumenting and the line around what is covered are owned by [features/README.md](../features/README.md). `components` is cross-cutting UI with no per-screen ownership, so it is not covered, and route segments are not covered twice because Next.js already opens `render route (app)`.

### Which Renders Get Spans

The coverage and the implementation are **injected from the boot boundary** with `configureRenderSpans({ screens, parts, run })`. Executions that receive no injection (tests, Storybook, the browser) create no spans.

**The implementation is passed by injection to keep OTel out of the surface aimed at features.** `render-span.ts` is imported by features, so it also enters the browser bundle. If it brought `@opentelemetry/api` along, the CJS build Vite pulls in would reference `__dirname`, which the browser lacks, and **it would fail at module evaluation** — no story importing that surface could render at all.

**Whether the SDK exists cannot stand in for disabling.** Even with `OBS_TRACES_EXPORTER=none`, `NodeSDK` sets up a tracer provider when logs or metrics are enabled, so spans are recorded and then discarded — only the output drops to zero while the instrumentation cost remains. That is why the coverage is held as an independent axis ([0081](../../docs/adr/0081-observability-logging.md)).

It is supplied by `OBS_RENDER_SPANS` (`none` / `screen` / `part`, default `screen`), and the boot boundary combines it with `tracesEnabled`. Opening `part` multiplies the spans of one render by the number of components rendered, so open it for investigation rather than routinely.

### Where Injections Are Stored

**Injections are not stored in module variables but on `globalThis`, keyed by a registered symbol (`Symbol.for`).** Next builds the boot boundary (`src/instrumentation.ts`) and RSC as separate module graphs, so the same file is instantiated twice in one process — `process.pid` is the same and only the per-module identity differs. An assignment to a module variable stays only in the boot-boundary instance and never reaches the rendering side. The realm is shared, so a registered symbol is used as the place visible from both (the prohibiting side is in the prohibitions of [0081](../../docs/adr/0081-observability-logging.md)).

What the reading side receives is a value written by another instance, so **it checks the shape before using it.** If the expected fields and types do not line up, it treats this as no injection and calls the wrapped component as is.

### Asynchronous Rendering

When rendering returns a Promise, **the original Promise is returned as is**, and closing the span is attached on the side with `then`. Returning a derived Promise would replace what React waits on. Synchronous rendering closes the span after it returns.

### What a Span Covers

A span covers **only that component's own execution**. Children are rendered after React receives the return value, so a child's span does not fall inside this span; it sits as a sibling under the same parent (`render route (app)`). Therefore **a span's duration is not the total of its subtree**. The whole screen's time is held by `render route (app)`, and what the top-level span answers is "whether execution got that far" and "what its own body waited on".

The only way to nest is to call children as functions instead of returning them as elements. That subtree loses Suspense boundaries, the streaming unit, and reconciliation. **It is not worth giving up the rendering model, so spans are not nested.** Distributing the parent's execution context through React context is unavailable because Server Components have no context, and `AsyncLocalStorage` does not reach either because children are called from the renderer's tasks.

### What Falls Inside

**Fetches awaited in the body fall inside.** Which composition of which screen an outgoing `fetch` came from can be traced through this nesting. When fetching is held by a `layout` or the app shell, that traffic falls outside the top-level span — because what calls it is not a feature.

### Failures

When rendering throws, the span is set to `ERROR`, recorded as an exception if it is an `Error`, and rethrown. **Throws Next.js uses for control flow (`notFound` / `redirect` and the like) are not treated as failures.** The judgment is delegated to `unstable_rethrow`, without reading the framework's internal representation.

### Executions That Record Nothing

A call whose coverage is disabled creates no span and calls the wrapped component as is. Rendering in the browser is the same: it receives no injection and so creates nothing.

## Browser-Side Signals

Values measured in the browser, and exceptions not caught in the browser, are **relayed by the same-origin BFF**. The browser is not allowed to call the collector directly — so that neither the endpoint nor credentials are exposed to the browser, the same reason a RUM SaaS SDK is not bundled. The route is owned by `adapters`, and the endpoint is `app/api/telemetry/route.ts`.

What this kernel handles is putting arriving measurements onto signals, and **writing out and reading back the trace correlation handed to the browser** (`trace-context.server.ts`).

**The browser does not start its own trace.** The root layout passes the active span as `traceparent`, and the browser takes it as the parent. This makes one trace run from SSR to the fetches the screen issues later. In executions where it is not passed (statically generated screens), a new trace starts on the browser side. It is written out even for spans that are not sampled — the sampling decision travels in the flags, and the receiving SDK follows it. The server does not filter. Spans created by the browser are relayed as OTLP, and their contents do not pass through this kernel (`adapters/server` hands them to the collector; only the destination is built with `getSignalEndpoint`).

**Web Vitals are held as distributions.** One histogram stands per metric, carrying `http.route`, the rating and the navigation type as attributes. What is wanted is percentiles over real users, and having the instrument hold the distribution costs the reader fewer steps and less retention than rebuilding it from individual records every time.

| Instrument | Unit | Value buckets |
| --- | --- | --- |
| `browser.web_vital.lcp` / `.fcp` / `.ttfb` | `ms` | Load time (0 to 10,000) |
| `browser.web_vital.inp` / `.fid` | `ms` | Interaction response (0 to 1,000; buckets start at one frame) |
| `browser.web_vital.cls` | `1` | Amount of shift (0 to 1) |

**Buckets are held per metric.** The default sequence assumes millisecond quantities, so `CLS`, which fits within 0 to 1, falls entirely into the first bucket and its percentiles are decided by interpolation within that bucket alone — a measured 0.03 comes out as 3.75. Buckets are a choice of how coarsely to hold the distribution, not the good / poor boundary. Load times stretch into seconds, so the upper end is coarser without cutting off the tail; interaction responses start at one frame (about 16 ms) and are fine-grained up to several hundred ms.

One instrument per metric is created at the first measurement and kept (not recreated on every measurement). The spelling of metrics that have instruments is a closed type, and if the relay contract adds any other, callers fail at the type level. **When adding a metric**, add it both to the instrument table (name, unit, description, buckets) and to the relay contract.

**The recording side does not check whether a signal is enabled.** When metrics are disabled, the SDK sets up no meter provider and the OTel API returns a no-op implementation, so the recording function holds no check. Checks are placed only at the boot boundary and in SDK construction ("Enabling Signals" below). The logs sink, too, is injected by the boot boundary only when enabled — both share the property that the recording-side module has no enabled/disabled branch.

The attributes are `http.route` (official semconv) and `browser.web_vital.rating` / `browser.web_vital.navigation_type`. The route is not the path of one view but **the route's type** (`/docs/[slug]`), converted back on the browser side — carrying the path as is would grow the attribute values by the number of pages viewed and leak identifiers along with them.

**They are not log events.** The official semantic convention gives web vitals only the event name `browser.web_vital`, and defines no metric names. They are still not emitted as events because **every record would then get the relay POST's span attached** — the measurement happened in the browser, not inside that request. Parent-child links would appear where there is no causation, and tracing from the trace would say nothing more than "the beacon arrived". The instrument names are decided by this repository, but what "Operations" below forbids is bringing in a vendor-specific schema; as long as a namespace is cut and OTel's naming conventions are followed, the destination is not constrained.

**In dev, the same measurement arrives twice.** React's Strict Mode calls effects twice, and `useReportWebVitals` does not unsubscribe, so two registrations with the measuring hooks remain. In a production build it is once.

**Thresholds are not placed here.** What [0101](../../docs/adr/0101-performance-budget.md) holds is the measurement mechanism; where to draw the good / poor boundary depends on the use case. The `rating` attribute is a rating by the boundaries web.dev publishes, not a line this repository drew.

**The relay redacts what must be redacted.** Among the attributes of spans created by the browser, names matching the table `logging` holds (`authorization` / `cookie` / `password` / `token`) are replaced with the censor before being handed to the collector. It is applied at the relay because that is the only place everything passes through — applying it on the browser side would let the sender be swapped. **Values are not inspected** (it works as long as secrets are carried by name; anything that is not has a flawed original design).

Exceptions, on the other hand, go into `logging`'s structured logs rather than metrics. They are traced one by one, and the official semconv attributes `exception.type` / `exception.message` / `exception.stacktrace` can be used as is. **The `trace_id` is that of the request that assembled the screen** — because recording happens in the context of the `traceparent` the browser sent back; if none arrives, no trace is attached. Attaching the relay request's span would make it the parent of a request in which no exception occurred.

**Only the format of a returned `traceparent` is checked.** It is sent by the browser, so its authenticity cannot be verified; only whether it matches the W3C format (version fixed at `00`) and that the trace ID and span ID are not all zeros is checked. **An unreadable value is treated the same as one that never arrived** — the context is set to empty (`ROOT_CONTEXT`) and does not fall back to the relay request's span. If correlation is impossible, having nothing causes fewer misreadings than having a wrong correlation. A readable value is set as a remote context.

## Span attribute names differ by source

Even within the same trace, HTTP attribute names differ depending on the instrumentation that opened the span. **Filtering on `http.request.method` misses only the Next.js spans.**

| scope | Attribute names |
| --- | --- |
| `next.js` | `http.method` / `http.target` / `http.status_code` / `http.url` |
| `browser-telemetry` / `@opentelemetry/instrumentation-undici` | `http.request.method` / `url.path` / `http.response.status_code` |

Next.js's own instrumentation still uses pre-v1.0 naming, and this kernel cannot change it. **When filtering, check both names.**

```text
{ span.http.request.method = "GET" || span.http.method = "GET" }
```

## Enabling Signals

`OTEL_EXPORTER_OTLP_ENDPOINT` is the OTLP HTTP base endpoint, and `OBS_TRACES_EXPORTER`, `OBS_METRICS_EXPORTER` and `OBS_LOGS_EXPORTER` express per-signal enablement. Each value is `otlp`, `none` or the empty string, and only `otlp` enables. Each signal's `/v1/traces`, `/v1/metrics` and `/v1/logs` is appended to the base endpoint automatically. A disabled signal creates no exporter, batch processor or metric reader. `OBS_RENDER_SPANS`, which decides the rendering coverage, is not a signal, so it works separately from this gate (if traces themselves are disabled, no render spans are emitted either). For the list of variables and how they are supplied per environment, see [env/README.md](../../env/README.md).

## Execution Mechanics

When Next.js prepares the Node.js server, it automatically runs `register()` in `src/instrumentation.ts`. There Config is bootstrapped and the signal configuration is injected into `initializeObservability()`. Then, only when `OBS_LOGS_EXPORTER=otlp`, the OTLP Logs sink is injected into logging. The origins allowed for propagation are taken from the API base URL. When both traces and logs are enabled, the boot boundary emits one initialization-complete log inside the `observability.initialize` span — a pair that verifies trace-log correlation is working without waiting for the first request. This SDK is not initialized in the Edge runtime or in the browser. Browser-side signals reach this server-side SDK through the BFF relay ("Browser-Side Signals" above).

## Operations

- Use only OTLP and the official semconv
- Inject configuration values at implementation time and avoid vendor lock-in
- The destination for local development is the default of `OTEL_EXPORTER_OTLP_ENDPOINT` (the OTLP HTTP of a local collector); the collector and the viewer are set up outside this repository. The values are owned by [env/README.md](../../env/README.md)
- Configure the endpoint, `service.name` (`OBS_SERVICE_NAME`) and signal enablement to match the backend and the collector. `service.name` must differ from the other services on the same trace. Do not lock SDKs such as Grafana, Sentry or Faro directly into this kernel
- The `fetch` spans Next.js opens on its own put the URL with its query as is into the span name. Names scatter per request and cannot serve as an aggregation unit, so to suppress them use `NEXT_OTEL_FETCH_DISABLED=1`. The same outgoing traffic is covered by the Undici instrumentation's span, whose name carries only the route

## Testing

The OTel API returns a no-op implementation when no provider is registered. Where to substitute depends on what you want to observe.

- **Observing SDK construction** (`initialize.server.ts`): replace `NodeSDK` and the instrumentation constructors with `vi.mock`, and read the configuration passed in. The run-once check lives in a module variable, so `vi.resetModules()` per case and then import dynamically.
- **Observing calls to the recording APIs** (runner, sink, metric): replace only `trace.getTracer` / `metrics.getMeter` / `logs.getLogger`, and spread `importOriginal` so that `SpanStatusCode` and `SeverityNumber` stay real.
- **Observing context passing** (`trace-context.server.ts`): `context.with` only works with an implementation that carries context. Synchronous nesting suffices, so register a minimal `ContextManager` with `context.setGlobalContextManager` in `beforeAll`, and call `context.disable()` in `afterAll`.
- **Where injections are stored** (`render-span.ts`): a registered symbol is not cleared by `vi.resetModules()`. Delete the key from `globalThis` in `beforeEach`. Conversely, re-reading with `vi.resetModules()` in between after injecting reproduces the situation where the boot boundary and rendering are evaluated separately.

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: business-logic` — holds no business logic | violation | [0021](../../docs/adr/0021-frontend-responsibility.md), the fourth of its acceptance criteria for kernels |
| `forbidden: direct-config-access` — does not import `config` and does not read `process.env`. Settings are received by injection from the boot boundary | violation | The prohibitions in [0081](../../docs/adr/0081-observability-logging.md). Machine: ESLint boundaries and `NODE_RUNTIME_ACCESS` in `architecture.ts` |
| `render-span.ts` does not import OTel. The implementation that wraps in a span is received by injection from the boot boundary | violation | This README, "Structure" and "Which Renders Get Spans" |
| Modules other than `render-span.ts` declare `server-only` | violation if not declared | [adapters/README.md](../adapters/README.md#relaying-browser-originated-telemetry) "Relaying Browser-Originated Telemetry". The machine (`scripts/server-only.gate.test.ts`) checks only files spelled `*.server.ts` |
| Uses only OTLP and the official semconv, and does not lock vendor SDKs into this kernel | Importing a vendor SDK is a violation. An attribute key not in the official semconv is a suggestion | This README, "Operations" / the prohibitions in [0081](../../docs/adr/0081-observability-logging.md) |
| Injections from the boot boundary are not stored in module variables | suggestion (the path of the assigned value is not determined by the shape of the declaration) | The prohibitions in [0081](../../docs/adr/0081-observability-logging.md) |
| A trace context returned from the browser is checked only for format, and unreadable values are treated as absent (not falling back to the relay request's span) | violation | [0082](../../docs/adr/0082-client-observability.md) (relaying browser-originated signals) / this README, "Browser-Side Signals". Machine: `trace-context.server.test.ts` |

## Related ADRs

- [0021](../../docs/adr/0021-frontend-responsibility.md) — The layer line: do not import config, receive injections from the boot boundary
- [0081](../../docs/adr/0081-observability-logging.md) — The vendor-neutral policy of using only OTLP and the official semconv, propagation targets, and redaction
- [0082](../../docs/adr/0082-client-observability.md) — The path by which the same-origin BFF relays browser-side measurements and exceptions
- [0101](../../docs/adr/0101-performance-budget.md) — How Core Web Vitals are measured. good / poor thresholds are not placed here
