---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features]
test-requirement: [feature, component, unit]
---

# dev-session

A development screen that issues a session without going through the IdP, to enter protected screens.

## What Belongs Here

- Input and validation of the session to issue (as whom / role / seconds until expiry / whether to fetch a token / its connection target / an Access Token to paste)
- Displaying the session currently held, and how the operation that discards it looks
- When opened in the middle of an authorization round trip, switching the submission target to the authorization endpoint and carrying the correlating values
- The vocabulary and reading of the reasons the authorization endpoint returned, and their wording

## What Does Not Belong Here

- Sealing and restoring the session (the domain of `adapters/server/auth`; only the app layer may touch it)
- Judging the environments where the endpoint may be opened (held by `config`, applied by the route and the Server Action)
- Round trips with a real IdP (this screen exists precisely to avoid them)
- Judging whether the correlating values are correct (they are matched against the temporary state `/api/auth/callback` restores)

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `/dev/session` | [`screen`](../../../docs/spec/route/dev/session/page.screen.md) / [`function`](../../../docs/spec/route/dev/session/page.function.md) | Not required (the judgment of which environments may open it applies instead) |

`/dev/session/authorize` is a Route Handler the same screen chooses as its submission target, not a screen.

**No operationId is used.** The screen draws on no backend contract at all. The path that fetches a token is also
an endpoint on the IdP side and does not appear in `openapi/api.gen.yaml`.

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Development session | No session held | `Page/DevSession/WithoutSession` |
| | Session held | `Page/DevSession/WithSession` |

It has none of loading / empty / error. **That is because there is no fetching** — the screen reads only the
current session restored from the cookie, and failures arrive as operation return values typed in
`form-state.ts`.

## Structure

| File | Role |
| --- | --- |
| `paths.ts` | This screen's route and the authorization endpoint, and the names for handing over the return destination and the correlating values |
| `authorize-error.ts` | The vocabulary of reasons authorization could not succeed, and building the destination to send back to |
| `read-authorize-error.ts` | The side that reads the reason from the URL. Kept apart from the building side |
| `parse-session-form.ts` | Decodes the submitted `FormData` into a shape that can be passed to issuance |
| `form-state.ts` | The return types of the two operations, and the type of the submission target passed from the route |
| `view.tsx` | Stacks the current session and the issuance settings vertically |
| `ui/current-session/` | Displaying the current session, and the operation that discards it |
| `ui/session-form/` | The issuance settings. A client island |

> The procedure for fetching a token from the IdP is held not by this screen but by
> [`adapters/server/auth/development-token.ts`](../../adapters/server/auth/development-token.ts).

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `model` | The types of the issuance settings and return values (`action-state` / `session`), reading URL values |
| `components` | The containers the input surface is built from (input fields, switches, cards) |
| `observability` | Putting rendering on spans |

**It does not draw on `adapters`.** Only the app layer may touch session sealing, and what this screen calls is a
Server Action (below).

## Action Return Contract

**They live in the app layer, not under the feature.** The reason is the first item under Design Decisions.

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `issueDevSessionAction` | `src/app/dev/session/actions.ts` | `DevSessionFormState` | Sets the session and `redirect`s to the return destination | Keeps per-field reasons on screen |
| `discardDevSessionAction` | Same as above | `DiscardSessionFormState` | Drops the cookie and returns to the same screen | Returns only the classification |

When opened in the middle of an authorization round trip, the submission target switches to
`/dev/session/authorize` (a Route Handler), and the Actions above are not used. **Failures on that path return
only the classification, through the URL** — a plain submission cannot carry state over.

## Test Perspectives

- [ ] The judgment of which environments may open it applies to both the screen and the Server Action
- [ ] In the middle of an authorization round trip, the session is not set here; the authorization code is passed to the callback
- [ ] There is no field that reads back the pasted Access Token
- [ ] The wording differs by the stage at which the IdP did not respond (not running / wrong address)

## Usage

**This screen opens only in development and on CI's local targets.** The route is not even in a production
build.

### 1. Seeing the screen's behavior with mocks

```bash
APP_ENV=ci pnpm dev
```

No backend needs to be started (`APP_API_MODE=mock`). Open it with a return destination, as in
`/dev/session?returnUrl=<protected screen>`, decide as whom and with which role to enter, and press
「この内容で入る」 ("enter with these settings") to land on that screen.
**The Access Token may be left blank** — the mock has nothing that verifies a Bearer.

**In this environment `/login` also leads here.** `ci` sets `AUTH_MODE=dev`, so authorization starts at this
screen instead of the IdP (`env/README.md`). **Arriving by that path changes the submission target** — a plain
form posts to the authorization endpoint (`/dev/session/authorize`), which returns to `/api/auth/callback` with
an authorization code. The callback sets the session; this screen only hands over the settings.
When opened directly, it issues on the spot and lands on the return destination, as before.

Mock responses generated from the contract change value every time, so lines may have issues raised on them.
**To press all the way to confirmation, go through with real data.**

### 2. Going through with real data

```bash
APP_ENV=local pnpm dev
```

**If the normal login (`/api/auth/login`) works, that is the authoritative path.** This screen is a substitute
for when redirects cannot get through, or when you want to re-enter as a specific actor.

