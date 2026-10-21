# Role Separation from the Backend

This ADR makes concrete [0011](0011-no-docker.md)'s "Next.js = presentation layer / backend in a separate repo", defining **the scope of responsibility Next.js carries / the BFF boundary (the responsibilities of `/api/*`) / where domain logic lives / the SSOT of the contract with the backend / ownership of boundary values**.

## Status

Accepted

## Context

This ADR settles the responsibilities Next.js carries (UI / auth token exchange / BFF / aggregation — how far), the contract with the backend (REST / GraphQL / RPC, and where the SSOT lives), and where domain logic lives.

The BFF boundary is derived from [0011](0011-no-docker.md)'s thin-proxy decision and the principle "authentication and DB are use-case dependent (out of scope)". **The contract SSOT and ownership of boundary values** are derived from the relationship in which the backend owns the contract artifact and the frontend is its consumer.

## Decision

### Next.js's scope of responsibility

- Next.js limits its responsibility to **UI rendering + a thin BFF**. Business logic, the domain model and persistence are held by the backend's separate repo / separate service ([0011](0011-no-docker.md))
- What remains "domain-like" in the presentation layer is only the display `model` (VOs / formatters / display validation) ([0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md)). It holds no business rules

### `/api/*` = thin proxy (the BFF boundary)

- `/api/*` (Route Handlers) are limited to a **thin proxy**. The permitted responsibilities stop at proxying to the backend / the seam for relaying and exchanging auth tokens / adding minimal headers ([0011](0011-no-docker.md) thin proxy)
- **Do not write business logic or heavy aggregation of several APIs in `/api/*`**. Even when aggregation is needed, it is done minimally in a feature's server functions / `adapters` ([0021](0021-frontend-responsibility.md)), avoiding the BFF turning into a business layer
- **The concrete model of authentication and sessions is use-case dependent** (out of scope; Auth.js / Clerk / a BFF of our own / a SaaS IdP, etc.). This repository allows a seam for token exchange but presupposes no particular IdP or session scheme

### The SSOT of the contract with the backend

- **The SSOT of the contract is `openapi.gen.yaml` in the backend repo**. The backend commits the bundled spec as a cross-repo contract artifact, and the frontend acts purely as its consumer. REST + OpenAPI is the contract format
- The frontend takes in this artifact and generates types + runtime validation. The intake mechanism and generation are governed by [0072](0072-api-type-generation.md)
- **Do not duplicate the backend API spec with hand-written types**

### Ownership of boundary values

- **OpenAPI is a wire contract, not a domain rule**. Boundary values are owned by a different concern at each layer
- Directional invariant: **OpenAPI request constraints ⊆ domain rule ⊆ OpenAPI response capacity** (requests are the strictest, responses the loosest)
- **Responses have no server-side runtime validation**, so **the frontend's generated validation (zod) is the last line of defense for detecting contract breaches**. Therefore the frontend performs **runtime validation of responses at the `adapters` boundary** (concretely, zod validation in [0072](0072-api-type-generation.md), with [0071](0071-bff-api-integration.md) as the receiving point)
- Do not leak generated types or external types into inner layers ([0020](0020-adopted-architecture.md) design principle 3, the ban on type leaks). Conversion into our own view types happens at the owning boundary = `adapters`
- **Do not exhaustively sanitize values that came from upstream.** Making values returned by the backend, values users entered, and values arriving from third parties safe against every malice the presentation layer can imagine is not set as a design goal. What is taken care of is **the values this layer produced itself** — when it renders a string it assembled itself, when it opens a URL it built itself, when it sends out a value it held itself. Trying to take on more than that expands what must be protected without limit, and **lets the real owner (the layer that produced the value) off the hook.** Threats that can be identified are placed by name (the rendering allowlist, restricting send destinations), but that is an individual judgment, not exhaustiveness
- **Do not derive in the presentation layer values the contract does not return.** Something whose calculation rule lives in the backend, such as an aggregate computed from a list's rows, is not on the screen if it is not in the contract. Assembling it in the presentation layer creates a copy of the rule, and when the backend changes the rule only the screen shows the old value. If it is needed, add it to the contract

## Prohibitions

- ❌ Writing business logic, a domain model or heavy aggregation in `/api/*` (limited to a thin proxy)
- ❌ Adding a DB connection or ORM to `src/` ([0011](0011-no-docker.md)) (Enforcement: none — a decision not to adopt. A DB connection or ORM shows up in the diff as added dependencies and connection code, and not having them is itself the state)
- ❌ Duplicating the backend API spec with hand-written types (SSOT = `openapi.gen.yaml`; generation is [0072](0072-api-type-generation.md)) (Enforcement: Prose — **not mechanizable**. Whether a hand-written type is a copy of the contract is decided by meaning, not by matching shape, and it cannot be told apart from a view type of our own that happens to have the same shape)
- ❌ Building a particular authentication / session model into this repository as a premise (use-case dependent) (Enforcement: Prose — **not mechanizable**. Whether a particular model is presupposed is a judgment about the shape of the seam, not decided by the shape of the code)
- ❌ Leaking generated types or external types into inner layers such as `model` (conversion is at the `adapters` boundary) (Enforcement: ESLint boundaries (`adapters-gen` in `RESTRICTED_AREAS` of `architecture.ts`) rejects direct imports of generated artifacts from `model` / `features`. Passing them through via the public surface of `adapters` is Prose — **not mechanizable**. Whether the type the public surface returns is a generated type or our own view type is decided by the origin of the inferred type, not by the shape of the import)
- ❌ Computing and showing in the presentation layer values the contract does not return (aggregates, etc.) (it becomes a copy of the rule) (Enforcement: Prose — **not mechanizable**. Whether a presentation-layer calculation is a copy of a backend rule is decided by the meaning of the calculation, not by the shape of the expression)
- ❌ Taking on, as this layer's responsibility, exhaustive sanitization of values that came from upstream (what is taken care of is the values it produced itself; threats that can be identified are placed by name)

## Related ADRs

- [0011-no-docker.md](0011-no-docker.md) — the presentation-layer role / thin proxy / DB and authentication in a separate repo (this ADR's parent decision)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — the ban on type leaks (the basis for converting boundary values) / the range of `model`
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `adapters` = the owning boundary of external connections and conversion / where aggregation lives
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — API client placement, fetch wrapper, the receiving point of response validation
- [0072-api-type-generation.md](0072-api-type-generation.md) — taking in the contract SSOT, generating types + zod, runtime validation
- [0080-error-handling.md](0080-error-handling.md) — normalizing backend errors (error conversion at the boundary)
