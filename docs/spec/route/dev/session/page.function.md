# `/dev/session` Development Session (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md). Usage:
> [`src/features/dev-session/README.md`](../../../../../src/features/dev-session/README.md).

A development page for issuing a session without going through the IdP and entering protected screens.

## When It Opens

**Both the environment and the destination host are checked.**

- The environment is `local` or `ci`. It also requires `APP_ENV` to be **set explicitly** (falling back to a default when unset would
  let a real environment that forgot the setting open this endpoint)
- The destination host (`Host` / `X-Forwarded-Host`) is a local name. A request that does not state a host is closed

For requests that do not meet the conditions, **the screen and the authorization endpoint answer not found.** It is not 403 because not
revealing existence reduces the damage when something is published with the wrong settings.

**The two submissions, issue and discard, return text giving the reason when closed.** Both can only arrive from the form of a rendered
screen, and in a closed environment the only party that can reach them is one holding a form rendered while it was open. Hiding
existence from that party is pointless, and answering not found would not convey what happened.

**The host check is not a line of defense.** `Host` is a value the requester states and can be forged. What this stops is "the path
ordinary users ordinarily take when something has been published with the wrong settings"; stopping a deliberate forger is the
environment's job.

**The check is placed at each entry point.** The screen and the Server Action are separate entry points, and the Server Action can be
called without going through the screen. Closing only one of them closes nothing.

## Not included in the production build

This route is **included only in development and CI builds**. It is doubled with the runtime check because "not left in" and "does
not open" are different guarantees. Once it is out of the build, the page itself does not exist in the artifact even if environment
variables are mixed up.

## What It Issues

What can be specified is who to enter as, the role, the seconds until expiry, and how the token sent to the API is decided.

- **The role is granted directly here.** Ordinary login pulls the role from the backend, but this endpoint exists to reach screens
  without going through either the IdP or backend registration
- **The seconds until expiry can be shortened** so that the post-expiry appearance can be reached without waiting
- **It can also be told to go and fetch one.** Given who to enter as and the IdP's connection target, it gets a token from the
  development IdP and puts it on the session. While connected to the real API, values that assume there is nothing to verify against
  are rejected, so the token that API accepts is obtained here
- **If no token is pasted, a value that assumes there is nothing to verify against is built.** That is enough while connected to the
  mock. Only when connecting to the real API is the token that API accepts pasted in

After issuing, send the user to the return destination. **The return destination is restricted to the same origin** — accepting an
external URL would make it a way to send the user to another site right after issuing.

## When opened as the authorization start point

When `AUTH_MODE=dev`, the authorization start point becomes this page instead of the IdP. It is then opened with the value that
correlates request and response in its query, and **the submission target changes to the authorization endpoint
(`/dev/session/authorize`)**. That endpoint returns to `/api/auth/callback` carrying an authorization code.

- Whether the correlating value is correct is not judged. What it is matched against is the temporary state the callback restores;
  judging it here too would split the same check into two places
- The specification is passed sealed. `code` appears where the user can edit it, so carrying the role in plain text would let anyone
  come back as an administrator
- **The seal also includes the issuer's request (`state`).** This keeps whoever obtains the code from exchanging it in a different round
  trip they started themselves (mechanism: [`src/adapters/server/auth/README.md`](../../../../../src/adapters/server/auth/README.md))
- **Put a limit on the submission body**
- **No session is set here.** Setting one would mean the callback is never hit while `AUTH_MODE=dev`, so even if the authorization round
  trip were broken, development and CI would never notice
- Failures return only the classification in the URL. A plain submission cannot carry state over, and a real IdP's authorization
  endpoint also returns only an `error` classification. Per-field reasons are held by the submission that stays on its own screen

When the correlating value is absent (opened directly), it issues on the spot and sends the user to the return destination. There is no
temporary state to match against, so returning to the callback would only make the user authenticate again.

## Discarding

It only deletes the cookie and tells the IdP nothing. This session was made without going through the IdP, so there is no one to end it
with (an ordinary logout also ends the IdP side).
