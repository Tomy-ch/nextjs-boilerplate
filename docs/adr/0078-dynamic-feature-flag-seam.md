# Dynamic Feature Flag and Progressive Delivery Seam (A-B / Progressive Rollout)

The env of [0030](0030-environment-variable-management.md) holds **immutable fail-fast** values **frozen at build / startup time**, and is structurally a poor fit for **dynamic flag values meant to change without a redeploy**. This ADR makes explicit **dynamic feature flags / A-B testing / progressive rollout**, which that env model does not handle, as **a service not bundled (exclusion) + a named extension point (seam)**. The physical "home" of flag supply is owned by [0031](0031-policy-state-supply.md) (source adapter + no-op default + stateless props), and the source of dynamic values by [0071](0071-bff-api-integration.md) (the runtime config escape hatch), so this ADR **wires them without re-deciding them**, and settles only **(a) the default place of evaluation**, **(b) the source of dynamic flag values and resolving its tension with the env of [0030](0030-environment-variable-management.md)**, and **a conservative default for the interaction with the RSC cache**.

## Status

Accepted

## Context

**Env ([0030](0030-environment-variable-management.md); fixed at build / startup time; immutable fail-fast) is a poor fit for dynamic flag values.** Dynamic feature flags / A-B / progressive rollout are "a runtime concern outside the env default model of [0030](0030-environment-variable-management.md)", and adding them later without a seam does not fit the dependency matrix of [0021](0021-frontend-responsibility.md) (progressive rollout is a cross-cutting concern touching RSC, the cache and the proxy alike).

The **physical placement** of this seam is already settled:

- **Flag supply** is already settled by [0031](0031-policy-state-supply.md) as the three-way split of **source adapter (reads raw values) + no-op default + stateless props**. **The source of dynamic flag values (the runtime config escape hatch)** is owned by [0071](0071-bff-api-integration.md) (**the decision itself to make the server the default place of evaluation is made by §1 of this ADR**; the division of labour is that 0071 settles "where values come from" and this ADR settles "where they are evaluated").

This ADR therefore **sets up neither a new kernel nor a new home**. Having wired the existing home, it settles the two points still open — **the default place of evaluation**, and **the relationship between the source of dynamic flag values and the env of [0030](0030-environment-variable-management.md)** — as a matter of principle from the design philosophy ([0010](0010-standards-and-non-lockin.md): standards conformance, no lock-in).

**Bidirectional / streaming communication (WebSocket / SSE)**, which is likewise "a runtime seam outside the round-trip model", has a different subject, so it is owned by [0074](0074-runtime-communication-seam.md) and not included in this ADR.

## Decision

### The flag / A-B / progressive rollout service itself is not bundled (exclusion)

SaaS (LaunchDarkly / Statsig / Unleash / GrowthBook, etc.) is not embedded in this repository (the same stance as [0031](0031-policy-state-supply.md)). The supply policy (raw value read + no-op default + stateless props supply) is already settled by [0031](0031-policy-state-supply.md), and this ADR **does not re-decide it**. Only the following two points are settled.

### 1. Default place of evaluation = server (with vendor-independent grounds)

Flag evaluation is done by default on **the server side (RSC / route handler / Server Action)** (**the decision to make server evaluation the default is made by this ADR**; it is wired to the runtime config escape hatch of [0071](0071-bff-api-integration.md) (the source of dynamic values)). Independent grounds:

- (1) Flag decision logic and SaaS SDKs can be **excluded from the client bundle** (bundle size).
- (2) **Flag flicker / CLS** caused by client evaluation **can be avoided** (layout stability).

Both are platform-neutral web performance grounds, not "framework recommendations" (the vendor-independent justification of [0010](0010-standards-and-non-lockin.md)).

### 2. Sorting out the relationship between the source of dynamic flag values and the env of [0030](0030-environment-variable-management.md) (resolving the tension)

"Putting flag values in env" collides with [0030](0030-environment-variable-management.md) (env = frozen at build / startup time; immutable fail-fast). This ADR **resolves it by branching, without a collision**:

