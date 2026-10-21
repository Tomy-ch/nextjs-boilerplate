# api

The compartment that holds only Route Handlers. It sits inside `app`, but **this directory declares nothing** —
the verification perspectives it carries and the layers it may import are decided by the element, not by its location.

## Differences from the Parent

**This directory does not declare the verification requirement.** What a Route Handler checks is not rendering but **the types and shapes of the HTTP boundary**
(status, headers, body), and that does not change whether it is placed under `api/` or outside it. It is decided by the element,
not the location, so the declaration is held by `APP_ELEMENTS` in `architecture.ts` for `route.ts` / `route.dev.ts`
([0025](../../../docs/adr/0025-app-layer-elements.md) / [0090](../../../docs/adr/0090-testing-strategy.md)).

Written here, the same element moved outside `api/` would inherit the parent's `route`.

**The same goes for boundaries.** Only `route.ts` and `route.dev.ts` live here, and each of them is,
as `app-route-handler`, denied `components` / `capabilities` / `stores` / `config` / `observability` and
the inside of features (declared by `APP_ELEMENTS` in `architecture.ts`; pointing at a feature goes through
`facade/`, which passes as a separate element). Writing the `app` layer's permissions here would mean **a value that is not
the effective permission of any file in this compartment** is read as the ceiling for changes
([AGENTS.md](../../../AGENTS.md#task-execution-protocol), *Task Execution Protocol*, step 1).

Boundaries are declared at an element's root, and the root of the element containing this compartment is [`src/app/`](../README.md).

## What Belongs Here

- Relaying to the backend, and validating its inputs and outputs
- Communication with counterparts the browser cannot call directly, such as the authentication round trip

## How Failures Are Returned

**Response assembly is not held here.** Building status and text from a classification is held by
[`adapters/server/http/error-response.ts`](../../adapters/server/http/error-response.ts), and the minimal defence (type and size) for an
endpoint that requires no authentication by
[`json-request.ts`](../../adapters/server/http/json-request.ts). Written per endpoint, the shape returned would split by
the number of endpoints, and every new one would have to be read to confirm they still match.

## What Does Not Belong Here

- Business logic ([0070](../../../docs/adr/0070-backend-role-separation.md))
- Raw `fetch` (go through `adapters`)
- Rendering

## Modules

| Module | Role |
| --- | --- |
| [`auth/`](auth) | The authentication round trip. Authorization code exchange with the IdP, and issuing and discarding the session cookie |
| [`telemetry/`](telemetry) | The endpoint that receives browser-originated reports (Web Vitals / uncaught exceptions). **It requires no authentication, so it holds the minimal defence itself** ([0077](../../../docs/adr/0077-bff-abuse-protection-boundary.md)) |
| [`telemetry/traces/`](telemetry/traces) | The endpoint that hands spans the browser created to the collector as OTLP. The contract originates on the OTel side, so it is a separate endpoint from its neighbour |

<!-- sample:begin -->
What the bundled sample adds:

| Module | Role |
| --- | --- |
| `products/` | A BFF that relays incremental fetching of a list |
| `addresses/` | A BFF that relays address autocomplete from a postal code. Called by a screen during input |
<!-- sample:end -->

## Related ADRs

The decisions this compartment's code depends on. **Comments do not point at ADRs directly; they follow this section**
([docs/rules.md](../../../docs/rules.md#comments)). The list for the whole layer is held by the
[parent README](../README.md).

- [0025](../../../docs/adr/0025-app-layer-elements.md) — What a Route Handler can hold (a thin proxy, and its exceptions)
- [0071](../../../docs/adr/0071-bff-api-integration.md) — The scope of `/api/*`, and calling external APIs through `adapters`
- [0070](../../../docs/adr/0070-backend-role-separation.md) — The line of responsibility that holds no business logic
- [0073](../../../docs/adr/0073-pagination-fetch-boundary.md) — Which boundary receives incremental fetching
- [0077](../../../docs/adr/0077-bff-abuse-protection-boundary.md) — The minimal defence for an endpoint that requires no authentication
- [0079](../../../docs/adr/0079-auth-frontend-seam.md) — The authentication round trip (authorization code exchange / issuing and discarding the session cookie)
- [0080](../../../docs/adr/0080-error-handling.md) — Mapping from classification to status and text
- [0081](../../../docs/adr/0081-observability-logging.md) — Relaying browser-originated signals, and what to keep in logs
- [0090](../../../docs/adr/0090-testing-strategy.md) — Verifying Route Handlers as `integration`
