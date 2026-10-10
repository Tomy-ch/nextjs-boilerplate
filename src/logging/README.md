---
imports-allowed: [] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [business-logic, direct-config-access]
test-requirement: unit
---

# logging

The kernel that provides structured logging. It imports neither configuration values nor observability; both are injected from the boot boundary. This README is the kernel's front desk: it holds the writing side's contract and the shapes that remain even if the implementation is deleted. The wiring order at the boot boundary, the single line from the browser to the server and on to the collector, and the mechanism that passes injections through a registered symbol are owned by [Observability](../../docs/design/observability.md).

## What Belongs Here

- A context-based logger, attaching `trace_id`, structured logs, redaction

## What Does Not Belong Here

- Business logic, direct references to config

## Structure

- `logger.ts` defines only the contracts the application depends on: `Logger`, additional fields, the trace extractor, and the output sink. **It does not declare `server-only`** — it holds only contracts and a table of names and exposes no Pino types, so it may enter the browser-side bundle.
- `logger.ts` also holds the names of the fields to redact (`authorization` / `cookie` / `password` / `token`). **Both logs and spans consult this one table** — [0081](../../docs/adr/0081-observability-logging.md) requires the same redaction on both, and if the table split in two, only one side would loosen. On the span side it is applied by the relay in `adapters/server/telemetry`.
- `pino.server.ts` implements JSON stdout output with Pino. It replaces fields matching the table above with `[REDACTED]`, case-insensitively. This is the only file that knows Pino.
- `logging.server.ts` initializes the in-process singleton once, with the configuration injected from the boot boundary. Application server-side code uses `getLogger()` and does not import Pino directly. It also holds `reportQuietly()`, which keeps a recording failure from propagating to the caller (see "Shape on the Writing Side" below).

When the injected trace extractor returns a valid span at log time, `trace_id` and `span_id` are attached to the structured fields automatically. **Callers cannot pass these two** — `LogFields` rejects them by type. Correlation is taken from the execution context, not passed explicitly by the caller (the ctx-native stance of [0081](../../docs/adr/0081-observability-logging.md)). The same normalized record is also passed to the injected sink when needed. Sending to OTLP Logs is done by observability implementing this sink, and no dependency from logging to observability is created.

### The Field Name Table

The names of structured fields are held in one place, `LogFieldKey` in `logger.ts` (the log key table [0081](../../docs/adr/0081-observability-logging.md) asks for). If an item with the same meaning were recorded under different names by different callers, the backend could no longer query it as one question. `LogFields` types the names in the table.

- `trace_id` / `span_id` cannot be passed. The logger attaches them from the running span
- `cause` accepts only a string (the reason is in "Shape on the Writing Side" below)
- `latency_ms` accepts a number
- Exception details are recorded under the OpenTelemetry semconv names (`exception.type` / `exception.message` / `exception.stacktrace`), each accepting a string. No custom names (`error_message` and the like) are introduced

Names not in the table can be passed too. However, an item that has a name in the official semconv uses that name.

### Record Shape

A line holds the `level` / `time` / `msg` that Pino adds, the caller's fields, and the trace correlation (`trace_id` / `span_id`). Pino's default `pid` / `hostname` are not included (`base: undefined`). What the sink receives is the same normalized record as stdout — the redacted `fields` plus `level` and `message` — and there is no path by which the sink sees raw values.

### Level words are the same in three places

The `LogLevel` values (`debug` / `info` / `warn` / `error`) are at once the method names of `Logger`, the lookup target for Pino's method names (`this.#logger[level]`), and the key the OTLP sink uses to look up severity. [0081](../../docs/adr/0081-observability-logging.md) fixes the set of levels at four, and changing a word presupposes that the three places stay aligned on the same word.

## Shape on the Writing Side

**A recording failure must not make the recorded operation fail too.** `getLogger()` throws in executions that did not pass through the boot boundary (tests, scripts that do not go through `instrumentation.ts`). Recording is a means to trace things later, not a result shown to users, so **recording inside an operation whose success or failure is visible to users (screen rendering, Server Actions, Route Handlers, adapter fetches) is wrapped in `reportQuietly()`**.

A fetch that degrades and continues takes this shape.

```ts
try {
  return await read();
} catch (cause) {
  reportQuietly(() => getLogger().warn("<何>を読めませんでした", { cause: String(cause) }));

  return null;
}
```

