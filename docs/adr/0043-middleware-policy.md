# Middleware (Proxy) Policy

This ADR defines **the scope of responsibility / runtime policy / where the authentication hook goes / pre-processing for suspending service** of **`proxy.ts`, which Next.js 16 renamed from Middleware to Proxy**.

## Status

Accepted

## Context

This repository adopts **Next.js 16**, and **in Next.js 16 Middleware was renamed to "Proxy"** (file convention = `proxy.ts`; `middleware.ts` is deprecated; a migration codemod `middleware-to-proxy` exists). Having checked `node_modules/next/dist/docs/` before implementation, the following are taken as premises (AGENTS.md "Canonical Documentation"):

- `proxy.ts` runs on the server before a request completes and can rewrite / redirect / change headers and cookies / respond directly
- **The Next.js docs state explicitly that "Proxy is a last resort; use it when there is no other means"**. It is **not used for session management or full authorization**, and is limited to `optimistic checks` (permission-based redirects, etc.)
- **Do not use it for slow data fetching** (`fetch` cache options are disabled inside Proxy). When optimized it is placed on the CDN, so it does not depend on shared modules or globals
- **The default runtime is Node.js** (the "Runtime" section of proxy.md). The `runtime` segment config option is **not available** in the Proxy file (setting it is an error). In other words there is no slot for choosing the runtime in code, and the actual execution environment depends on the deployment target (adapter) (the old Middleware's "Edge by default" does not apply to Proxy)
- **One `proxy.ts` per project** (the logic may be split into modules and imported)

## Decision

### 1. `proxy.ts` = a thin boundary (thin, last resort)

- **`proxy.ts` is limited to a thin boundary**. Its uses are rewrite / redirect / header and cookie operations / optimistic permission redirects. **Do not write business logic, heavy processing or data fetching in it** (consistent with [0011](0011-no-docker.md) thin proxy / [0070](0070-backend-role-separation.md); also matches the Next.js "last resort" guidance)
- **First consider whether it can be solved outside `proxy.ts`** (`redirects` in `next.config.ts` for simple redirects, checks at each boundary for authorization). Proxy is the last resort when there is no alternative
- The file is **`src/proxy.ts`** (at the same level as `src/app/`). It is a startup / boundary entry **outside** the 11 kernels (in the same category as `instrumentation.ts`, following the startup / build boundary exception of [0021](0021-frontend-responsibility.md)), not `app` (route / page)

### 2. Runtime policy (Node.js by default, Edge compatibility kept)

- **The Next.js 16 Proxy runs on the Node.js runtime by default**, and the `runtime` segment config is not available in the Proxy file (setting it is an error). The runtime is not something chosen in code; the actual execution environment depends on the deployment target (adapter). This repository does not enforce a particular deployment target or runtime premise ([0011](0011-no-docker.md))
- However, in optimized deployments Proxy **may be placed on the CDN (Edge-equivalent)**, so the default is that `proxy.ts` code **stays Edge Runtime compatible (independent of Node APIs and shared globals)**. **The import graph reachable from `proxy.ts` contains no Node APIs and no `dotenv`.** When config is referenced, the reachable config stops at `environment.ts` → `application-environment.ts` and does not reach the module that reads ENV files (`load-environment.ts`). Reading ENV files has already been done by the startup / build boundary ([0030](0030-environment-variable-management.md)). Config follows the import boundaries, and Proxy too keeps [0030](0030-environment-variable-management.md)'s client/server split and immutable Config

### 3. Where the authentication hook goes = use-case dependent

- **The concrete model of authentication and sessions is use-case dependent** ([0070](0070-backend-role-separation.md); the Next.js docs also state explicitly "do not use Proxy for session management or authorization"). This repository builds no particular authentication implementation into `proxy.ts`
- When authentication is introduced, what `proxy.ts` may do stops at **optimistic redirects** (redirecting requests that look unauthenticated, etc.), and **definitive authorization is done at the data boundary (`adapters` / Route Handler / Server Action)** ([0070](0070-backend-role-separation.md) / [0071](0071-bff-api-integration.md))

### 4. Division of verification (function body = unit / matcher selection = e2e)

- **The body of `proxy()` is `unit`**. Branching, redirect targets and the assembly of `returnUrl` can be exercised by calling it as a function ([0090](0090-testing-strategy.md))
- **Under-selection by the `matcher` of `export const config` is borne by `e2e`**. `matcher` is a declaration Next.js reads before it selects a route, and it does not pass through the path that calls `proxy()` directly. If a prefix that must be protected slips out of the selection, the pre-processing is bypassed wholesale, and that shows up in the response when the route is opened
- **Over-selection cannot be observed by any test**. Even if an excluded prefix is included in the selection, `proxy()` requires no role for that route and lets it through, so the response does not change. It appears only as a cost per static asset. What guards this is reading the declaration against each other, not a test

### 5. Suspend service in `proxy.ts` pre-processing; the suspension screen responds with 200

- While service is suspended, reads (GET / HEAD) are **replaced with the suspension screen by rewrite**, and proxy itself refuses other requests with **503**. The URL does not move — opening the same URL after recovery returns to the original screen. The suspension check is placed before authorization. Suspending is a single decision over every route, and how it looks must not vary by route
- **The response that renders the suspension screen is 200.** A status put on a rewrite is not read. This is not a judgment that "503 is unnecessary" but that **the presentation layer has no means to return 503**. If proxy assembled the whole HTML itself it could return 503, but that screen would not ride on the design system — a screen is not thrown away for the sake of a status. In deployments that want to tell machines the service is suspended, **the serving surface (CDN / load balancer) stands in front** (the division of roles in [0011](0011-no-docker.md)). Suspending there means requests never reach Next.js, so it does not conflict with this mechanism
- **Do not add `Retry-After`** (even when it could be returned). There is no endpoint that supplies the planned end time, so it would carry a baseless value

## Prohibitions

- ❌ Writing business logic, heavy processing or data fetching in `proxy.ts` (a thin boundary; last resort) (Enforcement: ESLint `boundaries/dependencies` (`proxy` in `ENTRY_POINTS` of `architecture.ts`) rejects imports of fetch endpoints (`adapters`) and features. A direct `fetch`, and whether written processing is business logic or heavy, are Prose — **not mechanizable**. The meaning and weight of processing are not decided by the shape of the code)
- ❌ Making `proxy.ts` the main mechanism of session management or definitive authorization (optimistic checks only; authorization at the data boundary) (Enforcement: Prose — **not mechanizable**. Whether a check is optimistic or definitive is decided by the meaning of what it is used as grounds for)
- ❌ Newly creating the deprecated `middleware.ts` (Next.js 16 uses `proxy.ts`) (Enforcement: ESLint `boundaries/no-unknown-files` (`src/middleware.ts` belongs to no element, so it fails))
- ❌ Depending on shared modules, global state or Node APIs in Proxy, and including Node APIs or `dotenv` in the import graph reachable from `proxy.ts` (it may be placed on the CDN; keep Edge compatibility) (Enforcement: `scripts/proxy-edge.gate.test.ts` checks that no Node API and no `dotenv` appear in the import graph reachable from `proxy.ts`. ESLint `no-restricted-syntax` / `no-restricted-imports` (rejecting `process` and `node:*` outside `NODE_RUNTIME_ACCESS`) rejects the individual-file side. Dependence on shared modules and global state is Prose — **not mechanizable**. Whether something is shared is decided by runtime placement)
- ❌ Writing the `runtime` segment config in `proxy.ts` (not available in the Next.js 16 Proxy; it is an error)
- ❌ Enforcing a particular authentication implementation or deployment-target runtime premise in this repository (authentication is use-case dependent; the runtime depends on the deployment target) (Enforcement: none — a decision not to adopt. Not having a particular authentication implementation or runtime premise built into `proxy.ts` is itself the state)
- ❌ Having proxy assemble the core's HTML for the suspension screen, and adding a baseless `Retry-After` (§5) (Enforcement: `src/proxy.test.ts` pins that reads during suspension are replaced by rewrite. Not adding `Retry-After` is Prose — **mechanizable** (the form where the same test checks that a 503 response has no `Retry-After`; no check exists))

## Related ADRs

- [0070-backend-role-separation.md](0070-backend-role-separation.md) — thin proxy / authentication is use-case dependent / definitive authorization at the data boundary
- [0079-auth-frontend-seam.md](0079-auth-frontend-seam.md) — pre-processing is not a line of defense (held by the definitive-authorization side)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — App Router / the driving-adapter principle
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — the range of config reachable from proxy (`environment.ts` → `application-environment.ts`; the intersection with this ADR)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `proxy.ts` as a startup / boundary entry (outside the 11 kernels)
- [0011-no-docker.md](0011-no-docker.md) — division of roles with the serving surface (CDN / load balancer) (the side that tells machines about the suspension)
- [0121-i18n-strategy.md](0121-i18n-strategy.md) — the locale-detection seam (if adopted, when Proxy is used)
