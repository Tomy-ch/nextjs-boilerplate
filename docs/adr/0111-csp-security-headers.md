# CSP and Security Headers (Runtime)

Defines runtime browser-side defense — **the policy body of Content-Security-Policy (CSP) / the enforce seam / the default set of response security headers and where they are placed (`headers()` in `next.config.ts` vs `src/proxy.ts` vs PaaS/CDN)**. Whereas [0110](0110-security-operations.md) collects the defenses that can be paid for at CI / build time (supply chain, SAST, secret scanning), this ADR bundles into one the body of **defenses that can be paid for only at runtime (when responding to requests)**, gathering the starting point for local reasoning.

## Status

Accepted

## Context

CSP added later has the highest introduction cost because of collisions with existing inline scripts / styles, so settling the policy early is valuable. [0043](0043-middleware-policy.md) states only "headers can be manipulated in Proxy" and holds no policy body or placement policy.

Checking CSP conformance **can be paid for at CI time**, so it is owned by [0110](0110-security-operations.md), and this ADR owns only **the runtime body** — policy contents, seam and placement. The two work as a pair; neither side alone closes the loop.

This repository is **Next.js 16 / React 19**. The premises set by `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` are as follows.

- **Nonce-based CSP generates a nonce per request in `src/proxy.ts`**, and Next.js attaches it automatically during SSR to framework scripts, page JS, generated inline scripts and `<Script nonce>`
- **Using a nonce requires dynamic rendering for every page**. Static optimization, ISR and CDN caching are disabled, and it is **incompatible with Partial Prerendering (Cache Components)**
- **CSP without a nonce can be attached statically with `headers()` in `next.config.ts`**. Allowing Next.js's own inline scripts (the RSC payload's `self.__next_f.push`) requires `'unsafe-inline'`. The path to tightening while staying static is hash-based (experimental SRI)
- Static security headers can be attached declaratively with **`headers()` in `next.config.ts`**, independent of the rendering mode

## Decision

### 1. Positioning of standards conformance and no lock-in (applying [0010](0010-standards-and-non-lockin.md))

