# Observability and Logging

Settles the contents of the **`logging` / `observability` kernels**, whose frames were reserved by [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md). It defines **structured logs / OTel (vendor-neutral OTLP) / per-signal config gating / trace correlation / the handling of browser-side telemetry**.

## Status

Accepted

## Context

Left undecided, the schema of structured logs, the destination (browser → BFF relay vs direct to SaaS), whether to adopt observability SaaS SDKs and the propagation of trace IDs scatter into a shape where each feature imports a vendor SDK directly. This ADR settles them.

Logging is provided through **an abstract `Logger` interface (ctx-native, hiding the implementation library)**, and observability is built from **vendor-neutral OTLP only** / **per-signal config gating** / **official semconv only** — if application code holds vendor SDKs directly, swapping becomes structurally impossible, and if it cannot be cut per signal, "stop only traces" becomes "stop everything". This ADR lays this structure over the presentation layer (server + browser).

## Decision

### 1. Structured logs (the `logging` kernel)

- Logs go through **an abstract logger interface**, hiding the implementation (pino, etc.) from application code (the implementation library is settled in [0004](0004-library-management.md))
- **ctx-native**: the logger **automatically injects `trace_id` / `span_id`** from the execution context (on the server, a request context such as `AsyncLocalStorage`) (the caller does not pass them explicitly)
- Levels are Debug / Info / Warn / Error. **The destination is decided by injection** (the logging kernel does not read config directly; [0021](0021-frontend-responsibility.md))
- **The output format is JSON only, in every environment.** Human-friendly formatting is the job of the receiving side (whatever displays or forwards the logs), and the core does not switch formats by environment. If the format split by environment, the lines seen in development and the lines collected in production would be different things, and the difference would not show until production
- **The table of log keys is gathered in one place** (`LogFieldKey` in `src/logging/logger.ts`). The table holds `trace_id` / `span_id` / `request_id` / `error_code` / `latency_ms` / `cause`, and the OpenTelemetry semconv `exception.type` / `exception.message` / `exception.stacktrace` that carry an exception's contents. **Where official semconv has a name for an item, that name is used**, and no names of our own (`error_message`, etc.) are set up. Names not in the table can also be passed
- **PII / tokens / passwords are not put in logs** (masking; consistent with the redaction of [0080](0080-error-handling.md)). `console.log` is not left in commits ([0002](0002-formatter-linter.md) `noConsole`)
- **What is masked is decided by name; the shape of the value is not examined.** Trying to tell secrets apart from values lets what could not be told apart pass straight through, and what was thought to be told apart becomes false reassurance. The table of field names to mask is held by code (`src/logging`), and values under those names are masked regardless of shape

### 2. OTel (the `observability` kernel) = vendor-neutral OTLP only

- The export transport for telemetry is **fixed to OTLP**. **Application code (inner layers such as `features` / `components` / `model`) does not import vendor SDKs**. Even when a vendor SDK is used, it is confined behind the boundary as an **OTLP / OTel exporter implementation** of the `observability` kernel (§6), and vendor-specific routing / authentication is placed **on the Collector / Agent side or inside that exporter implementation**
- Resource attributes are **official semconv only** (`service.name` / `deployment.environment.name` / `service.version`, etc.). Custom / vendor-specific keys are not put in typed config
- W3C `TraceContext` + `Baggage` is the propagation convention (trace propagation across service boundaries). Injection into outbound `fetch` is **limited to the backend API's origin**, and `Baggage` is not passed to other destinations such as the IdP
- **Spans get the same redaction as logs** (the PII / token / password rule of 1 above covers both span attributes and span names).
- **Query strings are not dropped from spans.** Putting a value that should be secret in the query is itself the mistake, and the moment it is placed there it remains in the browser history, the referrer and access logs along the path. Masking it in the trace protects nothing, and instead makes it impossible to trace "which conditions make a request slow".
- **The query is not put in span names.** This is a requirement of **aggregation**, not secrecy — conditions differ per request, so including them in the name scatters requests on the same route across different names, and aggregation by name stops working. The conditions themselves remain in attributes (`url.full` / `url.query`), so they can be read when following one request at a time.

### 3. Per-signal config gating

