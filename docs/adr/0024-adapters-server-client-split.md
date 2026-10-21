# The server/client Split of adapters and the Client-Side External Connection Boundary

[0071](0071-bff-api-integration.md) sets the contents of `adapters` (BFF / API integration), and [0022](0022-capabilities-kernel.md) sets `capabilities` (client runtime hooks). Pairing the two only along the diagonal "`adapters` = external systems × server / `capabilities` = runtime × client" leaves **the "external systems × client" cell empty** — there is no home for IO that leaves the browser for the outside (client→BFF fetch / WebSocket, SSE / sending analytics or telemetry).

This ADR settles this **client-side external connection boundary** by **splitting `adapters` into two faces, server / client, within one kernel**. Together with this, it positions `adapters` and `capabilities` with a **two-axis model**. The supply of policy state (consent / flag) is set by [0031](0031-policy-state-supply.md), building on this ADR's adapters/client.

## Status

Accepted

## Context

If `adapters` is server-only, `capabilities` explicitly rejects remote IO, and [0071](0071-bff-api-integration.md) prohibits raw fetch in `features` / `components`, then **every exit is closed** for external IO originating on the client. "Sending analytics", which [0021](0021-frontend-responsibility.md) gives as an example of `adapters`, also happens only on the client, so it cannot coexist with a server-only declaration. Client-side external connections need an explicit place.

## Decision

### 1. The Two-Axis Model

Boundary kernels are positioned on two axes:

- **WHAT**: remote external systems (what the app calls) / local runtime (the container the app runs in)
- **WHERE**: server / client

| | server | client |
| --- | --- | --- |
| **Remote external systems** | `adapters/server` | `adapters/client` |
| **Local runtime** | (config / `instrumentation.ts`) | `capabilities` |

`capabilities` is not a "client mirror" of `adapters`; **its WHAT differs** (the runtime boundary). The substantive rules of `capabilities` (responsibilities, use-client, what it does not accept) are held by [0022](0022-capabilities-kernel.md); this ADR sets its position.

### 2. Splitting `adapters` into Two Faces, server / client, within One Kernel

The external system boundary is **one responsibility** (type conversion + resilience), and server / client is **a difference in execution context**. It is not made into separate kernels (to avoid one responsibility splitting across two kernels).

**This difference is not an element of the boundary check.** The boundary check looks only between layers and areas, and both `server/` and `client/` sit in the same `adapters` element. Separation by execution context is held by a different axis (`server-only`, below).

```text
src/adapters/
├── gen/      area: adapters-gen (generated from the contract. [0072](0072-api-type-generation.md))
├── http/     area: adapters-http (no execution context; rules both faces follow)
├── server/   face: server execution context (element: adapters. contains the area adapters-auth)
└── client/   face: client execution context (element: adapters)
```

| Face | Execution context | May import | Contents |
| --- | --- | --- | --- |
| `adapters/server` | **server-only** (`import "server-only"`) | `model` / `errors` / `logging` / **`config` (only here)** | Backend API client, with secrets, resilience ([0071](0071-bff-api-integration.md)) |
| `adapters/client` | **`"use client"`** | `model` / `errors` / `logging` / client config (**no server config, no secrets**; client config = NEXT_PUBLIC literals allowed) | Same-origin BFF fetch / WebSocket, SSE ([0074](0074-runtime-communication-seam.md)) / sending telemetry ([0082](0082-client-observability.md)) / sending uploads (selection and validation before handing a file to the receiving endpoint ([0075](0075-file-upload-seam.md)); the default is decided by the backend's receiving endpoint = [0075](0075-file-upload-seam.md)) / sending analytics (**only when this app assembles the sending**; the bundled tag manager has no assembly and does not go through here = [0082](0082-client-observability.md)). **Remote only** |

- **Local browser APIs (Web Storage, reading client cookies) belong to `capabilities`, not `adapters`** ([0022](0022-capabilities-kernel.md)). The same shape as clipboard = browser runtime APIs, not external systems
- **Destination origin**: the same-origin BFF (`/api/*`) is the main route. **Sending outside the same origin is also owned by `adapters/client`, only when an ADR explicitly allows it** (connecting realtime directly to the backend / managed services ([0074](0074-runtime-communication-seam.md))). Telemetry is relayed through the BFF per [0081](0081-observability-logging.md) (direct sending to the outside is prohibited). **The tag manager alone is an exception and does not go through `adapters/client`** — the point that loads it is held by a client island in `app`, and the sending is done by the container's contents ([0082](0082-client-observability.md) / [0131](0131-cookie-consent.md))
- **Rules with no execution context are placed in an area, not under a face** (`src/adapters/http/`). A rule that applies equally to sending from server and client, such as the request URL budget, cannot be imported by one face if placed under the other, and the rule splits in two. `architecture.ts` declares it as `adapters-http`, reachable only from inside `adapters`
- `features` may import the public surfaces of both faces. `capabilities` does not import `adapters`
- **The secret / RSC boundary is not enforced by ESLint boundaries.** The boundary check looks only between layers and areas and has no distinction between server and client ([`scripts/server-only.gate.test.ts`](../../scripts/server-only.gate.test.ts)). Enforcement is twofold — the **build-time failure** of `import "server-only"` declared by server-only modules, and that same gate, which checks whether the modules declaring it have the guard. **It cannot be split at the granularity of layers**, so do not try to add this axis to the layer dependency table

## Prohibitions

- ❌ Placing secrets / server config in `adapters/client` (leaks into the client bundle). NEXT_PUBLIC literals in client config are allowed
- ❌ Mixing client hooks / `"use client"` into `adapters/server` (and vice versa; the RSC boundary; [0040](0040-routing-rendering-strategy.md))
- ❌ Placing local browser APIs (storage / clipboard / reading cookies) in `adapters` (→ `capabilities`) (Enforcement: Prose — **mechanizable** (fail references to `localStorage` / `sessionStorage` / `navigator.clipboard` / `document.cookie` under `src/adapters/` with `no-restricted-syntax`. No rule exists))

## Notes

- The source adapter and supply policy for policy state (consent / flag) are set by [0031](0031-policy-state-supply.md), building on this ADR's adapters/client.

## Related ADRs

- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the contents of `adapters` (BFF / API integration). This ADR settles its server/client faces
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — `capabilities` (runtime hooks). This ADR positions it with the two-axis model
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — the source adapter + supply for consent / flag (built on this ADR's adapters/client)
- [0025-app-layer-elements.md](0025-app-layer-elements.md) — Route Handlers (the receiving side of client sending = what imports `adapters/server`)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the RSC / Client boundary (the basis for mechanically enforcing server-only / use-client)
- [0081-observability-logging.md](0081-observability-logging.md) — relaying browser→BFF (the client sending face = `adapters/client`)