- CSP and each security header are **W3C / IETF Web platform standards** (CSP Level 3 / RFC 6797 HSTS / Referrer-Policy / Permissions-Policy / Cross-Origin-* isolation), and **the browser enforces them**. The seam (where headers are emitted) rides on the Next.js de facto standard (`headers()` in `next.config.ts` / header manipulation in `proxy.ts`) ([0010](0010-standards-and-non-lockin.md), [0043](0043-middleware-policy.md)), but **the substance of the defense does not depend on Next.js**.
- **Vendor-independent justification** (what a decision riding on a standard must always carry; [0010](0010-standards-and-non-lockin.md)): CSP = **defense in depth** against XSS, clickjacking and code injection (`script-src` narrows arbitrary script execution, `frame-ancestors` / `X-Frame-Options` narrow clickjacking, and `object-src 'none'` / `base-uri 'self'` narrow the injection surface) / HSTS = mitigation of man-in-the-middle and downgrade attacks / `X-Content-Type-Options: nosniff` = mitigation of XSS originating from MIME sniffing / `Referrer-Policy` = minimizing information leakage via the referrer / `Cross-Origin-Opener-Policy` + `Cross-Origin-Embedder-Policy` + `Cross-Origin-Resource-Policy` = closing context sharing with other origins and isolating from Spectre-class side channels. **Operational test (0010's no-lock-in test)**: "With Next.js removed from the justification, are these headers still valid?" → **Yes** (equally effective on any HTTP server or CDN).

### 2. Static headers laid down by default (independent of rendering mode; `headers()` in `next.config.ts`)

The following are **static headers that do not depend on request contents**, attached to every path with `headers()` in `next.config.ts`. Assembly is held by `src/config/security-headers/security-headers.ts`, and values that come from ENV are derived there from already-validated values. They are compatible with both static generation and SSR, and do not violate [0040](0040-routing-rendering-strategy.md)'s rule of not forcing a particular rendering mode.

| Header | Value | Notes |
| --- | --- | --- |
| `X-Frame-Options` | `DENY` | Doubled up with CSP `frame-ancestors 'none'`. Loosen if embedding is needed |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | The authentication round trip carries `code` / `id_token_hint` in the query ([0079](0079-auth-frontend-seam.md)). Only the origin is sent to other origins |
| `X-Content-Type-Options` | `nosniff` | |
| `Permissions-Policy` | `accelerometer` / `camera` / `geolocation` / `gyroscope` / `magnetometer` / `microphone` / `payment` / `usb` set to `()` | Minimal permission leaning deny-by-default. Open what you use. `payment` is closed on the premise that payment UI is not placed on the frontend ([0076](0076-payment-ui-seam.md)) |
| `Cross-Origin-Opener-Policy` | `same-origin` | Windows of other origins cannot touch this one via `opener`. Authentication round-trips by redirect, so no popup is needed |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Subresources from other origins cannot be loaded without `Cross-Origin-Resource-Policy`. **Images go through the `next/image` optimization path (same origin) and are unaffected.** Inserting an iframe / script from another origin comes with the decision to step down from this value |
| `Cross-Origin-Resource-Policy` | `same-origin` | Our responses cannot be embedded into documents of other origins. It applies only to `no-cors` loads (`<img>` / `<script>` / nested navigation) and does not apply to `fetch` opened with CORS in §5 |
| `Strict-Transport-Security` | `max-age=31536000` | **Emitted only when served over https** (below). One year is the same as the preload list's minimum. Adding `includeSubDomains` / `preload` and terminating on the PaaS/CDN side are **not defined here** (§5) |

**Whether it is served over https is decided by `isServedOverTls()` (`src/config/auth/auth.schema.ts`).** It reads the scheme of the callback URL (`AUTH_REDIRECT_URI`) — that is where the IdP sends the browser back, that is, our own origin, and it is the only existing value from which the scheme can be known without holding the kind of environment in a separate variable. It uses the same predicate as the cookie `secure` attribute ("app cookies carry their purpose in a prefix and state their attributes per purpose" in `docs/rules.md` *Data Classification and Sensitive Data*), so there are not two spellings.

### 3. CSP policy body (directive baseline)

The **directive baseline** of CSP is fixed as a decision of this ADR (following Next.js's official example; a concrete form of vendor-independent least privilege).

```text
default-src 'self';
script-src 'self' 'unsafe-inline';            ← add 'unsafe-eval' on the dev server only
style-src 'self' 'unsafe-inline';
img-src 'self' blob: <origin of MEDIA_ORIGIN>;
font-src 'self';
connect-src 'self' <origin of APP_API_BASE_URL>;
object-src 'none';
base-uri 'self';
form-action 'self' <origin of AUTH_ISSUER>;
frame-ancestors 'none';
upgrade-insecure-requests                      ← only when served over https
```

- **The delivery origin for `img-src` is assembled from validated ENV (`MEDIA_ORIGIN`).** Writing it here directly would let the environment variable and the setting move separately in two places, making it possible to fix only one. `blob:` is used by the preview before upload (`URL.createObjectURL`). `data:` has no place that uses it and is not included — add it if you adopt `placeholder="blur"`
- **`form-action` includes the IdP's origin.** Login starts with a form submission, and its response redirects to the IdP. Chromium applies `form-action` not only to the form's destination but also to redirects beyond it, so with `'self'` alone the authorization request stops
- **`'unsafe-eval'` is for the development server only.** React uses eval to reconstruct server-side error stacks in the browser. Neither production React nor Next.js uses eval
- **`upgrade-insecure-requests` only when served over https.** Emitting it in an http development environment rewrites even `http://localhost` subresources to https
- **`connect-src` adds only the backend's origin.** What the browser calls in round trips is limited to the BFF (`/api/*`), and observability signals also go through the relay seam ([0081](0081-observability-logging.md)). The browser is not allowed to call OTLP directly. The exception is subscriptions (long-lived connections): the BFF, which holds no long-lived connections, cannot relay them, and the browser opens them directly to the backend ([0074](0074-runtime-communication-seam.md)). **The subscription endpoint is assumed to be placed on the same origin as the API**, so the origin to add is the single one derived from the validated `APP_API_BASE_URL`, adding no input. If the subscription endpoint is placed on a different origin from the API, add an input for that origin here
- **External origins** (tag managers, analytics SDKs, etc.) are put on `script-src` / `connect-src` / `img-src` in conjunction with the consent gate of [0131](0131-cookie-consent.md). **The share for the bundled tag manager is declared by the core, and adding anything else is an extension point**. The third-party script convention is "third-party scripts sit behind the consent gate" in `docs/rules.md` *Security Controls*
- **`Cross-Origin-Embedder-Policy` is stepped down.** `require-corp` requires `Cross-Origin-Resource-Policy` or CORS on subresources, but the delivery origins of tags injected by the tag manager do not return them. **This is the result of accepting the loss of cross-origin isolation**, and features that assume isolation, such as `SharedArrayBuffer`, cannot be used in this configuration. If isolation is needed, empty the container ID and restore this header
- **`Content-Security-Policy-Report-Only` is not passed through.** Violations are detected by CI in a real browser (§6), so a phased introduction just for visibility is not needed. It is kept as a means for when you want to see collisions after adding external origins

### 4. Enforce seam = seam A (static, `next.config.ts`)

CSP is not "another domain's (infra / backend) responsibility" but **runtime defense emitted by the presentation layer**, so **two named extension points are laid down, with seam A as the default**.

- **Seam A (default, static) = non-nonce CSP in `headers()` of `next.config.ts`.** Inline is allowed by `'unsafe-inline'`. **It does not fix the rendering mode** ([0040](0040-routing-rendering-strategy.md)).
- **Seam B (opt-in, strict) = per-request nonce in `src/proxy.ts`.** It can lay down a strict CSP of `strict-dynamic` + nonce, but **fixes every page to dynamic rendering**, sacrificing static optimization, ISR, CDN caching and Cache Components. It is named as an extension point to **opt in to explicitly** when there is a strict threat model (a compliance requirement forbidding `'unsafe-inline'`).
- **Why seam A was settled on**: [0041](0041-cache-components-decision.md) adopts Cache Components, and nonces are incompatible with it. Making nonces the default would go against both [0040](0040-routing-rendering-strategy.md)'s rule of not forcing a mode and [0043](0043-middleware-policy.md)'s rule that Proxy is a thin last resort. The default leans to the **open** side, and tightening is left to choice.
- **`'unsafe-inline'` in `script-src` is a weak permission, not a strict CSP.** The path to tightening while staying static is not nonces but hash-based (Next.js's experimental SRI). Experimental features are not adopted ([0004](0004-library-management.md)). **Reversal condition**: once SRI becomes stable and Next.js's own inline scripts (RSC payload) can be allowed by hash, remove `'unsafe-inline'` while staying on seam A.
- **`style-src` is not split into `style-src-elem` / `style-src-attr`.** On the attribute side, Radix's popper (`position` / `transform` / `--radix-popper-*`) and `next/image` (`color: transparent`) write into elements' `style` attributes, so it cannot step down from `'unsafe-inline'`. The option of making only the element side strict gains little for its cost: `<style>` elements with dynamic content (the chart in `components` hands out series colours as CSS variables) and TipTap's runtime injection (`injectCSS`) cannot be allowed by hash, and Safari lacks the split directives and falls back to `style-src`. The rich text sanitizer does not let `style` attributes through (`src/model/rich-text`), so **"`'unsafe-inline'` for the sake of rich text" does not hold**. **Reversal condition**: once the chart moves its variables to elements' `style` attributes, TipTap is set to `injectCSS: false`, and the browsers supported by [0102](0102-browser-support.md) all have the split directives, narrow the element side to `'self'`.
- Even when seam B is adopted, the constraints of [0043](0043-middleware-policy.md) are kept: `proxy.ts` stays thin, limited to nonce generation and setting headers. Prefetches and static assets (`_next/static`, etc.) are excluded with `matcher`.

### 5. Division of header placement (`next.config.ts` vs `proxy.ts` vs PaaS)

| Header type | Default placement | Notes |
| --- | --- | --- |
| Static headers (§2) | `headers()` in `next.config.ts` | Request-independent. Declarative, no runtime cost |
| Non-nonce CSP (seam A) | `headers()` in `next.config.ts` | Static and CDN compatible (default) |
| Nonce CSP (seam B) | `src/proxy.ts` | Per request. Opt-in. Fixed to dynamic |
| **`Cache-Control` for requests carrying credentials** | **`src/proxy.ts`** | **Depends on the request** (below) |
| **`Access-Control-*` for allowed other origins** | **`src/proxy.ts`** | Depends on the request's `Origin`. Declared by `HTTP_ALLOWED_ORIGINS` (below) |
| **Origin verification (403 for writes from origins not allowed)** | **`src/proxy.ts`** | Reads the same declaration. "Verify the origin of requests that change state" in `docs/rules.md` *Authorization and Entry Points* |
| Enforcing HSTS at termination | **PaaS/CDN also allowed (boundary seam)** | Some configurations attach it in bulk at the edge. Check consistency of double application at delivery |

- **Headers that do not depend on the request are not added in `proxy.ts`.** They would land only on paths that go through the pre-filter, and responses that can be served statically would miss them.
- **Responses to requests carrying credentials get `Cache-Control: private, no-store`.** This is the substance of stage 5 (delivery) of [0112](0112-data-classification-cache-boundary.md): it stops, with a response header, the accident of a principal-bound response landing in the shared cache of a CDN / proxy and being served to another principal. **The decision is made on the request side** — a request carrying a session cookie is bound to a principal, whatever its response. It is not written per screen or Route Handler, and it reaches handlers that hold no declaration. The cost is that static screens for logged-in users are not shared on the CDN, which follows 0112's priority (confidentiality > cache efficiency). The `no-store` the framework attaches to dynamic responses is a decision inside the app and is not attached to responses frozen statically — when a principal-bound screen is frozen by mistake, only this stage takes effect. **Its reach is limited to the paths selected by the `matcher` of `proxy.ts`** — the excluded `_next/static` / `_next/image` / `favicon.ico` are served with the framework's own `Cache-Control` (`public, max-age=...` for image optimization) even for requests carrying cookies. This holds on the premise that only public images go through the image optimization path; if you put principal-specific images through `next/image`, revisit this exclusion or return `private` from the origin.
- **The endpoints opened to other origins are held in one declaration.** Only for origins listed in `HTTP_ALLOWED_ORIGINS` (`config/http`) does `src/proxy.ts` return `Access-Control-Allow-Origin` / `Access-Control-Allow-Credentials` / `Vary: Origin` on BFF (`/api/*`) responses and answer preflights with 204. Credentials are allowed because the BFF endpoints identify the principal by the session cookie, so `*` cannot be used. **The default is empty = same origin only**, and what the browser calls in round trips is limited to the BFF (§3 `connect-src`), so in this configuration there is no one to declare. When a frontend on another origin calls the BFF, declare that origin.
- **The same declaration decides the origins allowed to write.** Among requests that carry `Origin`, those using state-changing methods (other than `GET` / `HEAD` / `OPTIONS`) from an origin that is neither ourselves (host matching `X-Forwarded-Host` / `Host`) nor a declared origin are stopped with 403 before reaching the handler. **Whether it is ourselves is decided by host only, without comparing the scheme** — behind a reverse proxy that terminates TLS, the request we see is http while `Origin` arrives as https. For host, `X-Forwarded-Host` is read first, falling back to `Host` (the same order Next.js uses to check the origin of Server Actions). Declared other origins, on the other hand, require **an exact origin match**, treating a difference in any one of scheme, host or port as a different origin. Read-only requests are not stopped — no CORS headers are attached, so the browser cannot read the response. Making "who may read" and "who may write" separate declarations would allow a state where only one is opened. For Server Actions, Next.js itself matches `Origin` against `Host`, and only deployments where a reverse proxy rewrites Host need `serverActions.allowedOrigins`. The decision is held by `src/model/cross-origin.ts`.
- **Attaching on the PaaS/CDN is accepted as a "boundary seam"** (configurations that terminate HSTS and some static headers in the delivery layer are realistic). `next.config.ts` is the SSOT, but **not duplicating or contradicting the PaaS side** is checked at deployment (avoiding double attachment of the same header).

### 6. The CI conformance slice is owned by 0110 (this ADR is the runtime body)

- **The presence and validity of delivered headers are checked by DAST (OWASP ZAP baseline)** ([0110](0110-security-operations.md)). What it reads is the response, not the artifacts; what `next.config.ts` declared and what the browser actually receives are separate facts.
- **Violation detection is held by the E2E watch** (`e2e/lib/test.ts`). The browser itself writes CSP violations to the console, so they are not caught by the ordinary console watch; they are received and counted through the `securitypolicyviolation` event. It applies to every spec and all three rendering engines. That enforcement is in effect is shown by inserting a script from an origin not in the declaration and having a violation reported (`e2e/journeys/csp.spec.ts`). Loosening to `Report-Only` passes checks that only read headers, but not this spec.
- Changes to `next.config.ts` and `src/config/security-headers/` name `run-e2e` (`scripts/deferred-checks/recommend.ts`).

## Prohibitions

- ❌ Making nonce-based CSP (`proxy.ts`) the **default** (it fixes every path to dynamic, against [0040](0040-routing-rendering-strategy.md)'s non-forcing of modes and [0041](0041-cache-components-decision.md); tightening is opt-in = seam B) (Enforcement: Prose — **mechanizable** (a gate rejecting `src/proxy.ts` spelling `Content-Security-Policy` or generating a nonce, removed when opting in to seam B; no rule exists))
- ❌ Justifying CSP and security headers only by "because Next.js recommends it" ([0010](0010-standards-and-non-lockin.md)) (Enforcement: Prose — **not mechanizable**. The grounds of a justification are the document's argument and do not appear in code)
- ❌ Inventing or neutralizing the shape of the seam (how nonces are carried, header placement) on our own ([0010](0010-standards-and-non-lockin.md); ride on the Next.js de facto standard = `headers()` / `proxy.ts`) (Enforcement: Prose — **not mechanizable**. Whether the seam's shape is our own invention is a design judgment, not determined by the shape of the code)
- ❌ Writing business logic other than nonce generation and header setting in `proxy.ts` (the thin boundary of [0043](0043-middleware-policy.md)) (Enforcement: Prose — **not mechanizable**. What is business logic is a judgment of the layer's responsibility, not determined by the shape of the code)
- ❌ Placing headers that do not depend on the request in `proxy.ts` (responses that can be served statically miss them) (Enforcement: Prose — **partly mechanizable**. `src/proxy.ts` spelling the static header names of §2 can be detected statically, but no rule exists. Whether an arbitrary header depends on the request is decided by the meaning of the implementation)
- ❌ Silently omitting CSP as "another domain's responsibility" (it is the presentation layer's runtime defense; lay down seams A/B by name)
- ❌ Claiming "we laid down a strict CSP" while leaving `'unsafe-inline'` in `script-src` / `style-src` (state the weak permission explicitly; to claim strict, move to nonces or SRI) (Enforcement: Prose — **not mechanizable**. Claiming "we laid down a strict CSP" is an assertion in documents or explanations and does not appear in code)
- ❌ Writing delivery origins (`MEDIA_ORIGIN` / `AUTH_ISSUER`) directly into CSP (assemble them from validated ENV) (Enforcement: `src/config/security-headers/security-headers.test.ts` (checks that delivery origins differing per environment map into img-src / form-action))
- ❌ Writing `Cache-Control` for principal-bound responses per screen or handler (`proxy.ts` attaches it uniformly on the request side)
- ❌ `Access-Control-Allow-Origin: *`, or holding CORS permission and write permission in separate declarations (§5) (Enforcement: `src/proxy.test.ts` rejects unless CORS headers are returned only to declared origins. Splitting CORS and write permission into separate declarations is Prose — **not mechanizable**. Whether there is one declaration is decided by the meaning of the settings)
- ❌ Writing CORS headers or origin verification per Route Handler (`proxy.ts` attaches them uniformly from the declaration)

## Notes

- **CSRF / origin verification for Server Actions** (`serverActions.allowedOrigins` / the SameSite cookie premise) is placed in **"verify the origin of requests that change state" in `docs/rules.md` *Authorization and Entry Points* (primary Rationale [0070](0070-backend-role-separation.md))**, and is **not housed together** in this ADR. This ADR limits its reach to the runtime body of CSP and response headers.
- Under the taxonomy of [0140](0140-documentation-operations.md), this ADR belongs to the **decision** classification. The rules enforced day to day ("third-party scripts sit behind the consent gate", "`dangerouslySetInnerHTML` is forbidden in principle", etc. in *Security Controls*) are placed in `docs/rules.md`, which references this ADR back as their Rationale.

## Related ADRs

- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance (the seam rides on the Next.js de facto standard) + no-lock-in justification (vendor-independent material is mandatory). This ADR's axis of judgment
- [0110-security-operations.md](0110-security-operations.md) — defenses at CI / build time (shift-left). Holds the CI gate for CSP conformance (§3.5)
- [0112-data-classification-cache-boundary.md](0112-data-classification-cache-boundary.md) — data classification and the cache boundary. §5 of this ADR holds the substance of stage 5 (delivery)
- [0043-middleware-policy.md](0043-middleware-policy.md) — `proxy.ts` = a thin last resort. Implementation constraints for seam B and `Cache-Control`
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — not forcing a rendering mode. Grounds for not making nonce CSP the default
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — Cache Components is adopted. Grounds for settling on seam A, since it is incompatible with nonces
- [0076-payment-ui-seam.md](0076-payment-ui-seam.md) — payment UI is not placed on the frontend. The premise for `payment` in `Permissions-Policy` and for `Cross-Origin-Embedder-Policy`
- [0131-cookie-consent.md](0131-cookie-consent.md) — consent gate (tied to the CSP allowlist for external scripts)
- [0074-runtime-communication-seam.md](0074-runtime-communication-seam.md) — the browser opens subscriptions directly to the backend. Why the backend's origin is added to `connect-src`
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — primary Rationale for CSRF / origin verification ("verify the origin of requests that change state" in `docs/rules.md` *Authorization and Entry Points*) (not housed together in this ADR)
