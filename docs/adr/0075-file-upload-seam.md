# Receiving and Delivering Files (Receiving Endpoint Is a Server Action, Delivery Is a Public Origin)

Defines the endpoint that receives files, which arises next to the thin proxy boundary (`/api/*`) of [0070](0070-backend-role-separation.md), and the path that shows what was received. The neighbouring payment UI seam is owned by [0076](0076-payment-ui-seam.md), and the BFF abuse-protection boundary by [0077](0077-bff-abuse-protection-boundary.md).

## Status

Accepted

## Context

[0070](0070-backend-role-separation.md) limits `/api/*` to a **thin proxy**, and the fetch wrapper of [0071](0071-bff-api-integration.md) is built on the assumption of JSON. Files ride on neither of them naturally, so the receiving endpoint and the delivery have to be decided separately.

There are two things to decide: **who receives the body**, and **where what was received is delivered from**.

## Decision

### The receiving endpoint is a Server Action, and the body is sent as is to the backend's receiving endpoint

Files are received by a **Server Action**; no relay-only endpoint is created under `/api/*`. The presentation layer's server does not hold the body: `adapters/server` sends it to the backend's receiving endpoint as `multipart/form-data` and **receives only the storage key**.

The reason for not having two endpoints is that a Server Action already has the role of "receiving a submission from a screen and calling `adapters`". Creating an endpoint with the same role on the Route Handler side too would mean keeping limits and checks aligned in two places.

**The receiving endpoint always has a size limit and a check of the declared type.** There is no layer that constrains what is sent with a signature, so this is the only checkpoint. **The declared type is a value the sender can set**, so the content is not trusted on that basis alone. The limit is placed **inside the deployment target's body limit** — placed outside, the deployment target cuts the request off first and the limit has no effect.

> Enforcement: the receiving endpoint's limit is drawn from startup configuration, and the framework's body limit is derived from the same value. The number is not written in two places.

### Delivery is from a public origin, and the presentation layer does not know the origin

**This core handles only what is public at the time of delivery.** The backend returns a storage key, and `adapters/server` assembles it into a public URL by combining it with the delivery origin from startup configuration. Screen layers cannot read the delivery origin ([0021](0021-frontend-responsibility.md) / `architecture.ts`).

As a consequence of this premise, **anything whose audience varies per principal must not be put on this path.** What is placed on a public origin reaches anyone who knows the URL. For what needs a restricted audience, have the backend side own an endpoint that can restrict it.

### Direct upload to a signed URL is not adopted

The shape where the browser sends directly to a signed URL is **not adopted**. Issuing signatures is the backend's responsibility, and this core does not assume an issuing endpoint exists. In addition, as long as delivery is public, **there is no surface for the signature to protect in the first place**.

For the same reason, progress / abort / resume mechanisms are **not bundled** either. They depend on the use case, and when adopted they are placed together with their implementation as a seam in `adapters/client`. What this ADR owns is only their coordinates.

## Prohibitions

- ❌ Creating a relay endpoint under `/api/*` that receives file bodies (the receiving endpoint is a Server Action; do not have two endpoints with the same role) (Enforcement: Prose — **mechanizable** (receiving a body via `formData()` in `src/app/**/route.ts` could be rejected with `no-restricted-syntax`; no rule exists))
- ❌ Not placing a size limit or a type check on the receiving endpoint (there is no layer constraining it with a signature, so this is the only checkpoint) (Enforcement: Prose — **not mechanizable**. Which action receives files is decided by the meaning of the received value and is visible only in per-endpoint tests)
- ❌ Trusting content on the basis of the declared type alone (the sender can set it freely) (Enforcement: Prose — **not mechanizable**. Which layer owns judging the content is a judgment of the path's responsibility and is not determined by the shape of the code)
- ❌ Placing the receiving endpoint's limit outside the deployment target's body limit (the deployment target cuts off first)
- ❌ Raising the Server Action limit without confirming that it extends to other actions (Enforcement: Prose — **not mechanizable**. Whether its reach to other actions was confirmed is a procedure at change time and does not appear in the code)
- ❌ **Putting something that needs a restricted audience on the public delivery origin** (Enforcement: Prose — **not mechanizable**. Whether the audience needs restricting is decided by the meaning of the content, not by the shape of the code)
- ❌ Reading the delivery origin from screen layers (assembly is `adapters/server`; [0021](0021-frontend-responsibility.md))
- ❌ Scattering raw fetches for submission or progress management across components ([0024](0024-adapters-server-client-split.md)) (Enforcement: Prose — **partly mechanizable**. Constructing a raw `fetch` / `XMLHttpRequest` in a component could be rejected with `no-restricted-syntax`, but no rule exists. Whether something holds progress management is decided by the meaning of the state)

## Notes

The conventions enforced day to day (the concrete limit values, implementation conventions for the receiving endpoint) are owned by [docs/rules.md](../rules.md).

## Related ADRs

- [0070-backend-role-separation.md](0070-backend-role-separation.md) — the boundary limiting `/api/*` to a thin proxy
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the fetch wrapper assumes JSON
- [0076-payment-ui-seam.md](0076-payment-ui-seam.md) — payment UI seam; a separate subject next to the thin proxy boundary
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md) — BFF abuse protection; likewise a neighbouring separate subject
- [0112-data-classification-cache-boundary.md](0112-data-classification-cache-boundary.md) — placement and checkpoints per classification