- Traces / metrics / logs are **turned on/off individually by `OBS_*` config (`OBS_TRACES_EXPORTER` / `OBS_METRICS_EXPORTER` / `OBS_LOGS_EXPORTER`)**. The destination endpoint is not renamed to `OBS_*` and is received under OTel's standard name `OTEL_EXPORTER_OTLP_ENDPOINT` (the standard-name exception of [0028](0028-naming-convention.md)). There is no dedicated enable flag; **enabled is derived as the exporter value being non-empty and not `none`**
- **What to instrument is held on an axis separate from the transport**. Rendering instrumentation selects its range with `OBS_RENDER_SPANS` (`none` / `screen` / `part`) and is injected from the boot boundary. Disabling the exporter cannot be used in place of disabling instrumentation — even with `OBS_TRACES_EXPORTER=none`, if another signal is enabled the SDK sets up a tracer provider, and spans are recorded and then discarded (only the output drops to zero; the cost of instrumentation remains)
- Gating takes effect **at construction time** (a disabled signal creates no exporter / batcher / reader at all). Config is supplied as the typed Config of [0030](0030-environment-variable-management.md), and `observability` receives config by injection ([0021](0021-frontend-responsibility.md))
- **`logging` does not import `observability`** (the dependency direction is not inverted). For trace extraction, the extractor provided by `observability` is **injected** into logging

### 4. Correlating logs and traces

- Log lines that have an active trace context carry `trace_id` / `span_id`, lining them up on the same trace in the backend (the ctx-native injection of 1 above + OTLP log export). Correlation is governed by the signal gate above

### 5. Handling browser-side telemetry (specific to the presentation layer)

A configuration that assumes **a server-resident OTel exporter / batch processing / shutdown hooks** **does not carry over as is** to Next.js's browser, serverless or edge, so the following shape is adopted:

