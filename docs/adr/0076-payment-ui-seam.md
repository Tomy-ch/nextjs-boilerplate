# Payment UI Seam (Mount Seam and PCI Boundary)

With payments (Stripe Elements / PayPal / Adyen, etc.) declared **not bundled in the core (exclusion)**, this ADR makes explicit, separately, the **frontend-territory mount seam** that a payment integration rides on when adopted (the SDK's DOM mount point + the client_secret handoff endpoint) and the **PCI boundary seam of another domain (backend / PSP)** (the frontend never holds raw card data = equivalent to PCI SAQ-A).

## Status

Accepted

## Context

[0070](0070-backend-role-separation.md) limits `/api/*` to a **thin proxy**, and the fetch wrapper of [0071](0071-bff-api-integration.md) assumes a JSON API, so the payment UI rides on neither:

- An **exclusion declaration** that the payment SDK (Stripe Elements / PayPal Buttons / Adyen Drop-in, etc.) is not bundled in the core is needed (held in explicit prose, like i18n / PWA / consent).
- Unless the seam for adoption (external script policy, what PCI allows on the frontend, whether a BFF relay is needed) is defined, the SDK gets built directly into features.

Payments split into two domains of different nature (the frontend UI mount surface / the backend and PSP PCI-compliance surface). This ADR sorts each surface through the two principles of [0010](0010-standards-and-non-lockin.md) (§1 conformance to the de facto standard / §2 mandatory vendor-independent justification) and the **boundary call** (the single question "is it another domain's (infra / backend) responsibility?").

## Decision

Payments split into two domains. The **boundary call** is applied to each surface.

### 1. Frontend territory = the payment SDK's UI mount seam

The payment SDK (Stripe Elements / PayPal Buttons / Adyen Drop-in, etc.) is **not bundled in the core (exclusion)**, and only the **mount seam** it rides on when adopted (the DOM mount point where the SDK inserts an iframe / redirect + the handoff endpoint for client_secret and the like) is laid down by name. **The default is a configuration that moves the payment screen over to the PSP (redirect) or operates via the backend / BFF**, and the core's delivery headers are closed on that premise — adopting an SDK that inserts an iframe comes with the decision to open `Cross-Origin-Embedder-Policy` and `payment` in `Permissions-Policy` of [0111](0111-csp-security-headers.md).

- Loading external scripts is tied to [0131](0131-cookie-consent.md) (consent gate) and CSP ([0111](0111-csp-security-headers.md)). The payment SDK's `<script>` is loaded only under consent / CSP permission (consistent with the third-party script convention = "third-party scripts sit behind the consent gate" in `docs/rules.md` *Security Controls*).

### 2. Another domain (backend / PSP) = cut at the PCI boundary seam

Payment processing, amount finalization, idempotency and the **PCI-DSS compliance scope** are the responsibility of the backend / PSP. The frontend stays in a configuration that **never touches raw card data** (the SDK isolates card data in an iframe / redirect, and frontend JS does not hold the card number or CVC = equivalent to PCI SAQ-A). Creating a PaymentIntent and the like is the backend's job; the frontend only receives the client_secret / token (the receiving endpoint is `adapters/server`).

- **Vendor-independent justification ([0010](0010-standards-and-non-lockin.md))**: the structure of "isolating card data from frontend JS" is a standard defined by the PCI SSC (SAQ-A / iframe isolation) and does not depend on any particular PSP (Stripe / PayPal / Adyen) ("the frontend does not hold raw card data" remains valid with the PSP removed). What this repository fixes is only the shape of the mount seam; the PSP and implementation details depend on the use case (same shape as authentication being out of scope in [0070](0070-backend-role-separation.md)).

## Prohibitions

- ❌ Bundling a payment SDK in this repository / building a particular PSP into the core's assumptions (mount seam only; SDK and PSP depend on the use case) (Enforcement: none — a decision not to adopt. A payment SDK and PSP would appear in the `package.json` diff as an added dependency, and not bundling them is itself the state)
- ❌ A configuration where frontend JS holds or sends raw card data (card number / CVC) (breaks the SDK's iframe / redirect isolation = equivalent to PCI SAQ-A) (Enforcement: Prose — **partly mechanizable**. Placing card number / CVC input fields (`autocomplete="cc-number"` / `cc-csc`) on a screen could be detected in JSX, but no rule exists. Whether a value is card data is decided by meaning, not by the shape of the field)
- ❌ Loading the payment SDK's external script outside the consent / CSP gate ([0131](0131-cookie-consent.md) / [0111](0111-csp-security-headers.md))

## Notes

- **Taxonomy** ([0140](0140-documentation-operations.md)): this ADR belongs to exclusion (payment SDK not bundled). The rule enforced day to day (the third-party script convention) is owned by "third-party scripts sit behind the consent gate" in `docs/rules.md` *Security Controls*, which this ADR references back to.

## Related ADRs

- [0075-file-upload-seam.md](0075-file-upload-seam.md) — file upload seam (a neighbouring subject sorted by the same boundary call)
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md) — BFF abuse protection (an infra boundary seam; a sibling under the same boundary call)
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — `/api/*` = thin proxy / contract SSOT (the parent decision that payment processing and PCI compliance are backend responsibilities)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — fetch wrapper (JSON assumption) / resilience of `adapters` (the foundation of the client_secret receiving endpoint)
- [0131-cookie-consent.md](0131-cookie-consent.md) — consent gate (the loading condition for the payment SDK's external script)
- [0111-csp-security-headers.md](0111-csp-security-headers.md) — CSP / `Cross-Origin-Embedder-Policy` / `Permissions-Policy` (what is opened when adopting an SDK that inserts an iframe)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance + vendor-independent justification (the foundation for justifying PCI SAQ-A)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — the server / client split of `adapters` (receiving the client_secret / token = server side)