- **Flags fixed per redeploy** (a per-deploy kill switch, etc.) = **may be held in the env / purpose-scoped config of [0030](0030-environment-variable-management.md)** (freezing is the correct behaviour).
- **Dynamic flags meant to change without a redeploy** = not put in env. Following the surrounding rule of [0030](0030-environment-variable-management.md), "values meant to change without a redeploy **escape to the BFF runtime config**" (quoted in the Notes of [0071](0071-bff-api-integration.md)), they are **read at request time from a source adapter (cookie / BFF runtime config / external service)** (the source adapter of [0031](0031-policy-state-supply.md)).

This makes [0030](0030-environment-variable-management.md) and this ADR **complementary**, with no contradiction (env for static flags, runtime config / source adapter for dynamic flags). The concrete source (cookie, BFF runtime config or external) depends on the use case and is owned by [0031](0031-policy-state-supply.md) / the implementation side.

### 3. Interaction with the RSC cache (conservative stance)

Flag evaluation results that vary by user / cohort are **not baked by mistake** into the cache / static PPR output. Content that branches on a flag is by default **treated as dynamic (uncached), or the cohort is included in the cache key**. Cache Components is enabled ([0041](0041-cache-components-decision.md)), and the dividing line between the static shell and dynamic holes is decided by the shape of the layout shell, so content that branches on a flag is resolved inside a dynamic hole. **The concrete design of flag evaluation × cache key depends on the use case**, so this ADR defines only the conservative default above and **leaves the specifics to the implementation**.

## Prohibitions

- ❌ Bundling the flag / A-B / progressive rollout service itself (exclusion; ride on the supply seam of [0031](0031-policy-state-supply.md)) (Enforcement: none — a decision not to adopt. Flag / A-B / progressive rollout SaaS would appear in the `package.json` diff as an added dependency, and not bundling it is itself the state)
- ❌ **Putting dynamic flag values through the env / purpose-scoped config of [0030](0030-environment-variable-management.md)** (env is frozen; dynamic values escape to the runtime config / source adapter) (Enforcement: Prose — **not mechanizable**. Whether a flag is a value meant to change without a redeploy is decided by operational intent, not by the shape of the code)
- ❌ Putting flag evaluation logic / SaaS SDKs in the client bundle by default (evaluation default = server; avoids flicker / CLS and keeps them out of the bundle) (Enforcement: Prose — **partly mechanizable**. Pulling a SaaS SDK from the client could be rejected with `no-restricted-imports`, but no rule exists. Whether an evaluation decision was written on the client is decided by the meaning of the decision)
- ❌ Baking user / cohort-dependent flag evaluation results into the cache / static PPR output (treat as dynamic, or include the cohort in the cache key)

## Notes

- This ADR conservatively defines only the guideline of **evaluation place = server default + dynamic values = escape to runtime config / source adapter + avoiding baking into the cache**, and leaves the concrete mechanisms (choice of source, cache key design) to the implementation side.
- Under the taxonomy of [0140](0140-documentation-operations.md), this ADR belongs to the **exclusion (+ extension point)** classification. It follows the type that writes the exclusion itself (the not-bundled declaration) alongside the named seam (the extension point).

## Related ADRs

- [0074-runtime-communication-seam.md](0074-runtime-communication-seam.md) — bidirectional / streaming communication seam (a separate subject that likewise belongs to "runtime seams outside the round-trip model")
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — flag supply (source adapter + no-op + stateless props; this ADR wires it without re-deciding)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the runtime config escape hatch for dynamic flag values (the source of values; where the server evaluation of §1 of this ADR is wired; the default place of evaluation is settled by this ADR)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — env = fixed at build / startup time (the home of static flags); the boundary at which dynamic flags escape to runtime config
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — Cache Components enabled (what the flag evaluation × cache key interaction depends on)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — vendor-independent justification for no lock-in (the independent grounds for the server evaluation default)
- [0131-cookie-consent.md](0131-cookie-consent.md) — policy state riding on the same supply seam of [0031](0031-policy-state-supply.md) (consent; the mechanism is bundled in the core)