**Turning on 「API 接続モード」 ("API connection mode") makes this screen fetch the token.** It calls the
development IdP with the actor entered in 「誰として入るか」 ("enter as whom") and puts the returned token in
the session. There is no need to call another endpoint by hand and copy the result
— this avoids copying mistakes and expiry showing up as "the screen is broken".

**「IdP の接続先」 ("IdP connection target") can be rewritten.** Its initial value is the configuration
(`AUTH_ISSUER`), but it is not fixed (the reason is under Design Decisions: the connection target is not fixed from configuration). Fetching with a mismatch yields a token but a 401 from the API, and the response does not reveal that the cause is "where it was
fetched from" rather than "how it was fetched". Point it at the IdP of the same set as the API connection target
(`APP_API_BASE_URL`).

Use actors registered in the backend. An unregistered actor still gets a token, but the API side cannot resolve
it and returns 401. To see the management screens, you need an actor with the `admin` role.

> **How tokens are fetched is held in one place, `adapters/server/auth/development-token.ts`.** What works is
> **a development IdP that publishes OIDC Discovery and lets an actor be named through Resource Owner Password
> Credentials** (a grant type that must never be used with a real IdP). The screen and the Server Action know
> only that "passing an actor and a connection target returns a token".
>
> When the target does not have those properties, it returns, with the target, **the stage at which it did not
> respond** — so that forgetting to start the IdP and mistyping the address do not produce the same wording.

While connected to mocks (`APP_API_MODE=mock`), this switch is off by default. There is nothing to verify a
Bearer, so that is enough. To use a token you fetched yourself, turn the switch off and the field to paste it
appears.

### 3. Checking how expiry looks

Enter with a short 「失効までの秒数」 ("seconds until expiry"), and open a protected screen after that many
seconds. **You are sent to the login screen with a return destination** (measured). Reaching that without waiting
is the purpose of this field.

### 4. Viewing as another actor

Drop the cookie with 「session を捨てる」 ("discard session") and enter again. Re-entering without discarding also
overwrites it, but discarding lets you check the discarded screen as well (the behavior when an unauthenticated
user hits a protected route).

## Design Decisions

**This screen does not decide its submission target.** Sealing the session is the domain of `adapters/server/auth`,
and only the app layer may touch it (`adapters-auth` in `architecture.ts`). So the Server Actions are in
`src/app/dev/session/actions.ts`, and this screen only passes the submission target it receives to
`useActionState`.

**In the middle of an authorization round trip, the session is not set here.** The authorization code is passed
to `/api/auth/callback`, and the setting is left to it. Setting it here would mean the callback is never hit while
`AUTH_MODE=dev`, and even if the authorization round trip were broken, development and CI would never notice.

**That submission goes to a Route Handler, not a Server Action.** A Server Action's `redirect()` cannot navigate
to a Route Handler — the client router swallows it, no request goes out at all, and only the URL is rewritten
(measured). A plain form submission makes the browser navigate. With a real IdP too, the login screen submits to
the authorization endpoint, which returns with a response, so this shape is also closer to the real thing.

**The authorization endpoint's judgment sits next to the receiving endpoint.** The imports allowed for `route.ts`
are `adapters/server` / `errors` / `logging`, and in principle it is a thin proxy. Both the form parsing and the
failure classification are `features` vocabulary, so `src/app/dev/session/authorize-development-session.ts` holds
them, and the endpoint only "gates, calls, and converts to HTTP form". **The submission body's size limit is also
held there** — `bodySizeLimit` in `next.config.ts` applies only to Server Actions and stops applying once the
work moves to a Route Handler.

**On that path, failures return only the classification, through the URL.** A plain submission cannot carry state
over, so per-field reasons do not appear. A real IdP's authorization endpoint also returns only an `error`
classification, so the two match there. Per-field reasons are held by the submission that stays on its own screen
(the path that issues on the spot).

**The judgment of which environments may open it is placed at each entry point.** The route (screen) and the
Server Action are separate entry points, and a Server Action can be called without going through the screen.
Closing only one does not count as closed.

**This screen does not hold how tokens are fetched.** It is a procedure specific to the IdP on the other end, and
changes when the connection target changes. The screen knows only that "passing an actor and a connection target
returns a token"; `adapters/server/auth` actually fetches it (only the app layer may touch it, so a Server Action
is what calls it).

**The connection target is not fixed from configuration.** On a development machine the backend runs in parallel
on several endpoints, so the IdP the configuration points at and the IdP the API currently being called expects
drift apart. **The one who knows which is right is the person choosing the target on the spot**, so the
configured value is shown as the initial value and can be rewritten.

**The Access Token is not shown on screen.** Being unobservable from the browser is the very reason the session
has this shape, and showing it to check would break that property oneself. There is a field to paste it, but no
field that reads back the pasted value.

**The seconds until expiry can be specified.** This lets you reach how a protected screen looks after expiry
without waiting.

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. The basis for only the app layer touching session sealing
- [0025](../../../docs/adr/0025-app-layer-elements.md) — The elements of the app layer. A Route Handler stays a thin proxy, with judgment placed next to it
- [0029](../../../docs/adr/0029-type-design-discipline.md) — Discriminated unions and parsing at the boundary. How submitted `FormData` is decoded
- [0053](../../../docs/adr/0053-ui-component-interaction-seam.md) — The a11y seam of interaction. The seam the input surface keeps
- [0079](../../../docs/adr/0079-auth-frontend-seam.md) — The frontend seam of authentication. The property that the session cannot be observed from the browser
