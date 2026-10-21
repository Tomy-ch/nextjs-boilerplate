---
test-requirement: unit
---

# telemetry

The receiving side that validates signals relayed from the browser and puts them onto signals.

**This directory does not declare the import ceiling.** Boundaries are declared at an element's root, and the root of the element containing this directory is [`adapters/`](../../README.md) ([0021](../../../../docs/adr/0021-frontend-responsibility.md)).

## Differences from the Parent

**The verification requirement differs from the parent's.** `adapters` declares `integration`, but it applies to modules that make round trips
with the outside ([README](../../README.md#operations)).

**The decision is made by "does the module go outside", not by its directory location.**

| Module | Verification | Reason |
| --- | --- | --- |
| [`browser-telemetry.ts`](browser-telemetry.ts) | `unit` | Validates reports and hands them to metrics and logs |
| [`browser-traces.ts`](browser-traces.ts) | `integration` | Relays OTLP to the collector |

## What Belongs Here

- Validating the bodies the relay received, and handing them to signals

## What Does Not Belong Here

- Business logic, assembling the sending surface (held by `client/telemetry/`)

## Related ADRs

The decisions this compartment's code depends on. **Comments do not point at ADRs directly; they follow this section**
([docs/rules.md](../../../../docs/rules.md#comments)). The list for the whole layer is held by the
[parent README](../../README.md).

- [0081](../../../../docs/adr/0081-observability-logging.md) — How things are put onto OTLP, and the rules for structured logs
- [0082](../../../../docs/adr/0082-client-observability.md) — Which signals browser-originated Web Vitals and exceptions are mapped to
- [0077](../../../../docs/adr/0077-bff-abuse-protection-boundary.md) — A receiving endpoint that requires no authentication checks for itself
