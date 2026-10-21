---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # the other feature's facade/ and whole-screen stories are the exception
test-requirement: [feature, component, unit]
---

# auth

The login screen slice. It holds only the path that "starts authentication".

## What Belongs Here

- The operation that starts authentication, and presenting why the user got here (rejected while unauthenticated, right after logging out, sent back without being able to start)
- Explaining that no account is created on this screen. It states only what is true whichever IdP is connected, with no names or per-environment guidance
- Handing over where to return after authentication

## What Does Not Belong Here

- Authentication itself (the round trip with the IdP, token exchange, session creation). All of it is held by the
  `/api/auth/*` Route Handlers and `adapters/server/auth`
- Email and password input fields. **In this setup** the IdP's screen receives the credentials, so they never pass through this screen. [0079](../../../docs/adr/0079-auth-frontend-seam.md) decides to **place the input surface on the owning screen**, and this slice has not reached that point yet
- Reading the session (the screen does not know whether the user is authenticated; `verifySession()` and `proxy.ts` judge that)

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `/login` | [`screen`](../../../docs/spec/route/auth/login/page.screen.md) / [`function`](../../../docs/spec/route/auth/login/page.function.md) | Not required (this is the entry point) |

The outer frame's promises are held by [the `auth` layout](../../../docs/spec/route/auth/layout.screen.md).

**No operationId is used.** This screen calls only the same-origin `/api/auth/login`, and the Route Handler is
what talks to the IdP. The screen does not change whichever IdP is connected because the contract is not
brought in here.

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Login | Arrived directly | `Features/Auth/LoginView/Default` |
| | Rejected at a protected route (with a return destination) | `Features/Auth/LoginView/WithReturnUrl` |
| | Could not start authentication | `Features/Auth/LoginView/Unavailable` |

It has none of loading / empty / error. **That is because there is no fetching** — the screen appears after the
case is settled, and there is nothing to wait for and nothing to be empty.

## Structure

There is only one screen, so files sit directly under the slice without a screen directory.

| Module | Role |
| --- | --- |
| `login-view.tsx` | The login screen. The form that starts authentication, and the guidance when it could not start |
| `read-login-notice.ts` | Reads the reason to show from the URL (the reading side) |
| `facade/paths.ts` | The destination for this screen, for other features to point at |
| `facade/login-notice.ts` | The guidance vocabulary and the destination when authentication could not start (the building side). **The Route Handler builds the destination** (`app/api/auth/login`), and a Route Handler can draw only on a feature's `facade/` |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `model` | The safe shape of the return destination (`return-url`), and the vocabulary of guidance reasons |
| `components` | The containers screens are built from (cards, buttons, guidance) |
| `observability` | Putting rendering on spans |

**It does not draw on `adapters`.** It holds no authentication round trip, and that is this slice's line itself.

## Action Return Contract

None. Starting authentication is not a Server Action but a plain form submission to `/api/auth/login`.
**A Server Action's `redirect()` cannot navigate to a Route Handler** — the client router swallows it, and only
the URL is rewritten without a request going out.

## Test Perspectives

- [ ] The return destination is normalized to a safe shape before it is put on the form (an external URL does not pass through)
- [ ] The wording changes per guidance reason, and nothing appears when there is no reason
- [ ] No credential input fields appear on the screen

## What Sits Alongside

- Protected-route checks and the redirect when unauthenticated are in [`src/proxy.ts`](../../proxy.ts)
- The authentication round trip is in [`src/app/api/auth/`](../../app/api/auth)
- Definitive authorization is in [`adapters/server/auth`](../../adapters/server/auth)

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. What is lent to other features goes out through `facade/`
- [0025](../../../docs/adr/0025-app-layer-elements.md) — The elements of the app layer. A Route Handler may draw only as far as a feature's `facade/`
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical layout and co-location. With one screen, no screen directory in between
- [0043](../../../docs/adr/0043-middleware-policy.md) — The role of the entry point (proxy). It holds protected-route checks and where unauthenticated users are sent
- [0079](../../../docs/adr/0079-auth-frontend-seam.md) — The frontend seam of authentication. Holds no credentials and hands the IdP round trip to the Route Handler
