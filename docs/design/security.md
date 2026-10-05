# Presentation-Layer Defenses

This document walks through the **defenses this presentation layer holds itself**. They cover two surfaces: **what is shipped to the browser** (delivery headers, CSP, values that enter the bundle) and **how values arriving from behind are handled** (classification and placement, the line drawn against upstream-originated values, rich text). The entry point (`src/proxy.ts`) is treated as the place where those two surfaces meet.

The ADRs own the decisions. [ADR 0111](../adr/0111-csp-security-headers.md) is authoritative for the headers and the CSP, [ADR 0112](../adr/0112-data-classification-cache-boundary.md) for value classification, [ADR 0030](../adr/0030-environment-variable-management.md) for the env boundary, and [ADR 0043](../adr/0043-middleware-policy.md) for the entry point's responsibilities; this document rereads them from **where the implementation lives and where the pitfalls are**. The CI-side checks (secret scanning, SAST, dependency audit, DAST wiring) are owned by [ADR 0110](../adr/0110-security-operations.md) and [`.github/workflows/README.md`](../../.github/workflows/README.md), and are not restated. The authentication round trip itself belongs to [ADR 0079](../adr/0079-auth-frontend-seam.md); all that appears here is "how the entry point handles it".

## Overall Shape

The defenses are not gathered in one place; they sit **at each stage of the path a value travels**. Every stage sees something the other stages cannot ([ADR 0112](../adr/0112-data-classification-cache-boundary.md)), so do not read one of them and conclude "this is what protects us".

```text
Browser ──(request)──▶ proxy.ts ──▶ Route Handler / screen / Server Action ──▶ adapters/server ──▶ backend
                       │ stop / origin / optimistic check   │ final authz / body limit   │ classify / credentials / response validation
                       ▼                                    ▼                            ▼
Browser ◀──(response)── next.config.ts headers() ◀── render (taint) ◀── fetch endpoint (types / gate) ◀── zod validation
                       delivery headers / CSP
```

What does not depend on the request goes on **the delivery side** (`next.config.ts`), what depends on the request goes in **the entry point** (`src/proxy.ts`), and what depends on the value goes in **the fetch endpoint** (`adapters/server/http`). Once this three-way split is clear, you can also read where something is absent.

## Delivery Headers and CSP

### Where They Are Declared

