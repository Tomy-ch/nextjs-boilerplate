---
test-requirement: [unit, integration]
---

# stream

The surface that **opens and reads** long-lived connections. The backend holds the connection; what this directory holds is the state
machine of one subscription and the components that assemble it ([parent README](../../README.md#a-subscription-holds-only-the-opening-and-reading-side)).

**This directory does not declare the import ceiling.** Boundaries are declared at an element's root, and the root of the element containing this directory is [`adapters/`](../../README.md) ([0021](../../../../docs/adr/0021-frontend-responsibility.md)).

## Differences from the Parent

**The verification requirement differs from the parent's.** `adapters` declares `integration`, but it applies to modules that
**directly hold** an endpoint going outside ([README](../../README.md#operations)). Here only
`subscription.ts` holds one; the rest are components handling position, envelope, ordering and wait time, and what is checked is the
correctness of the values themselves.

**The decision is made by "does the module go outside", not by its directory location.**

| Module | Verification | Reason |
| --- | --- | --- |
| [`subscription.ts`](subscription.ts) | `integration` | Calls the ticket-issuing relay and opens an `EventSource` |
| [`use-stream.ts`](use-stream.ts) | `unit` | Binds a subscription to a component's lifetime. A hook can only be called through a React tree, so it is checked with RTL's `render` / `act` |
| [`cursor.ts`](cursor.ts) | `unit` | How positions are represented and compared |
| [`envelope.ts`](envelope.ts) | `unit` | Reading the envelope and control directives |
| [`ordering.ts`](ordering.ts) | `unit` | The window that fixes out-of-order arrival, and the memory of the position delivered |
| [`backoff.ts`](backoff.ts) | `unit` | The wait before reconnecting |

## What Belongs Here

- The state machine of one subscription, and the components that assemble it

## What Does Not Belong Here

- The body shape. The per-resource module (`client/api/<resource>.ts`) declares it
- Holding the connection, event numbering, who gets what. The backend holds these

## Related ADRs

The decisions this compartment's code depends on. **Comments do not point at ADRs directly; they follow this section**
([docs/rules.md](../../../../docs/rules.md#comments)). The list for the whole layer is held by the
[parent README](../../README.md).

- [0074](../../../../docs/adr/0074-runtime-communication-seam.md) — The choice and rejections of the subscription seam, and the division of responsibility. The constraint that tickets do not go into UI text, logs or spans
- [0090](../../../../docs/adr/0090-testing-strategy.md) — Per-layer verification responsibilities (why `unit` and `integration` are declared separately)
