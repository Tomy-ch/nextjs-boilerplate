# Supply Policy for Policy State (consent / feature-flag)

[0022](0022-capabilities-kernel.md) states that "policy state (consent / feature-flag) is not placed in `capabilities`; each seam owns it", but its supply points — the `useConsent()` equivalent (consumed by the consent gate for third-party scripts and by analytics consent gating) and the `useFlag()` equivalent — sit in neither `capabilities` (runtime only), `components` (pure UI), `model` (display logic), nor a `feature` (single; `features↔features` forbidden).

This ADR defines this supply **by composing existing kernels, without standing up a new kernel** (built on the adapters/client of [0024](0024-adapters-server-client-split.md)).

## Status

Accepted

## Context

Server-side supply alone (the adapters of [0071](0071-bff-api-integration.md)) leaves the client-supply half. Making it a feature such as `features/consent` does not work: with `features↔features` forbidden ([0021](0021-frontend-responsibility.md)), other features cannot reference it. Because [0024](0024-adapters-server-client-split.md) gives adapters a client side, this ADR's resolution holds.

## Decision: Split into Three and Place in Existing Kernels (No New Kernel)

Consent / flag supply is split into three parts, each placed in an existing home:

| Part | Home | Contents |
| --- | --- | --- |
| **① Reading the raw value** | `adapters` source boundary | Server uses `cookies()` (route-segment / route-handler of [0025](0025-app-layer-elements.md)) / client raw uses `capabilities` ([0022](0022-capabilities-kernel.md)). **Only for reactive cross-cutting cases does ③'s `stores` read it itself** ("How the home is decided" below) |
| **② Semantics + no-op default** | Co-located in the `adapters` source adapter | **The seam deliverable** = the consent default "gate everything without consent" (consumed by the consent gate and analytics consent gating) / the flag default. Gate predicates are pure functions. **When the startup / build boundary also consumes it, `model`** (below) |
| **③ Supply to the tree** | Default = **stateless** (RSC reads and hands out via props) | Faithful to [0060](0060-state-management.md) (Server state = RSC fetch by default). Cross-cutting cases that need reactivity (immediate reflection of consent-banner actions, etc.) are placed in `stores` ([0023](0023-stores-kernel.md) / Zustand) as cross-cutting client state (when a form that needs a Provider is taken, the mount is [0026](0026-layout-shell-mount.md); a store is a module singleton that needs no Provider) |

### How the home is decided (the dependency matrix decides first)

The table above is the default; **for combinations the dependency matrix in `architecture.ts` does not allow, the following forms take precedence over the default**. The matrix is the enforced side, so if the table disagrees with it, no implementation could follow the table.

- **When ① moves to `stores`**: when the value is both "**needed synchronously before the first render**" and "**reactive**". `stores` cannot import `capabilities` (`stores → model / errors / config`), and what `capabilities` exposes is hooks, which cannot be called from a Zustand initializer. A value meeting both conditions is held by `stores` together with its raw reads and writes (consent is such a value)
- **When ② moves to `model`**: when the **startup / build boundary** (`proxy.ts`, etc.) also consumes the same predicate. Those cannot import `adapters` (`proxy → model / config / errors`), so placing it in `adapters` makes it unreachable from the place where [0131](0131-cookie-consent.md) says cookie operations go. To keep the decision and its spelling in one place, `model` is the only intersection (the same shape as `model/session.ts` / `model/authz.ts`)
- A value meeting neither condition is placed in `adapters` / `capabilities`, per the table's default

This fixes the **physical form of [0022](0022-capabilities-kernel.md)'s "the seam owns it" = `adapters` source adapter + no-op default + stateless props (`stores` only for reactive cross-cutting cases)**. For consent, [0131](0131-cookie-consent.md) **bundles a lightweight mechanism + a script gate + a tag manager behind the gate in the core** (the CMP itself is not bundled; the measurement product itself is chosen as the contents of a container — what is bundled beyond the gate is only the container called a tag manager), and the flag library itself is not bundled ([0078](0078-dynamic-feature-flag-seam.md)). This ADR defines **that supply policy (the seam)**. The gate predicates of 0131 ride on this supply path.

## Prohibitions

- ❌ Holding policy state in a client store **by default** (the default is stateless props = RSC reads and hands out via props; [0060](0060-state-management.md)). Only for reactive cross-cutting cases (immediate reflection of consent-banner actions, etc.) may `stores` ([0023](0023-stores-kernel.md) / Zustand) be used (Enforcement: Prose — **not mechanizable**. Whether something is a reactive cross-cutting case is a judgment about requirements, not decided by the shape of the store)
- ❌ Demanding of the implementation a placement the dependency matrix does not allow, on the grounds of the table's default ("How the home is decided": when the table and the matrix disagree, the matrix wins and the table is fixed)
- ❌ Writing consent / flag value retrieval directly in each feature / component (aggregate it in a source adapter) (Enforcement: Prose — **partly mechanizable**. A form that rejects reads of `document.cookie` and imports of `cookies` from `next/headers` in `features` / `components` can be written, but no rule exists. The origin of flags is use-case dependent, so the shape of retrieval is not fixed)
- ❌ Placing policy state in `capabilities` (limited to runtime capabilities; [0022](0022-capabilities-kernel.md)) (Enforcement: Prose — **not mechanizable**. Whether a value is policy state or a runtime capability is decided by meaning, not by the shape of the hook)

## Notes

- This ADR defines the **policy** of supply. The concrete implementation of flags (which source, what gate granularity) is use-case dependent, and the core provides only the supply path and the gate predicates. **Consent is not such a case** — [0131](0131-cookie-consent.md) makes the lightweight mechanism itself (retention, banner, gate, issuing the measurement id) part of the core bundle, so it is not something for which only a supply path is placed

## Related ADRs

- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — adapters/server and adapters/client (the foundation of the source adapter)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — where policy state was evicted from (the home of client raw reads)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `features↔features` forbidden (why making it a feature does not work)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the destination of server-side supply (adapters; where runtime config escapes to)
- [0131-cookie-consent.md](0131-cookie-consent.md) — the lightweight consent mechanism + script gate (this ADR is the seam that supplies its state)
- [0078-dynamic-feature-flag-seam.md](0078-dynamic-feature-flag-seam.md) — the dynamic feature flag seam (wired on top of this ADR's physical supply)
- [0082-client-observability.md](0082-client-observability.md) — the main consumer of the consent gate (product analytics is gated by this ADR's gate predicates)
- [0060-state-management.md](0060-state-management.md) — the basis for the stateless-supply default
- [0023-stores-kernel.md](0023-stores-kernel.md) — where reactive cross-cutting consent / flag state lives (Zustand)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — the mount when reactive supply takes a form that needs a Provider
