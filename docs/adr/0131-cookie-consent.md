# Cookie Consent (Lightweight Consent Mechanism + Script Gate)

This repository bundles a **lightweight mechanism** for cookie consent (holding consent state, a banner UI, and a gate on loading third-party scripts) and a tag manager placed behind the gate. A full consent management platform (CMP / IAB TCF) is not bundled.

## Status

Accepted (partial exclusion)

## Context

Consent management **depends heavily on the target jurisdictions (GDPR / ePrivacy / CCPA, etc.), whether tracking / analytics are used at all, and the choice of SaaS**, so deciding a CMP-level implementation uniformly in the core would narrow the legal requirements.

On the other hand, **consent is the mechanism that gates loading third-party scripts**, and it cuts at once into the layout structure ([0026](0026-layout-shell-mount.md)), the CSP `script-src` ([0111](0111-csp-security-headers.md)) and the strategy of `next/script`. Inserting these three later means rewriting a wide area, so it is structurally cheaper to **have the mechanism from the start**. In addition, the seam that supplies consent state is already defined by [0031](0031-policy-state-supply.md).

## Decision

### 1. Bundle a lightweight consent mechanism in the core

What is bundled is limited to the following four points.

- **Holding and reading consent state** — held in a cookie, and supplied to the tree following [0031](0031-policy-state-supply.md) (source adapter + no-op by default + stateless props by default). Cookie operations live on the `proxy.ts` side of [0043](0043-middleware-policy.md)
- **Consent banner UI** — a minimal banner placed in `components`. The default categories are two values, "needed to display the screen / the screen works without it"; finer categories are use-case dependent (finer categories are decided by the products connected and the jurisdiction, so they are not decided ahead while nothing is connected). **The two actions, accept and reject, are laid out at the same size** — making only reject smaller or less prominent means the consent obtained was not freely given
- **Script-loading gate** — third-party scripts are not loaded until consent is obtained. The mount of `next/script` sits behind the gate predicate
- **Issuing the measurement cookie_id** — issued after consent. It is not issued while consent is absent
- **Consent is retained for 180 days (6 months)** — matching the period EU supervisory authorities give as a guideline for how long consent remains valid. It is not indefinite so that screens do not keep running on an old choice after both the connected products and the wording have changed; once it expires, the user is asked again
- **The version of the wording that was asked is stored in the cookie together with the choice, and a different version from the current one is treated as not chosen.** With expiry alone, rewriting the wording leaves the choice made against the old wording in effect — what was consented to changes but the consent remains. Attaching the version lets everyone be asked again the moment the wording is rewritten. The condition is that **whoever rewrites the wording bumps the version**; forgetting to bump it leaves consent in effect for users who have not seen the new wording
- **Consent state is read on the browser side.** Consent applies to every screen, so the only place to read it is the root layout, and reading the cookie there on the server side would make that read a dynamic hole common to every screen, dropping even screens that are delivered fully static into ones with a hole ([0041](0041-cache-components-decision.md)). The way screens unrelated to consent are delivered is not changed just for the consent surface. As a consequence, **the surface appears only after the browser has finished reading**. `proxy.ts` reads the same cookie on the server side, but even with two readers, the spelling and interpretation are owned by one place (`model`)

### 2. Bundle GTM behind the gate

**The tag manager (GTM) itself is bundled and placed behind the consent gate.** Having only the mechanism with nothing behind it would leave the core unable to confirm that the gate actually stops anything, and whoever connects first would have to get CSP, COEP, the `next/script` strategy and the wiring to consent right all at once. Bundling the connected state means the core takes on those four points.

The consequences accepted by bundling it are stated explicitly. **None of them is "not chosen yet"; each is the result of a choice.**

- **The browser talks to Google directly.** This is an **explicit exception** to the [0082](0082-client-observability.md) prohibition "do not send directly from the browser to a SaaS" = the BFF relay seam. A tag manager is a mechanism that injects each vendor's tags and lets them talk directly, so routing it through the relay is impossible in principle. **This path therefore gets none of the relay's redaction** ([0081](0081-observability-logging.md)). What is placed behind the gate is exactly what leaves the site
- **The delivery headers are loosened.** Google's origins are added to `script-src` / `connect-src` / `img-src`, and `Cross-Origin-Embedder-Policy` is dropped ([0111](0111-csp-security-headers.md))
- **The dependency on Google is inherited.** Removing it takes only emptying the container ID, and the core guarantees the screens still work in that state. The loader is loaded dynamically, and **the library is not put in the initial JS of a deployment that has removed it**
- **The CSP allowance cannot be narrowed to your own property.** The sources added to `connect-src` / `img-src` can only be written per origin, and which measurement property they target cannot be expressed. So **if an injection hole ever appears somewhere, a path to exfiltrate data disguised as legitimate measurement is already open**. Loosening the headers means accepting this
- **Edit rights to the container are the same as the right to run arbitrary code on this origin**. Tags placed in the container run on this site and can read cookies and the DOM. **Access control on the same level as deployment credentials** (least privilege, change history, multi-factor) is required of operations

