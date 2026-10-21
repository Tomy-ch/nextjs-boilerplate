# Control Surface of Development Endpoints

This project has **endpoints opened only for development and automated checks**: the Route Handler and screen that issue a session without going through the IdP, and the authorization endpoint of the development IdP. Mocks generated from the contract cannot fake authentication, and the IdP is not started in CI, so E2E has no means other than these endpoints of reaching "the logged-in state".

Two questions always come with such endpoints: **how wide to take the control surface**, and **how to keep the endpoint closed**. This ADR decides the two as separate axes — the control surface is decided by the set of states to be reached, and safety is ensured by the judgment of the environment in which the endpoint is opened. Neither stands in for the other. When the next endpoint of the same kind arrives (a mock control API, an endpoint that generates fixtures, a development-only Route Handler), this is where the answer to which way it leans lives.

The definition of which environments may open them is owned by [0011](0011-no-docker.md), not falling back to a default for the environment selector by [0030](0030-environment-variable-management.md), and the session mechanism itself by [0079](0079-auth-frontend-seam.md). This ADR does not copy them; it holds only the decisions on the endpoint side.

## Status

Accepted

## Rationale / Purpose

- **The states tests want to reach are not narrowed by the real system's circumstances.** The screen after expiry, how things look to the privileged and the unprivileged side, and behaviour as a particular principal are all states verification must reach. If an endpoint copies the real system's policy, the means of reaching those states disappears
- **Put the grounds for safety in one place.** If each endpoint holds its own "safe range", the judgment of the range scatters with every new endpoint, and any one loose judgment becomes the floor for the whole
- **Absorb configuration mix-ups with the absence of the endpoint.** The runtime judgment reads configuration. If no endpoint remains in an artifact built with the wrong configuration to begin with, it does not open regardless of whether the judgment is correct

## The control surface is decided by the set of states to reach

**What an endpoint accepts directly expresses the states tests want to reach.** For issuing a session, who to enter as, the role, and the number of seconds until expiry can be specified.

- **The role is given directly here.** In ordinary login the role is pulled from the backend ([0079](0079-auth-frontend-seam.md)), but this endpoint exists to reach states without going through either the IdP or backend registration. Making backend registration a condition would mean privileged-side screens cannot be checked in an environment without a backend
- **The seconds until expiry can be shortened.** This is to step on how things look after expiry without waiting for actual expiry. Fixing the default would leave "waiting" as the only way to reach that state
- **Without a specification, it issues on the side without permission.** A wide control surface and a wide default are different things. A call specifying nothing falls to the weakest state

**Rejected alternative: narrowing the control surface by the real system's policy.** Narrowings such as "the role is pulled from the backend", "expiry is fixed to the same default as production" or "privileged-side sessions cannot be issued" look safe but only create states verification cannot reach. For each narrowing, another endpoint or manual work arises to check that state, and this ADR's guarantee does not apply there. Safety is owned by the next section.

## Safety is borne by the judgment of the environment that opens the endpoint

**The danger is closed not by the control surface but by the environment that opens the endpoint.** The judgment has two parts: the environment (`APP_ENV` is explicit and is an environment where development-only endpoints may be opened) and the destination (the `Host` / `X-Forwarded-Host` the request claims is a local name). The definition of environments is owned by [0011](0011-no-docker.md), and not falling back to a default for the selector by [0030](0030-environment-variable-management.md).

- **The list of environments that may open them is placed in one place** (`isDevelopmentOnlyEndpointOpen()` in `config`). Copying the condition with every new endpoint lets a change that widens only one of them through silently
- **The destination judgment is not a line of defense.** `Host` is a value the requester claims and can be forged. What the destination stops is the path ordinary users ordinarily step on when something is published with the wrong configuration; what stops someone deliberately forging it is the environment side. The two are layered because their roles differ, not because one is weak
- **Requests that do not state a destination are closed.** Leaning what cannot be judged toward opening makes requests without conditions the easiest to get through

**Rejected alternative: each endpoint holds its own open/close condition.** Writing conditions per endpoint, like "this endpoint only for `local`" or "that endpoint when the connection mode is mock", creates room for a loose judgment for every condition. Judging by connection mode is already forbidden by [0011](0011-no-docker.md) / [0030](0030-environment-variable-management.md).

## Being excluded from the build and not opening at runtime are separate guarantees

**Development-only routes are included only in development and CI builds.** `page.dev.tsx` / `route.dev.ts` are development-only extensions, and whether the build includes them in `pageExtensions` is decided by **the same single condition** as the runtime judgment.

The reason for doubling up is that "not remaining" and "not opening" are separate guarantees.

- **If excluded from the build, the surface itself does not exist in the artifact.** Even if environment variables are mixed up at runtime or the judgment is written wrong, what does not exist does not open. A configuration mix-up breaks the very value the runtime judgment reads, so relying only on the judgment means the guarantee disappears the moment of the mix-up
- **If closed at runtime, it does not open even when an artifact containing the endpoint runs somewhere else.** The build does not know the destination. A path by which a CI build reaches somewhere other than local, or a deployment whose environment designation differs between build time and runtime, cannot be prevented on the artifact side. Looking as far as the destination can only be done at runtime

