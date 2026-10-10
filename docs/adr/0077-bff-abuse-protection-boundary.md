# BFF Abuse-Protection Boundary (Infra / Edge Seam)

Makes explicit the abuse protection of `/api/*` (public endpoints, including the telemetry relay), split into **a boundary seam of the infra (PaaS / edge) domain** (rate limiting / DDoS mitigation / WAF = cut off while kept by name) and **the minimal defenses left in the core** (Route Handler body size limit, content-type validation, input validation).

## Status

Accepted

## Context

As a result of [0070](0070-backend-role-separation.md) limiting `/api/*` to a **thin proxy** and [0081](0081-observability-logging.md) making "browser → BFF relay" the telemetry seam, the core configuration gains **public endpoints that require no authentication**:

- A line is needed on whether rate limiting, body size limits and protection of unauthenticated endpoints for `/api/*` (including the telemetry relay) are held in the core or delegated to the PaaS side.
- The unprotected public endpoint produced by the relay seam of [0081](0081-observability-logging.md) cannot be left without a defense policy.

This ADR sorts abuse protection by applying the two principles of [0010](0010-standards-and-non-lockin.md) (§1 conformance to the de facto standard / §2 mandatory vendor-independent justification) and the **boundary call** (the single question "is it another domain's (infra / backend) responsibility?").

## Decision

**Boundary call = Yes (another domain)**. Rate limiting, DDoS mitigation and WAF are **the responsibility of the infra (PaaS / edge) domain**; this repository holds no implementation of them and **cuts them off, leaving a named boundary seam**.

### 1. Defenses delegated to the PaaS / edge (infra boundary seam)

Rate limiting, IP / bot filtering, DDoS mitigation and a global WAF are laid down with the edge / WAF features of Vercel / Cloudflare / AWS and the like. The core assumes them and makes them explicit as an extension point configured on the PaaS side (protection of the unprotected endpoint produced by [0081](0081-observability-logging.md) = the telemetry relay `/api/*` also rides here).

- **Vendor-independent justification ([0010](0010-standards-and-non-lockin.md))**: the structure of defending public endpoints in depth at the edge is a principle of OWASP / general web security and does not depend on any particular PaaS feature (it holds with any of Vercel / Cloudflare / AWS WAF).

### 2. Minimal defenses left in the core (defenses expressible in frontend territory)

Each Route Handler performing **body size limits, content-type validation and input validation** before forwarding falls within the pattern of the official Next.js BFF guide, "add validation before proxying", and is taken on by the Route Handler convention (the rule "Route Handlers stay thin proxies on the Node runtime" in `docs/rules.md` *Layer Boundaries and Dependencies*) as the minimal defense the core holds regardless of whether an edge exists.

The telemetry relay the core bundles (`/api/telemetry`) is its reference shape:

- A request whose content-type does not claim JSON is rejected with **415**
- A body exceeding the largest report the contract allows (about 15.7 KB) is rejected with **413**. **Reject first by the declared length, and reject a request without a declaration by the measured size after reading** — trusting only the declaration lets a request that does not state its length pass straight through
- Rate limiting and global blocking are the edge / WAF's responsibility as in §1, and are not placed in this Route Handler

### 3. Scope of the line

What this ADR settles is limited to **the skeleton of ownership** — "rate limit / DDoS / WAF = cut at the infra boundary seam" and "minimal defense of input and size validation = the core's Route Handler convention" — and the reference shape of the bundled relay (§2). Concrete values for other public endpoints (limits, accepted content-types) depend on the use case / PaaS, and are placed per Route Handler following the shape of §2.

## Prohibitions

- ❌ Implementing rate limiting / DDoS mitigation / WAF in this repository's application code (infra boundary seam = delegated to the PaaS / edge) (Enforcement: none — a decision not to adopt. Rate limiting, DDoS mitigation and WAF are edge configuration, and not having them in the application code is itself the state)
- ❌ Forwarding public `/api/*` (including the telemetry relay) with no body size limit and no content-type / input validation at all (the minimal defense the core holds) (Enforcement: `src/app/api/telemetry/route.test.ts` (rejects with 415 / 413 / 400) rejects it on the bundled relay. Other public `/api/*` are Prose — **not mechanizable**. How much checking is enough is decided by the received values and the use case)

## Notes

- **Taxonomy** ([0140](0140-documentation-operations.md)): this ADR belongs to decision (settling the ownership of abuse protection). The rule enforced day to day (the Route Handler implementation convention) is owned by "Route Handlers stay thin proxies on the Node runtime" in `docs/rules.md` *Layer Boundaries and Dependencies*, which this ADR references back to.
- **Topical relation**: this ADR (infra abuse protection) is closely related to the relay seam of the observability ADR ([0081](0081-observability-logging.md)) (because 0081 is where the unprotected endpoint to be protected originates). The relation is expressed through the index and cross-references.

## Related ADRs

- [0075-file-upload-seam.md](0075-file-upload-seam.md) — file upload seam (a neighbouring subject sorted by the same boundary call)
- [0076-payment-ui-seam.md](0076-payment-ui-seam.md) — payment UI seam (mount seam and PCI boundary; a sibling under the same boundary call)
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — `/api/*` = thin proxy (the parent decision where the unprotected endpoint originates)
- [0081-observability-logging.md](0081-observability-logging.md) — browser → BFF relay seam (where the unprotected endpoint originates; what this ADR protects)
- [0082-client-observability.md](0082-client-observability.md) — what is sent through the relay endpoint (`/api/telemetry`) (what the reference shape of §2 guards)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance + vendor-independent justification (the foundation for justifying defense in depth at the edge)
