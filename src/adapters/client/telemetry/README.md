---
test-requirement: unit
---

# telemetry

The surface that assembles browser-originated signals and sends them to the relay, plus browser-side instrumentation.

**This directory does not declare the import ceiling.** Boundaries are declared at an element's root, and the root of the element containing this directory is [`adapters/`](../../README.md) ([0021](../../../../docs/adr/0021-frontend-responsibility.md)).

## Differences from the Parent

**The verification requirement differs from the parent's.** `adapters` declares `integration`, but it applies to modules that
**directly hold** `fetch` (or an injected `fetchImpl`) ([README](../../README.md#operations),
*Operations*). Nothing placed here holds one — reports are sent with `sendBeacon`, and turning requests into spans
is done by OTel's instrumentation; the code in this directory holds only assembly and registration.

**The decision is made by "does the module go outside", not by its directory location.**

| Module | Verification | Reason |
| --- | --- | --- |
| [`report-telemetry.ts`](report-telemetry.ts) | `unit` | Assembles reports and hands them to `sendBeacon` |
| [`route-pattern.ts`](route-pattern.ts) | `unit` | Restores the route pattern from a path |
| [`browser-tracer.ts`](browser-tracer.ts) | `unit` | Assembles and registers the OTel provider and instrumentation. The SDK does the actual sending |

**Span names do not include the query.** Conditions differ per request, so including them scatters requests to the same route across different names ([0082](../../../../docs/adr/0082-client-observability.md)). The default instrumentation keeps the URL including the query in the `url.full` attribute, so read that when tracing individual requests.

## What Belongs Here

- Assembling and sending reports, and starting browser-side instrumentation

## What Does Not Belong Here

- Business logic, receiving-side validation (held by `server/telemetry/`)

## Related ADRs

The decisions this compartment's code depends on. **Comments do not point at ADRs directly; they follow this section**
([docs/rules.md](../../../../docs/rules.md#comments)). The list for the whole layer is held by the
[parent README](../../README.md).

- [0082](../../../../docs/adr/0082-client-observability.md) — What is measured and what is sent. What may go into a span name
- [0077](../../../../docs/adr/0077-bff-abuse-protection-boundary.md) — The limits the receiving endpoint holds. The sending side's truncation is a copy of them
- [0090](../../../../docs/adr/0090-testing-strategy.md) — Per-layer verification responsibilities (why it is treated as `unit`)
