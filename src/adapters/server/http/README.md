---
test-requirement: [unit, integration]
---

# http

The handling of responses and bodies shared by the request boundary in `server/`, and the per-target connection points.

**This directory does not declare the import ceiling.** Boundaries are declared at an element's root, and the root of the element containing this directory is [`adapters/`](../../README.md) ([0021](../../../../docs/adr/0021-frontend-responsibility.md)).

## Differences from the Parent

**The verification requirement differs from the parent's.** `adapters` declares `integration`, but it applies to **modules that make round trips
with the outside** ([README](../../README.md#operations)). Two kinds are placed here. Those that only map values between request and
response hold neither `fetch` nor an injected `fetchImpl`; imposing a boundary test on something without a boundary
leaves nothing to check against, so they are `unit`. The client that calls the external API, and the connection points that hold one per
target, go outside, so they are `integration`.

**The decision is made by "does the module go outside", not by its directory location.** If more modules that go outside
are added here, only those modules go back to `integration`.

| Module | Verification | Reason |
| --- | --- | --- |
| [`data-scope.ts`](data-scope.ts) | `unit` | The fetch endpoint's classification, and the gate on caching and credential headers |
| [`error-status.ts`](error-status.ts) | `unit` | The table from classification to status |
| [`error-response.ts`](error-response.ts) | `unit` | Builds a response from a classification |
| [`json-request.ts`](json-request.ts) | `unit` | Checks the type and size of a received request |
| [`public-client.ts`](public-client.ts) | `integration` | The connection point for what can be fetched without naming a principal |
| [`request.ts`](request.ts) | `integration` | Calls the external API |
| [`user-scoped-client.ts`](user-scoped-client.ts) | `integration` | The connection point for what is tied to a principal. The only place the credential getter is passed |
| [`retry-policy.ts`](retry-policy.ts) | `unit` | Decides from the status whether to retry |
| [`search-params.ts`](search-params.ts) | `unit` | Maps a query to raw values |
| [`circuit-breaker.ts`](circuit-breaker.ts) | `unit` | Cuts off a target by failure rate. The caller passes the clock |
| [`retry-budget.ts`](retry-budget.ts) | `unit` | The retry budget. No retries once it is used up |
| [`resilience-profile.ts`](resilience-profile.ts) | `unit` | Defaults for attempts, retries and circuit breaking (where the values in the table below live) |
| [`patch-payload.ts`](patch-payload.ts) | `unit` | Separates "leave untouched" from "clear" in partial updates by type, and drops keys whose value is `undefined` |

## What Belongs Here

- The rules for responses and bodies shared by the request boundary in `server/`

- Resilience settings replaced per target (because how much degradation is tolerable varies with the target's nature; `ResilienceProfile`)

- One connection point per pair of target and classification (the circuit breaker and retry budget live inside the client as state, so splitting clients toward the same target splits the judgment of degradation)

## What Does Not Belong Here

- Business logic, contracts specific to one particular endpoint

- Rate limiting and global cut-offs (the responsibility of the edge / WAF; `json-request.ts` checks only the declared type and the body size)

## What to Change When Adopting

**The time and number of attempts allowed for outbound round trips are held by code, not environment variables** (`DEFAULT_PROFILE` in
`resilience-profile.ts`). They are values set by the counterpart's nature, so they are what to re-measure when the target is replaced.

| What | Default | Where to change it |
| --- | --- | --- |
| Per-attempt and overall limits | `perAttemptTimeoutMs` 3 s / `overallTimeoutMs` 10 s | `resilience-profile.ts`. Take the limits from the distribution of the counterpart's response times |
| Number of attempts and retry budget | `maxAttempts` 3 / `retryBudgetRatio` 0.1 | Same as above. The overall limit is slightly more than three times the per-attempt one, so raising only the count is blocked by overall |
| Circuit-breaking conditions | `failureRate` 0.5 / `sampleSize` 20 / `openMs` 5 s / `halfOpenProbes` 3 | Same as above |

**Each target can be given different values** (by replacing the `ResilienceProfile`). This is because how much degradation is tolerable
varies with the target's nature; when one default is not enough, add profiles.

The basis for choosing the values is held by [0071](../../../../docs/adr/0071-bff-api-integration.md).

## Related ADRs

The decisions this compartment's code depends on. **Comments do not point at ADRs directly; they follow this section**
([docs/rules.md](../../../../docs/rules.md#comments)). The list for the whole layer is held by the
[parent README](../../README.md).

- [0080](../../../../docs/adr/0080-error-handling.md) — The failure classification, its mapping to status, and the text shown in responses
- [0071](../../../../docs/adr/0071-bff-api-integration.md) — The fetch wrapper's responsibilities, and the timeout / retry / breaker values
- [0112](../../../../docs/adr/0112-data-classification-cache-boundary.md) — The fetch endpoint's classification (`public` / `user-scoped`), and the checkpoint for caching and credentials
- [0079](../../../../docs/adr/0079-auth-frontend-seam.md) — Only the request boundary builds credentials
- [0077](../../../../docs/adr/0077-bff-abuse-protection-boundary.md) — The minimal defence (type and size) for an endpoint that requires no authentication
- [0075](../../../../docs/adr/0075-file-upload-seam.md) — Handling requests whose body is a byte sequence
- [0090](../../../../docs/adr/0090-testing-strategy.md) — Per-layer verification responsibilities (the range the `integration` declaration covers)