**Every request-independent header is attached by `headers()` in `next.config.ts`.** It targets `source: "/:path*"`, and the content is assembled by `buildSecurityHeaders()` in [`src/config/security-headers/security-headers.ts`](../../src/config/security-headers/security-headers.ts). CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-*` and HSTS are set here.

Values that vary by environment are **derived from the validated ENV**. There is no place where an origin is written directly into a header string.

| Input | Source | Affects |
| --- | --- | --- |
| `mediaOrigin` | `MEDIA_ORIGIN` | `img-src` |
| `authIssuer` | `AUTH_ISSUER` | `form-action` (where the login form is redirected to the IdP) |
| `apiOrigin` | `APP_API_BASE_URL` | `connect-src` (the destination of subscriptions the browser opens directly to the backend; round trips go through the BFF, so they do not need it) |
| `servesOverTls` | the scheme of `AUTH_REDIRECT_URI` (`isServedOverTls()`) | whether HSTS and `upgrade-insecure-requests` are emitted |
| `development` | whether this is `next dev` (phase) | whether `'unsafe-eval'` is added to `script-src` |
| `gtmContainerId` | `NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID` | adds Google's origins to `script-src` / `connect-src` / `img-src`, and does **not** emit `Cross-Origin-Embedder-Policy` |

As the last row shows, **the shape of the headers changes with whether the bundled tag manager is in use**. A deployment with an empty container ID emits `Cross-Origin-Embedder-Policy: require-corp` and gets cross-origin isolation; a deployment with a non-empty one does not. Which is right is for the deployment to decide, and the decision is held in one place, `security-headers.ts`.

**Request-dependent headers are owned by `src/proxy.ts`.** There are two kinds: `Cache-Control: private, no-store` on requests that carry credentials, and `Access-Control-*` for declared cross origins (see *Entry point* below). The placement is decided by **which way each one fails**: added in `headers()`, they would land on every response; added in `proxy.ts`, they miss the static responses that do not pass through the pre-handler.

### What Happens If You Use a Nonce

The CSP `script-src` is `'self' 'unsafe-inline'`. **No nonce is used.** Next.js itself emits the RSC payload as inline scripts (`self.__next_f.push`), so with neither a nonce nor a hash, this is the only way to allow inline.

Taking the nonce path (seam B of [ADR 0111](../adr/0111-csp-security-headers.md)) means `src/proxy.ts` generates a nonce per request and Next.js attaches it to every script. At that moment **every route becomes dynamic rendering**. A static shell can no longer be served, neither CDN caching nor ISR works, and it is incompatible with Cache Components, which this repository enables ([rendering.md](rendering.md#this-repository-enables-it) — "This repository enables it"). A requirement to "tighten the CSP" comes with a decision to replace the whole delivery model.

`Content-Security-Policy-Report-Only` is not used either. Instead of a staged rollout, violations are found in real browsers by the checks in the next subsection.

### Checks That Reconcile the Declaration with Actual Delivery

The declaration (`next.config.ts`), what the browser receives, and what the browser enforces are **three separate facts**, each seen by a separate check.

| Fact | Check | Location |
| --- | --- | --- |
| The assembly matches the declaration | Unit test | [`security-headers.test.ts`](../../src/config/security-headers/security-headers.test.ts). Pins deployments both with and without a container ID and with and without TLS |
| It is on the response | DAST (OWASP ZAP baseline) | `dast.yaml` (`make dast`). Known gaps are listed in [`.github/zap/rules.tsv`](../../.github/zap/rules.tsv) with a reason and a reversal condition, and **any finding not on the list is red** |
| The browser enforces it | E2E watcher | [`e2e/lib/test.ts`](../../e2e/lib/test.ts) listens for `securitypolicyviolation` on the document and counts violations across **every spec and every rendering engine** |
| Evidence that enforcement works | E2E spec | [`e2e/journeys/csp.spec.ts`](../../e2e/journeys/csp.spec.ts) injects a script from an undeclared origin and confirms that a violation is reported |

**CSP violations are not caught by the console watcher.** Lines the browser writes itself carry no arguments, and the watcher's rule of counting only "lines JavaScript wrote" excludes them. That is why `securitypolicyviolation` is received on a separate path ([`e2e/README.md`](../../e2e/README.md#what-counts-as-an-anomaly) — "What counts as an anomaly"). Loosening to `Report-Only` would pass DAST but fail `csp.spec.ts` — this is why the check that reads headers and the check that observes enforcement exist separately.

A change touching `next.config.ts` or `src/config/security-headers/` makes `scripts/deferred-checks/recommend.ts` name `run-e2e`. It steers toward the real-browser check so that a header change does not feel done on unit tests alone.

**CI runs with the tag manager's container ID empty.** So the CSP with Google's origins added, and the state in which `Cross-Origin-Embedder-Policy` is dropped, are not checked in a real browser. Only the unit tests pin the assembly ([ADR 0110](../adr/0110-security-operations.md)).

### What Sits Next to the Delivery Headers

- `poweredByHeader: false` — does not announce the framework or its version
- `images.remotePatterns` — only the single host of `MEDIA_ORIGIN`. No wildcard is used because an allowed host is exactly whom image optimization can go and fetch from
- `experimental.taint: true` — protection against leaks during rendering. See *Data Classification and Placement* below

## Data Classification and Placement

### The Fetch Endpoint Holds the Classification

There is no type that wraps a value (nothing like `UserScopedData<T>`). The **fetch endpoint** declares the classification, and `createHttpClient()` in [`src/adapters/server/http/request.ts`](../../src/adapters/server/http/request.ts) always receives a `scope`. Clients are built by one connection point per classification ([`public-client.ts`](../../src/adapters/server/http/public-client.ts) / [`user-scoped-client.ts`](../../src/adapters/server/http/user-scoped-client.ts)), and a fetch endpoint takes the connection point that matches its classification.

| Classification | What it is | What the endpoint can hold |
| --- | --- | --- |
| `public` | Anything obtainable without naming a principal | `cache` / `tags`. The credential handle (`getBearerToken` / `bearerToken`) **does not exist in the type** |
| `user-scoped` | Anything tied to a principal | The credential handle. `cache` / `tags` **do not exist in the type** |
| secret | Signing keys, tokens | Does not go through this path. Confined to `config/*.server.ts` |

"Do not put PII in a shared cache" is not a warning note but **the absence of an argument**. The absence is on both sides: a public endpoint has no argument that could carry credentials at all. So reading the classification tells you "whether that endpoint can carry credentials".

**`allowAnonymous` does not change the classification.** It is a **per-request** declaration — always attach credentials when they can be obtained, and send anonymously only on the occasions they cannot — and the endpoint remains user-scoped. It may be set only where the contract declares authentication for that operation optional (`security` includes `{}`). Hiding invalid credentials and passing as anonymous means being treated as a different principal without noticing the expiry.

### Checkpoints at Each Stage

The same accident is stopped by a different means at each stage a value passes through. **Every stage sees something the other stages cannot.**

| Stage | What it stops | Means | Location |
| --- | --- | --- | --- |
| Fetch endpoint | Passing `cache` / `tags` to a user-scoped endpoint | types | `UserScopedRequestSpec` in `request.ts` |
| At fetch time | A cache directive on a spec built around the type, and `Authorization` / `Cookie` brought in per call | throw at request time | `assertSpecWithinScope()` / `assertNoCredentialHeader()` in [`data-scope.ts`](../../src/adapters/server/http/data-scope.ts) |
| Before cache entry | A module with `use cache` importing a user-scoped endpoint (the import target and one hop beyond) | ESLint | `project-rules/no-user-scoped-in-cached-module`. `scripts/scope-spelling.gate.test.ts` watches that the classification spellings remain |
| Rendering | Reading `cookies()` from a cached scope | framework | `next-request-in-use-cache`. Relies on credentials coming from cookies |
| Before sending to the client | Passing server objects and secret values to a Client Component | taint | [`adapters/server/taint/taint.ts`](../../src/adapters/server/taint/taint.ts) |
| Delivery | A response tied to a principal landing in a shared cache | response header | `Cache-Control: private, no-store` in `src/proxy.ts` |

**The rendering stage rests on one premise** — that credentials are resolved from `cookies()` at the point of use. If a resolved value is captured and carried around, `cookies()` is not read inside the cached scope and the framework's defense drops away **silently**. Only an imported handle can be passed to `getBearerToken` in `request.ts` (ESLint `project-rules/no-captured-bearer-token`) precisely so that this premise can be checked. Only the single round trip that establishes the session has no cookie yet, and it passes a resolved value under a separate spelling, `bearerToken`. The spellings are kept apart so the places where the defense drops away can be counted, not because there are more places where passing one is allowed.

**Credentials do not leave the connection target.** `authorizationHeader()` in `request.ts` does not attach `Authorization` when the request URL's origin differs from `baseUrl`. Absolute URLs can come from external responses such as Discovery, and caller conventions alone would not stop it.

### What Taint Sees and Does Not See

Taint **tracks by reference only**. It does not extend to a `{ ...record }` copy or to strings with fields extracted. So it is not the primary defense, but an aid that catches, at runtime, a mis-send that slipped past minimizing the fetch scope and the Client DTO.

It is registered in two places, both **where the value is born**.

- The session record — `readSessionRecord()` in [`adapters/server/auth/session.ts`](../../src/adapters/server/auth/session.ts) applies `taintObjectReference()` immediately after restoring it. Passing the record itself, which contains the Access Token and ID Token, to a Client Component makes rendering fail at the moment it is passed
- The session signing key — `getSessionResolver()` in [`adapters/server/auth/resolver.ts`](../../src/adapters/server/auth/resolver.ts) registers the value itself with `taintUniqueValue()`. The `config` kernel cannot bring in `react` (`imports-allowed: []`), so the reading side registers it. The lifetime of the registration is held by the singleton that holds the value (`AuthConfig`)

What may be passed to inner layers is **only the identity** returned by `verifySession()`. The token sits behind a separate handle, `getAccessToken()`, and neither lets the record out of `adapters/server`.

### Where Secrets Are Confined

Secrets do not go through the fetch path; they are confined to `config/<purpose>/<purpose>.server.ts`. There are three guards.

1. **`import "server-only"`** — the build fails the moment it enters the client bundle. `scripts/server-only.gate.test.ts` finds modules named `*.server.ts` that lack the guard. The layer dependency table only sees import direction and has no notion of server versus client, so this guard is needed on a separate axis
2. **Rejecting the bundled secret values in real environments** — `authSessionSecretValidator()` in [`config/auth/auth.schema.ts`](../../src/config/auth/auth.schema.ts) does not accept the two values that sit in plain text in the public repository anywhere other than `local` / `ci`. Forgetting to set it shows up not as "no value" but as "a known value is present", so a validation that only checks length would pass it. The check runs at startup and stops before a single cookie is issued
3. **taint** — as above

When `APP_ENV` is unspecified, the check that permits the bundled values also returns `null` and **falls to the not-permitting side**. There is no path anywhere that falls back to a default (`findApplicationEnvironment()` in `application-environment.ts`).

## The `NEXT_PUBLIC_` Boundary

### What Enters the Bundle

`NEXT_PUBLIC_` variables are **replaced with a literal at each reference** at build time. What reaches the browser is the value itself, and there is no way to swap it at runtime. Three are in use today.

| Variable | Where it is read | What the browser uses it for |
| --- | --- | --- |
| `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` | [`config/http/http.client.ts`](../../src/config/http/http.client.ts) | The request URL limit. It reads the same variable as the server side, so the threshold is one line of env |
| `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` | Same as above | Rejects before sending. **The receiving endpoint checks the same size again** — a sender can replace the browser-side check |
| `NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID` | [`config/analytics/analytics.client.ts`](../../src/config/analytics/analytics.client.ts) | When empty, the element behind the consent gate is not rendered at all. The container ID is a public value that appears in the URL the tag is loaded from; the secret lies in edit permission on the container |

Client config holds **only references that name `NEXT_PUBLIC_` variables by string literal**, and does not validate there. The browser is not where validation runs, and what is substituted is the value that already passed validation.

### What Does Not Enter

Server config (`*.server.ts`) is a runtime object and carries the `server-only` guard. Reading `process.env` directly is forbidden by biome's `noProcessEnv`, with only the `config` kernel and the startup boundary exempted by override. So "reading `process.env.SECRET` from a Client Component" stops at lint, and "importing server config" stops at build.

### What the Build Finds and Does Not Find

**Finds**:

- Validation of every ENV — `next.config.ts` calls `validateEnvironment()` and validates all of them, `NEXT_PUBLIC_` or not. Both missing and invalid values are a build failure. An unvalidated value is never substituted into the browser
- `server-only` boundary crossing — fails the moment a server module is pulled from the client bundle
- Client bundle weight — `scripts/client-schema-weight.gate.test.ts` finds import shapes that carry the whole validation library into the client

**Does not find**:

- **Passing a server config value to a Client Component through props.** Once the value is a `string`, `server-only` no longer applies, and taint only applies to registered values (the signing key). It is serialized into HTML as the RSC payload and goes out to the browser as is. This is stopped by the rules ([`docs/rules.md`](../rules.md#config)) and by the dependency table that keeps inner layers from importing config — not something the build finds
- **Derived values.** A string like `` `Bearer ${token}` `` is not registered with taint

`serverActions.bodySizeLimit` is `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` plus an allowance for the envelope (32 KiB). **This limit applies to every Server Action.** Next.js has no per-action limit, so a value raised for files also applies to endpoints that only receive text.

## Entry Point — What `src/proxy.ts` Holds and Does Not Hold

[`src/proxy.ts`](../../src/proxy.ts) is the pre-handler that runs on every path, including prefetch, and its order is fixed.

1. **Maintenance** — when `APP_MAINTENANCE_MODE` is set, it rewrites `GET` / `HEAD` to the maintenance screen and refuses everything else with `503`. Only the maintenance screen itself and `/api/health` pass. It comes before authorization because stopping is one decision over every route
2. **Origin** — judges `Origin` with `judgeOrigin()` from `model/cross-origin`, and stops **state-changing methods** from cross origins not in the declaration (`HTTP_ALLOWED_ORIGINS`) with `403` before they reach the handler
3. **CORS or optimistic check** — requests to `/api/` from a declared cross origin get CORS headers (`204` for preflight); everything else proceeds to the optimistic role check
4. **Finalization** — issuing and removing the consent-bound measurement id, and `Cache-Control: private, no-store` on requests that carry credentials

### What It Holds

| Responsibility | Implementation | Notes |
| --- | --- | --- |
| Optimistic authorization | Decrypts the cookie with `readOptimisticSession()` and checks it against `allowedRolesFor()` from `model/authz` | Unauthenticated goes to login (the return destination passes through `toSafeReturnUrl()`); insufficient role goes to `/`. It **does not send back to login** because retrying would produce the same result |
| Declaring the protected paths | `ROUTE_POLICIES` in `model/authz` | **It enumerates the protected side.** Enumerating the public side would make a newly added screen public by default. Definitive authorization draws on the same declaration |
| Origin validation | `judgeOrigin()` + `isStateChanging()` | Same-origin is judged on **host only** (`X-Forwarded-Host`, then `Host`). Behind a TLS-terminating proxy the scheme disagrees, so it is not compared. A declared cross origin requires an exact origin match |
| CORS | `openCors()` | `/api/` only. It returns `Access-Control-Allow-Credentials: true`, so `*` cannot be used, and it adds `Vary: Origin`. Preflight allows the requested methods and headers as is — once the origin is allowed the counterpart is trusted, and keeping a separate list would split the declaration in two |
| `Cache-Control` on responses that carry credentials | `finalize()` | Requests that carry the session cookie, **or responses that rewrote a cookie**. Dropping the latter would freeze in the CDN a response that hands a measurement id to an anonymous consenting visitor, and hand the same id to everyone thereafter |

### What It Does Not Hold

- **Definitive authorization.** The place closest to the data source (`verifySession()` in `adapters/server/auth/session.ts`) owns it, and the screen, Server Action and Route Handler each call it. The pre-handler only reads the cookie and does not consult the data source. If the Proxy were the only check, the paths that bypass the Proxy (`matcher` exclusions, direct Server Action calls) would become holes as they are
- **Request-independent headers.** Owned by `next.config.ts` (see above)
- **Rate limiting, DDoS mitigation, WAF.** Cut out by name as infra / edge responsibilities ([ADR 0077](../adr/0077-bff-abuse-protection-boundary.md)). The minimal defense left in the app is **type and size**, applied before a Route Handler that does not require authentication reads the body, held by `readJsonBody()` in [`adapters/server/http/json-request.ts`](../../src/adapters/server/http/json-request.ts). If the content-type does not claim JSON, `415`; if the declared length exceeds the limit, `413` without reading; if there is no declaration or it lies, `413` from the measured size after reading. **It does not go as far as cutting off before reading** — stopping an endlessly streamed body is the delivery path's job
- **Opening and closing the development-only endpoints.** `route.dev.ts` / `page.dev.tsx` are excluded from the build by `pageExtensions`, and in the remaining artifacts `isDevelopmentAccessAllowed()` in [`adapters/server/auth/development-access.ts`](../../src/adapters/server/auth/development-access.ts) looks at `APP_ENV` and the destination (that `Host` / `X-Forwarded-Host` is a local name). When closed it returns `404` and does not reveal that it exists ([ADR 0113](../adr/0113-development-access-surface.md))

### The Range `matcher` Selects

`_next/static` / `_next/image` / `favicon.ico` and the metadata files (`icon` / `apple-icon` / `opengraph-image` / `sitemap.xml` / `robots.txt`) do not pass through the pre-handler. **`Cache-Control: private` does not reach the paths that do not pass through either.** This exclusion presumes that only public images go through image optimization. `/api` is not excluded — Route Handlers can also be subject to protection.

The excluded spellings are fixed to their full length. Excluding `icon` by prefix would mean that a screen added later whose path starts with that spelling would alone bypass the pre-handler.

## Handling Values That Arrive from Behind

**This layer does not exhaustively sanitize values that arrive from upstream (the backend, the IdP, third parties).** It cleans up only **the values it produced itself** ([ADR 0070](../adr/0070-backend-role-separation.md), which assigns ownership of boundary values).

The reason for drawing the line is that trying to be exhaustive leaks the supplier's concerns into the structure of the presentation side, and still never becomes complete. To the challenge "this upstream value would be dangerous if it arrived like this", what the presentation layer can answer is **where it places** that value, not scrubbing the value's contents. What must be prevented is closed at the supplier or at the boundary.

In terms of implementation, it looks like this.

| Situation | What is done | What is not done |
| --- | --- | --- |
| Backend responses | **Shape validation** with generated zod at the `adapters` boundary (detecting contract breaches), and repacking into in-house view types | Sanitizing string contents. Text, paths and identifiers in the response are carried around as is |
| Relaying browser-originated spans | `redactAttributes()` in [`adapters/server/telemetry/browser-traces.ts`](../../src/adapters/server/telemetry/browser-traces.ts) masks by **attribute name**. The table of names is owned by `logging`, the same table used for logs | **Does not look at value contents.** It does not scrub inside URLs built by upstream or third parties. It works as long as things are carried by name; anything that is not means the original design is wrong |
| Error messages | `redactMessage()` in [`errors/redact.ts`](../../src/errors/redact.ts) replaces only **values the caller named** (tokens it holds, etc.) | Scanning exception text or stacks from the backend |
| Error `details` | Carries only identifiers that are safe to put on the wire ([`docs/rules.md`](../rules.md#data-classification)) | Propagating input values or reason text |
| Embedding structured data | [`components/design-system/display/json-ld`](../../src/components/design-system/display/json-ld/json-ld.tsx) escapes JSON's `<` to `\u003c` | — |

The last row looks like "sanitizing an upstream value", but it is not. **The script body is assembled by this layer itself**, and what is escaped is the serialization shape it produced. That the value comes from the backend and its contents cannot be assumed is the reason "this layer's output does not break even if `</script>` is inside" — not a purification of the value.

For the same reason, what this layer **verifies before carrying around** is the values it builds. For the return destination, `toSafeReturnUrl()` in `model/return-url` lets the URL parser resolve it and passes only same-origin relative paths, after which a brand type shows it is verified. For `searchParams`, `model/search-params` decides "the shape that arrives", and the reading side's schema decides what a correct value is. Cookies state their per-use attributes explicitly at the server boundary. All of these are cleanup by **the side that produces the value**.

**What looks like an exception is rich text.** This layer sanitizes HTML that came from upstream before rendering it. That is not a contradiction — what the sanitizer holds is not a list of "what upstream might send that is dangerous" (a blocklist) but a list of "**what this layer may render**" (an allowlist). As the next section shows, that is a presentation-side specification, not a response to upstream.

## Rich-Text Sanitization

### Path

[`src/model/rich-text/`](../../src/model/rich-text/) is a port that converts an unchecked HTML string into "a tree narrowed to only what may be displayed". There is exactly one construction path, `SanitizedRichText.from()`, and the type guarantees that any value of this type has gone through sanitization.

```text
HTML string
  → hast-util-from-html (parse5, parsed as a fragment)
  → hast-util-sanitize (RICH_TEXT_SANITIZE_SCHEMA)
  → dropProtocolRelativeUrls() (post-step)
  → SanitizedRichText (root: hast Root)
  → RichTextContent turns it into React elements with hast-util-to-jsx-runtime
```

There is no path back to an HTML string, and `RichTextContent` **removes `dangerouslySetInnerHTML` from its props by type**. Because it builds a tree with a spec-compliant parser and then checks the tree, it does not bring in, before and after the check, the parser interpretation gap that string-replacing sanitizers have (the sanitizer and the browser reading it differently).

### What the Schema Says

`RICH_TEXT_SANITIZE_SCHEMA` in [`rich-text.definition.ts`](../../src/model/rich-text/rich-text.definition.ts) **states every field of the schema explicitly**. `hast-util-sanitize` fills unspecified fields from its default schema, so without stating them, the pass-through range would widen silently when the upstream default widens.

- Nine block tags and six inline tags pass. `h1` does not pass, because a heading in the body would compete with the page's `h1`
- The only attribute is `href` on `a`. Neither `style` nor `class` passes — so "`style-src 'unsafe-inline'` for rich text" does not hold
- `href` protocols are `http` / `https` / `mailto`. Relative URLs remain
- `script` / `style` are removed **together with their content**. Other tags outside the allowlist are unwrapped with their content kept — only the tags whose text children would otherwise mix straight into the body are listed in `strip`
- Comments and doctypes are dropped. `li` remains only inside `ul` / `ol`

`hast-util-sanitize`'s protocol check only looks at the scheme of values containing `:`, so `//host` passes through as a relative reference. In reality it is an absolute URL to an external host resolved with the same protocol as the page being viewed, so `dropProtocolRelativeUrls()` drops it afterwards. The editor side's `isRichTextHrefAllowed()` holds the same check, so there is no inconsistency where something can be entered but is dropped after saving.

### Pairing with the Editor

Keep "the tags the editor can produce ⊆ the tags the sanitizer passes". The allowlist, the editor's extension set and the tests are one set; do not change just one of them. `RichTextEditor` installs extensions individually rather than a starter kit, and that set is derived from the allowlist.

### There Is No Limit

**The implementation has no limit on input size, node count or depth.** `SanitizedRichText.from()` parses the given string as is, and has neither a stage that cuts off by tree size nor a stage that rejects fail-closed when it is exceeded.

How far this matters is decided at the entry point. HTML received from a form through a Server Action is capped as part of the whole body by `serverActions.bodySizeLimit`, so input beyond that never reaches the sanitizer. HTML fetched from the backend and rendered has no limit before it. parse5 normalizes malformed nesting and unclosed tags rather than throwing, so it does not fail on anomalies other than size, but time and memory proportional to size are spent as is.

### Constraints

`SanitizedRichText` is a class instance and is not serializable. **It cannot be passed directly into a Client Component's props.** Extracting `root` lets you pass it, but at that point the type guarantee that it "has been sanitized" is lost. To place it inside a Client Component, pass the result rendered in a Server Component as `children`.

Tree-based sanitization is idempotent, so `RichTextContent` may run `SanitizedRichText.from()` on every display, and applying it twice does not corrupt the content.

## Common Pitfalls

### "Deployed a CSP" and "deployed a strict CSP" are different

`'unsafe-inline'` remains in `script-src`. It is a weak allowance for Next.js's own inline scripts, and it is also on DAST's known-gap list (`10055` in `.github/zap/rules.tsv`). The way to strict is either a nonce (every route becomes dynamic) or a hash (Next.js's experimental SRI), and either changes the current delivery model. "There is a CSP" is not grounds for not worrying about inline script injection.

### Adding a header in `proxy.ts` does not reach static responses

It only applies to paths that pass through the pre-handler. If you want to add a request-independent header, go to `security-headers.ts`. Conversely, `_next/image`, which `matcher` excludes, is served with the framework's `Cache-Control` (`public, max-age=...`) even for requests carrying cookies. **The moment a principal-specific image is put through `next/image`, that image is shared at the CDN.**

### Origin validation is not authentication

A request without `Origin` passes as same-origin. Non-browser clients and same-origin `GET` have no `Origin`; this is a check that stops CSRF (sending from another site **with the victim's browser carrying the victim's cookies**), not credential validation. Authorization is done separately by `verifySession()`. `Origin: null` (sandboxed iframes, across redirects) arrives as the string `"null"`, and `new URL()` rejects it, so it becomes untrusted.

### CORS opens only `/api/`

`fetch`-ing a screen path from a declared cross origin gets no CORS headers, and preflight passes through too. Read-only requests are not answered with 403, so it shows up as "it went through but cannot be read".

### Passing the optimistic check does not mean being authorized

`proxy.ts` only decrypts the cookie and looks at the role; whether that role is still correct is known only on the data-source side. A Server Action can be called after the screen has rendered without going through the screen, so call `verifySession()` **at every entry point**. Closing only one of them does not count as closed.

### `allowAnonymous: true` is not public

It is tempting to make a request that may be sent anonymously public, but if it goes through a connection point that can carry credentials, it is user-scoped, including the occasions it did not carry them. To put "what can be obtained even anonymously into a shared cache", the condition is **to fetch from a public connection point that does not carry credentials** — if the contract declares that operation `security: []` (no authentication required), take the public connection point.

### Taint does not apply to copies

What `readSessionRecord()` taints is the record reference itself. Neither `{ ...record }` nor `record.accessToken` is tainted. The primary guarantee is the promise that only the return value of `verifySession()` may be passed inward; taint is the aid for when that is bypassed. "Taint is on, so it is fine" does not hold.

### Passing a resolved value to `bearerToken` silently drops the defense

If you pass `getBearerToken` not an imported handle but a function built on the spot or a value carried around as an argument, `cookies()` is not read inside the cached scope and the framework's `next-request-in-use-cache` does not fire. There is no error, and **the principal's value enters the shared cache**. ESLint stops the shape, but turning the rule off stops nothing.

### `NEXT_PUBLIC_` is not swapped at startup

It is replaced with a literal at build time. Changing the PaaS environment variable has no effect without a rebuild. Conversely, dynamic access (`process.env[name]`) and destructuring defeat the replacement and yield `undefined`. Not validating on the client side is not a shortcut; only values that passed validation are substituted.

### Enabling the tag manager loses cross-origin isolation

A deployment with a container ID does not emit `Cross-Origin-Embedder-Policy`. Features that presume isolation, such as `SharedArrayBuffer`, cannot be used in that configuration. And the CSP on that side is not checked in a real browser in CI.

### There are two exceptions for `dangerouslySetInnerHTML`

`JsonLd` (embedding JSON as a script body) and `ChartStyle` (distributing series colors as CSS variables into `<style>`), both exempted from biome's `noDangerouslySetInnerHtml` with a reason. What they share is that **the content is this layer's own serialization or a developer constant**; user input and API responses are not passed there. A third one would have to take the same shape, and rich-text rendering is not among them.

### The development-only endpoints close when `APP_ENV` is unspecified

`isDevelopmentOnlyEndpointOpen()` is true only when `APP_ENV` is `local` / `ci`, and unspecified becomes false rather than falling to a default. The bundled secret values are rejected by the same check, so starting without `APP_ENV` stops startup itself before the endpoint even closes (either no env file can be selected or the bundled secret values are rejected). The development entry points (`pnpm dev` / `pnpm storybook`) have their scripts pass `local`. The destination (`Host`) check is not a line of defense; it only stops the path an ordinary user would ordinarily hit when something is published with a misconfiguration.

### `SanitizedRichText` cannot be passed to a Client Component

A class instance does not survive RSC serialization. Extracting `root` and passing it removes the sanitized guarantee from the type. To place body content inside a Client Component, pass the rendered result as `children`.

### The sanitizer has no size limit

As in the previous section. If you add a limit, place it at the entry of `SanitizedRichText.from()`, and make it **reject** when exceeded rather than empty the content — silently emptying it leaves no one able to see why the body disappeared.

## Related ADRs

- [0111](../adr/0111-csp-security-headers.md) — the CSP and its accompanying headers. The decision to make seam A (static) the default and the nonce opt-in
- [0112](../adr/0112-data-classification-cache-boundary.md) — the decision to have the fetch endpoint hold the classification, and the checkpoints at each stage
- [0030](../adr/0030-environment-variable-management.md) — the env validation point, the `NEXT_PUBLIC_` boundary, and the two-tier `server-only` + taint arrangement
- [0043](../adr/0043-middleware-policy.md) — `proxy.ts` is a thin last resort. Limited to optimistic checks; definitive authorization sits at the data boundary
- [0077](../adr/0077-bff-abuse-protection-boundary.md) — the decision to cut rate limiting / WAF out to the edge and leave only the minimal type-and-size defense in the app
- [0079](../adr/0079-auth-frontend-seam.md) — the pre-handler is not a line of defense. The definitive authorization side owns it
- [0113](../adr/0113-development-access-surface.md) — the development-only endpoints. Control surface and safety decided on separate axes
- [0080](../adr/0080-error-handling.md) — redacting errors that contain confidential information
- [0131](../adr/0131-cookie-consent.md) — placing third-party scripts behind the consent gate. Tied to the CSP's external origins
- [0110](../adr/0110-security-operations.md) — the CI-side checks (secret scanning, SAST, dependency audit, DAST). Not restated here