**What is taken on is the design, not a CI check.** The four points listed at the start exist as code in the core, and unit tests pin both the header assembly and the loading strategy. However, **CI does not confirm that the assembled headers actually take effect as declared in a real browser** — the bundled e2e / DAST run on a deployment with an empty container ID, which is done so that nothing actually talks to the outside (recorded with its removal condition in `e2e/README.md`「タグマネージャを読み込む側は、ここでは通らない」).

**The tag manager's `<noscript>` is not placed.** The vendor's installation steps have you paste the `<script>` and a `<noscript>` iframe as a pair, but the latter **structurally cannot be put behind the gate** — the gate is a client island, so for visitors with JS disabled the asking surface is not rendered and there is no way to give consent. Placing it there would **fire unconditionally only for visitors who cannot consent**, which falls under the first prohibition of this ADR. It would also require the judgment to open `frame-src` ([0111](0111-csp-security-headers.md)). All it gains is server-side tags for visitors with JS disabled, which is not worth it.

**Full consent management such as a CMP or IAB TCF is not bundled**. It depends strongly on jurisdiction and vendor, and deciding it here would narrow the choice. Adopting one means replacing this mechanism (the consumers of the gate predicate do not change). **The reversal condition is when the core settles on a single target jurisdiction. "GDPR compliance is needed" is not the condition** — a shape that can be replaced without changing the consumers of the gate predicate already exists, and whether to replace it is judged once the jurisdiction and requirements are decided.

Using an external library likewise stays within the bounds of [0004](0004-library-management.md) (exact pin / `pnpm audit`) and [0021](0021-frontend-responsibility.md) (kernel placement, naming discipline).

### 3. What the consent gate covers

- **What is gated is user-behavior tracking**. The operational telemetry of [0081](0081-observability-logging.md) (errors / performance) is distinguished from what requires consent
- However, **a jurisdiction may require consent for operational telemetry such as field RUM**, so the gate predicate is shaped so the operational-telemetry side can reuse it too ([0082](0082-client-observability.md))

## Prohibitions

- ❌ Loading third-party scripts without checking consent state (writing a `<script>` inline that bypasses the gate)
- ❌ Scattering the logic that judges consent state across features / components (the gate predicate is unified into the supply path of [0031](0031-policy-state-supply.md)) (Enforcement: Prose — **partly mechanizable**. Importing `@/model/consent`, which holds the consent spelling, from `features` / `components` can be rejected with `no-restricted-imports`, but no rule exists. Whether supplied state is being reinterpreted on the spot is decided only by reading it)
- ❌ Issuing the measurement cookie_id while consent is absent (Enforcement: `src/proxy.test.ts` (no measurement id is issued while consent is absent or rejected))
- ❌ Bringing CMP / IAB TCF-level consent management into the core (use-case dependent. §2) (Enforcement: none — a decision not to adopt. No CMP / IAB TCF is bundled, and a change adding one shows up in the diff as added dependencies and a replaced mechanism)
- ❌ Loading the tags behind the gate in a deployment that declares no container ID (§2; the condition for bundling is that the screens work with it removed) (Enforcement: `src/app/analytics.test.tsx` (renders nothing when the container ID is empty))
- ❌ Choosing the values to put behind the gate on the assumption that the relay's redaction applies (§2; this path does not go through the relay) (Enforcement: Prose — **not mechanizable**. The values put behind the gate are decided by the container's configuration and do not appear in the repository's code)

## Related ADRs

- [0031-policy-state-supply.md](0031-policy-state-supply.md) — definition of the consent supply seam (source adapter + gate predicate + stateless props)
- [0043-middleware-policy.md](0043-middleware-policy.md) — holding consent state in a cookie
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — the basis for not reading consent state on the server side (no dynamic hole in the root layout)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — where the banner / scripts are mounted
- [0111-csp-security-headers.md](0111-csp-security-headers.md) — the `script-src` allowance for third-party scripts (covers the same targets as the gate)
- [0082-client-observability.md](0082-client-observability.md) — the main consumer of the consent gate (product analytics must be gated; the jurisdiction extension point for operational telemetry)
- [0081-observability-logging.md](0081-observability-logging.md) — operational telemetry (distinguished from the user tracking the consent gate covers)
- [0023-stores-kernel.md](0023-stores-kernel.md) — where it lives if held as cross-cutting client state
- [0121-i18n-strategy.md](0121-i18n-strategy.md) / [0130-pwa-strategy.md](0130-pwa-strategy.md) — precedents for use-case-dependent exclusions (in this ADR, only CMP / IAB TCF is an exclusion)