- **The cause of a failure goes in `cause` as a string.** Putting an `Error` as is becomes `{}` in the OTLP sink (the reason is in [Observability](../../docs/design/observability.md#error-や-date-をそのままフィールドに載せると空になる), "Putting an `Error` or a `Date` straight into a field leaves it empty"). Items that have a name in the official semconv (`exception.type` / `exception.message` / `exception.stacktrace` / `http.route`) use that name.
- **Choose the level along the line [0080](../../docs/adr/0080-error-handling.md) draws, and record the same failure only once, at the boundary.**
- **Keep fields flat.** Only top-level field names are redacted; names inside nested objects are not checked. The sink, on the other hand, sends nested values recursively. Names that carry secrets go at the top level.
- **Do not use `console.*`.** Biome's `noConsole` checks this ([0002](../../docs/adr/0002-formatter-linter.md)).

## Execution Mechanics

`src/instrumentation.ts` calls `initializeLogger()` when the Node.js server starts. The stdout Pino logger is always initialized here, the level and the trace extractor are injected here, and the OTLP sink is injected too only when `OBS_LOGS_EXPORTER=otlp`. There is no per-request reinitialization.

The injected logger is stored not in a module variable but on `globalThis`, keyed by a `Symbol.for` registered symbol. The reading side treats it as a value written by another module instance and checks that it has the shape of `Logger` before using it. Why the same file is instantiated twice in one process, and where a module variable suffices instead, are owned by [Observability](../../docs/design/observability.md#注入は-registered-symbol-で渡す), "Injection is passed through a registered symbol".

## Operations

- Output destination, level and enablement settings are received by injection
- Do not leave secrets or personal information in logs
- **To redact more names, add them to the table in `logger.ts`.** Pino's `redact`, the normalization before handing to the sink, and the span relay all read the same table, so there is nowhere else to change. The table works by name, so one change is complete only once the sides that carry secrets under that name are aligned too. Its effect is pinned by `pino.server.test.ts` on both stdout and the sink
- **Write the names in the table in lowercase.** Matching lowercases the keys, so an entry containing uppercase would never match. Pino's `redact` is case-sensitive, but normalization is done before values reach it

## Testing

- The singleton is stored under a realm registered symbol, so **`vi.resetModules()` does not clear it**. Discard it before each case with `Reflect.deleteProperty(globalThis, Symbol.for("nextjs-boilerplate.logging.logger"))`
- `destination` of `createLogger()` is an injection point for reading the output. Pass a `PassThrough` and pin the JSON that was written. Do not capture stdout
- Tests on the consuming side replace `@/logging/logging.server` as a whole module. Make `getLogger` a function returning a spy and `reportQuietly` a function that calls the given function as is, and **supply both** — dropping one makes the import `undefined` and fails at the recording line

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: business-logic` — holds no business logic | violation | [0021](../../docs/adr/0021-frontend-responsibility.md), the fourth of its acceptance criteria for kernels |
| `forbidden: direct-config-access` — does not import `config` and does not read `process.env`. Settings are received by injection from the boot boundary | violation | The prohibitions in [0081](../../docs/adr/0081-observability-logging.md). Machine: ESLint boundaries and `NODE_RUNTIME_ACCESS` in `architecture.ts` |
| Application server-side code uses `getLogger()` and does not import Pino directly | violation if `pino` is imported outside `pino.server.ts` | This README, "Structure" |
| The table of names to redact is the single one in `logger.ts`, and both logs and spans consult it | violation if a table of names to redact exists elsewhere | This README, "Structure" / [0081](../../docs/adr/0081-observability-logging.md) |
| Recording inside an operation whose success or failure is visible to users is wrapped in `reportQuietly()` | suggestion (whether an operation's outcome is visible to users is not determined by the shape of the call) | This README, "Shape on the Writing Side" / [Observability](../../docs/design/observability.md#getlogger-は初期化前に投げる), "`getLogger()` throws before initialization" |
| Injections from the boot boundary are not stored in module variables | suggestion (the path of the assigned value is not determined by the shape of the declaration) | The prohibitions in [0081](../../docs/adr/0081-observability-logging.md) |

## Related ADRs

- [0021](../../docs/adr/0021-frontend-responsibility.md) — The layer line: do not import config, receive injections from the boot boundary
- [0080](../../docs/adr/0080-error-handling.md) — Error log levels (5xx = error / 4xx = warn), and recording only once at the boundary
- [0081](../../docs/adr/0081-observability-logging.md) — The vendor-neutral policy of structured logs, redaction, and converging on OTLP
