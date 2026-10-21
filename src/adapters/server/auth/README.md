---
imports-allowed: [adapters, model, errors, logging, config] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [components, capabilities, stores, business-logic]
test-requirement: unit
---

# auth

The authentication boundary. It holds sealing and restoring the session, round trips with the IdP, and the entry point for definitive authorization.

## Differences from the Parent

The parent (`src/adapters/`) declares `integration`. That is
[0090](../../../../docs/adr/0090-testing-strategy.md)'s requirement to "target only the HTTP boundary, mock the inside, and
assert types and shapes", and **it means something only for modules that communicate externally**.

Only three modules in this compartment communicate externally.

| Communicates externally (`integration`) | Does not (`unit`) |
| --- | --- |
| `oidc-discovery.ts` / `default-session-resolver.ts` / `development-token.ts` | `pkce.ts` / `random-token.ts` / `seal-key.ts` / `session-cookie.ts` / `session.ts` / `resolver.ts` / `optimistic-session.ts` / `test-session.ts` / `test-session-record.ts` / `development-session-resolver.ts` / `development-authorization-code.ts` / `development-access.ts` |

The declaration is `unit` because that is the majority. The three above hold an HTTP boundary, so they
also satisfy the `integration` requirement. The decision is made by "does the module go outside", not by
its directory location. `development-session-resolver.ts` assembles the default Resolver, but
does not go outside itself (what `startAuthorization` returns is a surface on the same origin).

## What Belongs Here

- The session storage format, and sealing and restoring it
- Round trips with the IdP (Discovery / authorization request / token exchange), and assembling where to send the user (authorization, logout)
- The entry point for definitive authorization (`verifySession()`), and the getter for the Bearer token

## What Does Not Belong Here

- Deciding protected routes, validating `returnUrl`, and role-based authorization. These do not change when the method changes, so
  they are held outside the Resolver (`model` and `proxy.ts`) ([0079](../../../../docs/adr/0079-auth-frontend-seam.md))
- Exposing `SessionRecord`. It contains the Access Token, so only `Session` is passed inward.
  However, **the ID Token is exposed embedded in the logout destination** — RP-Initiated Logout is a procedure that
  delivers `id_token_hint` to the IdP via the user's browser, and it cannot finish without it.
  This single use is the only exposure; the Access Token is still never exposed

## Registering What Must Not Reach the Client

The record `session.ts` restores contains the Access Token and the ID Token. It is registered with
[taint](../taint/taint.ts) at the moment of restoration, so passing the record as is to a Client Component makes rendering fail.
The signing key (`AUTH_SESSION_SECRET`) is registered by `resolver.ts`, the side that reads it — `config` has
`imports-allowed: []` and cannot bring in react ([0030](../../../../docs/adr/0030-environment-variable-management.md)).

The primary safeguard is the promise that only the identity `verifySession()` returns may be passed to inner layers; registration is an aid that
catches at runtime whatever gets past it.

## Replacement Points

`SessionResolver` in `session-resolver.ts` is the only unit of replacement. When moving to an in-house method,
replace the implementation `resolver.ts` returns. The side that handles cookies touches only the sealed string, so a change of method
does not force a rewrite there.

Two are bundled.

| Implementation | When it is chosen |
| --- | --- |
| `default-session-resolver.ts` | Default. Makes round trips with a real IdP using Authorization Code + PKCE |
| `development-session-resolver.ts` | Environments where `AUTH_MODE=dev` and the development-only endpoints are open. Sends to `/dev/session` instead of the IdP |

**The development one does not narrow the surface.** It replaces only where to send and the authorization code exchange; sealing and restoring
borrow the default implementation as is. If the cookie shape changed with the method, a session made by one could not be read by the other,
and merely switching an environment variable would require signing in again.

**The selection is combined with the environment** (`resolver.ts`). Conditioning only on `AUTH_MODE` means that the moment a misconfiguration
gives a real environment `dev`, a path that enters with any role without going through the IdP opens on a public domain.

**The development authorization code is bound to the issuing request.** Sealing only the specification would let whoever holds the code
start a new round trip themselves and exchange it (consuming the temporary state stops only "reusing one's own round trip
oneself"). With a real IdP the PKCE verifier carries this role, and that property is kept on the development
path too.

## What Sits Alongside

- The authentication round-trip endpoints are [`src/app/api/auth/`](../../../app/api/auth)
- The optimistic check at the entry point is [`src/proxy.ts`](../../../proxy.ts)

## Related ADRs

The decisions this compartment's code depends on. **Comments do not point at ADRs directly; they follow this section**
([docs/rules.md](../../../../docs/rules.md#comments)). The list for the whole layer is held by the
[parent README](../../README.md).

- [0079](../../../../docs/adr/0079-auth-frontend-seam.md) — The authentication front seam. Relaying credentials without verifying the IdP, and owning the sign-in surface
- [0030](../../../../docs/adr/0030-environment-variable-management.md) — How secrets are read, and the hook that registers values that cannot be passed to the client
- [0070](../../../../docs/adr/0070-backend-role-separation.md) — Handling identity, and not taking authorization decisions away from the backend
- [0043](../../../../docs/adr/0043-middleware-policy.md) — The entry point (`proxy.ts`) can hold no more than an optimistic check
- [0021](../../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries
- [0090](../../../../docs/adr/0090-testing-strategy.md) — Per-layer verification responsibilities (the range the `integration` declaration covers)