**Rejected alternative: deeming either one alone sufficient.** With the runtime judgment alone, there is no guarantee against the most likely accident, a configuration mix-up. With build exclusion alone, a development artifact running somewhere other than local cannot be stopped. The premise that if one side were complete the other would be unnecessary does not hold in the first place.

## The judgment is placed at each entry point

**Screens, Server Actions and Route Handlers are separate entry points, and each calls the judgment.** A Server Action can be called without going through the screen. The authorization endpoint is merely chosen by the screen as its submission target and can be called directly. Closing only one side does not count as closing.

The condition is in one place; the call to the judgment is at each entry point. This division is not broken. Copying the condition into entry points breaks "the list is in one place" of the previous section, and gathering the calls into one place creates entry points that do not go through it.

## When closed, do not reveal existence

**HTTP entry points return 404, not 403.** Screens are treated as not found, and Route Handlers return an empty 404. Not revealing existence reduces the damage when something is published with the wrong configuration — 403 tells that "there is an endpoint there".

Server Actions have no HTTP endpoint, so they cannot be 404. When closed, they return only "not open" as the result of the failure.

## The endpoint holds only the judgment and input validation

**The endpoint is thin.** It holds only the judgment of the environment that opens it and the validation of the received specification; assembling the session is owned by `adapters/server` (the thin proxy of [0079](0079-auth-frontend-seam.md) / [0025](0025-app-layer-elements.md)). If the endpoint also held assembly, the development endpoint and the main line would have two ways of making sessions, and only one would get fixed.

## Prohibitions

- ❌ Narrowing the control surface of development endpoints by the real system's policy (the source of roles, the expiry default, restrictions on which side may be issued). Safety is held by the environment judgment (Enforcement: `src/app/api/auth/test-session/route.dev.test.ts` (that a session can be issued specifying the role, seconds until expiry and default permission) rejects changes narrowing the existing endpoint's control surface. How wide to take the control surface of the next endpoint added is Prose — **not mechanizable**. The set of states to reach is a judgment decided by the tests)
- ❌ Each endpoint holding its own open/close condition. The condition is placed in one place in `config`, and entry points call it (Enforcement: ESLint `no-restricted-syntax` (direct reads of `process`) rejects assembling the condition from environment variables at an entry point. Combining config values at an entry point to hold a different condition is Prose — **not mechanizable**. Which branch is the open/close condition is decided by the meaning of the expression)
- ❌ Placing development-only routes with anything other than the development-only extensions (`page.dev.tsx` / `route.dev.ts`). They would no longer be excluded from the build (Enforcement: Prose — **mechanizable** (route segments that import `isDevelopmentAccessAllowed` being spelled `page.tsx` / `route.ts` can be detected; no rule exists))
- ❌ Omitting an entry point's runtime judgment on the grounds that it is excluded from the build. The reverse likewise — including it in the build on the grounds that it is closed at runtime (Enforcement: each entry point's tests (404 / no issuing in a closed environment) reject omitting the runtime judgment. Whether to include in the build is held by `pageExtensions` in `next.config.ts` calling the same condition, but nothing rejects a change that removes it — **mechanizable** (that `pageExtensions` branches on `isDevelopmentOnlyEndpointOpen()` can be checked; no rule exists))
- ❌ Placing the judgment only on the screen, or only on the Route Handler, letting Server Actions or the authorization endpoint through (Enforcement: the existing per-entry-point tests (two Route Handlers and a Server Action) pin the closed case. `page.dev.tsx` is outside unit testing, and whether a new entry point calls the judgment is reached only within the range where an `it` for the closed case is written — **mechanizable** (a module that names itself a development endpoint and does not call `isDevelopmentAccessAllowed` can be detected; no rule exists))
- ❌ A closed endpoint revealing its existence with 403 or an explanatory response (Enforcement: the Route Handler tests pin 404 when closed. The screen (`notFound()` in `page.dev.tsx`) is outside unit testing and is Prose — **mechanizable** (that a development screen returns 404 in a closed environment can be confirmed with E2E; no rule exists))
- ❌ Giving development endpoints session assembly or steps specific to a real IdP ([0079](0079-auth-frontend-seam.md)) (Enforcement: Prose — **not mechanizable**. The line between input validation and session assembly is a judgment of responsibility, not determined by the shape of the code)

## Related ADRs

- [0011-no-docker.md](0011-no-docker.md) — the definition of environments in which development-only endpoints open, and that the judgment is held by `APP_ENV` and the destination
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — making `APP_ENV` mandatory and not falling back to a default
- [0079-auth-frontend-seam.md](0079-auth-frontend-seam.md) — the session mechanism (Resolver), and that the source of roles is the backend (the main line this endpoint deliberately bypasses)
- [0025-app-layer-elements.md](0025-app-layer-elements.md) — keeping Route Handlers thin proxies
- [0110-security-operations.md](0110-security-operations.md) / [0111-csp-security-headers.md](0111-csp-security-headers.md) — the neighbouring operational and runtime defenses. This ADR bears the single point of development endpoints
- [0090-testing-strategy.md](0090-testing-strategy.md) — the side that verifies the states reached through this endpoint
- [0056-mock-app-exclusion.md](0056-mock-app-exclusion.md) — not publishing builds in which development-only endpoints open
- [0156-browser-observation-tooling.md](0156-browser-observation-tooling.md) — local observation needs no real-browser privileges; this endpoint suffices