- **Server side (Node runtime)**: apply the equivalent of pino + otel-js from 1–4 above. On serverless, a long-lived exporter is not assumed; flush / OTLP send at the request boundary is the baseline
- **Browser-side telemetry uses the BFF relay as its seam**: values measured on the client are **sent to the server via `/api/*` (BFF) and exported over OTLP on the server side** (not sent directly from the browser to a SaaS / collector). This is consistent with [0030](0030-environment-variable-management.md)'s "do not expose secrets in `NEXT_PUBLIC_`" and "BFF runtime config", and also avoids vendor lock-in. Even when a vendor SDK is used, this seam is kept as **a relay via the own domain's `/api/*`** rather than browser → SaaS directly
- **The browser side is also instrumented with the OTel SDK**: the browser creates its own spans and sends them through the relay above. What the relay receives is OTLP itself, and the server passes it to the collector without reinterpreting it. **Only the destination is invisible to the browser** — the collector endpoint and credentials stay on the server side, and the seam does not change. The browser does not start its own trace; it takes the `traceparent` the server handed out as its parent (without it, browser-originated records would hang off the relay request's span and become children of a request in which no measurement happened). **Instrumentation is loaded after the first render** — putting the assets for measurement into the initial load worsens the very thing being measured

### 6. Observability backend = OTLP/OTel (vendor-neutral, vendor SDKs not bundled)

The export transport for observability is **OTLP / OTel only** (vendor-neutral), and **no particular observability / RUM SaaS SDK (Sentry / Datadog, etc.) is bundled in the core** (it depends on the use case). **The reversal condition is when an observability surface that cannot be expressed in OTLP is found by measurement** — when information obtainable only through that vendor's SDK can be said to be operationally indispensable. **"Faster to introduce" is not a condition** — speed does not balance the permanent cost of direct vendor references. Operational features such as error notification and alerting are done on the side of the **OTLP-compatible backend** chosen as the destination (any OTLP Collector / SaaS = Grafana / Honeycomb / Datadog / Sentry, etc.) — there is no operational feature the core should own badly enough to bundle a vendor SDK, and the destination side suffices. The core holds only the OTLP export endpoint and does not depend on vendor-specific SDKs.

- **Swappability ([0010](0010-standards-and-non-lockin.md))**: OTLP / OTel semconv are public W3C / CNCF standards, and the destination can be changed to any OTLP backend. The core holds no vendor SDK, so lock-in structurally does not arise (the designer is the one who chooses).
- When a vendor SDK is used, it is confined behind the boundary as an **OTLP / OTel exporter implementation** of the `observability` kernel (application code depends on the public surface (structural types) of `observability`; vendor concretes are not scattered across `features` / `components` / `model`; [0021](0021-frontend-responsibility.md)). On introduction: exact pin + `pnpm audit` ([0004](0004-library-management.md)).

## Prohibitions

- ❌ **Importing a vendor observability SDK (`@sentry/*`, etc.) directly from `features` / `components` / `model`** (do not scatter direct vendor references; wiring vendor SDKs is limited to `observability` / `adapters` / the boot boundary = §6 / [0010](0010-standards-and-non-lockin.md) / [0021](0021-frontend-responsibility.md)) (Enforcement: Prose — **partly mechanizable**. Known vendor SDKs (`@sentry/*`, etc.) could be rejected with `no-restricted-imports` on `features` / `components` / `model`, but no rule exists. Whether an unknown package is an observability SDK is not determined by its name)
- ❌ Wiring application code directly to vendor concretes and **making it unswappable** (the dependency target is the public surface of the `observability` kernel; do not bypass the OTLP / OTel skeleton and lock in to vendor-specific features) (Enforcement: Prose — **not mechanizable**. Whether a dependency is lock-in to a vendor-specific feature is decided by the meaning of the feature, not by the shape of the import)
- ❌ Putting custom / vendor-specific semconv keys into typed config (official semconv only) (Enforcement: Prose — **partly mechanizable**. A check rejecting keys passed to `resourceFromAttributes` that are not `ATTR_*` of `@opentelemetry/semantic-conventions` could be written, but no rule exists. Whether a typed config value corresponds to official semconv is decided by meaning)
- ❌ `logging` importing `observability` (dependency inversion; trace extraction is received by injection) (Enforcement: ESLint boundaries (`DEPENDENCIES` in `architecture.ts` gives `logging` no import targets))
- ❌ Putting injection from the boot boundary into a module variable (Next assembles the boot boundary and RSC as separate module graphs, and the same file is instantiated twice within one process; pass it via a registered symbol, which shares the realm) (Enforcement: Prose — **not mechanizable**. Whether a module variable holds injection from the boot boundary is decided by the path of what is assigned to it, not by the shape of the declaration)
- ❌ The `logging` / `observability` kernels reading config directly (receive it by injection; only the config kernel reads directly = [0030](0030-environment-variable-management.md); vendor DSNs / endpoints also go through typed config) (Enforcement: ESLint boundaries (`DEPENDENCIES` does not give `logging` / `observability` access to `config`) and `no-restricted-syntax` (rejects direct reads of `process` outside `NODE_RUNTIME_ACCESS`))
- ❌ Sending telemetry directly from the browser to a SaaS (BFF relay seam; keep going through the own domain even when using a vendor SDK) (Enforcement: `src/config/security-headers/security-headers.test.ts` (pins CSP `connect-src` to `'self'` and the backend's origin) and the E2E watch for `securitypolicyviolation`)
- ❌ Putting PII / tokens / passwords in logs / leaving `console.log` in commits ([0002](0002-formatter-linter.md))

## Notes

- This ADR defines logging and observability together in one. They are separate kernels, but trace correlation (§4) and redaction (§1 / §2) span both, so splitting them would mean writing the same rules in two places

## Related ADRs

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the `logging` / `observability` kernels (config received by injection)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — supply of `OBS_*` config / BFF runtime config / not exposing secrets
- [0028-naming-convention.md](0028-naming-convention.md) — the exception that OTel standard names (`OTEL_EXPORTER_OTLP_ENDPOINT`, etc.) are not renamed to `{SUBSYSTEM}_{NAME}`
- [0080-error-handling.md](0080-error-handling.md) — error log levels (5xx=error / 4xx=warn) and redaction (this ADR defines the schema and trace correlation)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — logging / trace propagation in the fetch wrapper / the implementation layer of the browser → BFF relay
- [0082-client-observability.md](0082-client-observability.md) — making the browser-originated paths concrete (trace / RUM / client errors / product analytics)
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md) — protection of the public endpoint produced by the relay seam
- [0002-formatter-linter.md](0002-formatter-linter.md) — `noConsole` (suppressing console.log)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — vendor-independent justification / swappability (valid with vendor SDKs removed; no lock-in via OTLP)
- [0004-library-management.md](0004-library-management.md) — exact pin + `pnpm audit` when introducing a vendor observability SDK
- [0020-adopted-architecture.md](0020-adopted-architecture.md) / [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — the `observability` / `adapters` boundary (where vendor SDKs are confined)
