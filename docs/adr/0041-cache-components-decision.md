# Decision on Enabling Cache Components (PPR)

This ADR decides whether to adopt `Cache Components` (making PPR the default = `cacheComponents: true` in `next.config.ts`), under the standards-conformance and non-lock-in decision axis of [0010](0010-standards-and-non-lockin.md). The choice of rendering mode is held by [0040](0040-routing-rendering-strategy.md), caching and revalidation of data fetching by [0071](0071-bff-api-integration.md), placement of Suspense boundaries by the same [0040](0040-routing-rendering-strategy.md), and the loading UI by [0080](0080-error-handling.md); on top of those, this ADR holds only one point: **whether to adopt PPR**.

## Status

Accepted

## Context

This decision intersects with the caching design of data fetching ([0071](0071-bff-api-integration.md)), env freezing during prerendering ([0030](0030-environment-variable-management.md)) and the placement of Suspense boundaries ([0040](0040-routing-rendering-strategy.md)). All of them are settled, so this ADR deals only with adoption.

Verification (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`): `cacheComponents` was introduced in 16.0.0 and is a setting that **unifies** the earlier `ppr` / `useCache` / `dynamicIO` **into one**. When enabled, data fetching is excluded from prerendering unless explicitly marked `use cache`, and placing `use cache` at page / function / component granularity becomes the working premise. Furthermore, when enabled, client-side navigation uses React `<Activity>` to **preserve state** without unmounting the old route (the navigation semantics themselves change).

## Decision

### Adopt Cache Components (PPR) (`cacheComponents: true`)

- **Enable it.** [0040](0040-routing-rendering-strategy.md) holds only that no mode is enforced and delegates the enabling decision to this ADR. This ADR settles it as "adopted".
- **The basis is measurement.** Dropping the two fetches that read cookies in the layout shell's layout (per-user state and the session) into a `<Suspense>` dynamic hole puts 8 screens — including screens with only static body text and screens that look up one item by identifier — **into partial prerendering**. The static shell of a screen with no fetch is 12.4 KB of HTML including header, nav, footer and body, and **can be served without going to the backend even once**. Without this split, the same screen waits for the two round trips the layout shell reads before returning its first byte. **The entry-point screens fall into this shape with no additional splitting** — because they are written with the heading outside `Suspense` and the fetch inside.
- **The cost of waiting is real.** The static-shell / dynamic-hole split and the granularity of `use cache` are the structure of the route itself; adding them later means writing the same screen twice.
- **The precondition for enabling it is [0112](0112-data-classification-cache-boundary.md)**'s data classification and cache boundary. PPR is the mechanism that decides "what goes into the static shell", and **enabling it with no classification opens only the surface for accidents first**.
- **PPR is treated as a performance optimization for public data.** For user-scoped values, confidentiality takes priority over the benefit of shared / static caching ([0112](0112-data-classification-cache-boundary.md) invariants 1 / 2).
- **The shape of the layout shell becomes the very split between static shell and dynamic hole**, and the following take effect as implementation practice.
  - **A screen does not declare the mode it renders in.** Segment config does not coexist. `params` / `searchParams` / cookies / authorization decisions / the real clock are all resolved inside the dynamic hole (the real clock is additionally read only after awaiting `connection()`)
  - **Only a screen that cannot serve a static shell names itself with `export const instant = false`, with a reason.** Declaration and reality are cross-checked by `scripts/render-mode` against `compute` in `prerender-manifest.json`, looking both at routes that block without a declaration and at routes with a surplus declaration
  - **Client components that read the current location also need a dynamic hole.** `usePathname` / `useSearchParams` cannot be resolved in the static shell of a route that has dynamic segments
  - **An area whose static shell cannot be served because of authorization names itself as a whole area.** Dropping the decision into a dynamic hole means that surface's static shell is served to anyone before the check ([0079](0079-auth-frontend-seam.md))
  - **That a primary resource is not found is conveyed with a 200.** By the time the static shell starts streaming, the headers have gone out as 200, and reaching `notFound()` / `redirect()` afterwards cannot change the status. `instant = false` does not change this either — when enabled, a dynamic route always streams from a static shell. Not-found is conveyed by `noindex` and the not-found screen ([0080](0080-error-handling.md))
- **Costs accepted** (arising from adoption and not going away):
  - **Reduced reversibility**: disabled → enabled is a forward migration that adds `use cache`, but returning to disabled a tree written on the enabled premise (the static-shell / dynamic-hole split, the granularity of `use cache`) means rewriting. Adoption accepts this.
  - **The core holds the skeleton of the caching design**: "what to `use cache`, at what granularity" is an area where [0071](0071-bff-api-integration.md) leaves concrete values open. **The concrete values stay open; the core decides only the skeleton of where lifetimes are placed**.
  - **Losing the status that signals an absent primary resource**: `notFound()` / `redirect()` are reached after the static shell has streamed, so the response stays 200 and falls back to a `noindex` meta tag and meta refresh. `noindex` prevents indexing, but **monitoring, DAST and non-JS clients that judge by status cannot distinguish it from success**. The workaround Next itself recommends is a prior check in `proxy`, but that contradicts [0043](0043-middleware-policy.md) (pre-processing that only reads cookies) and [0079](0079-auth-frontend-seam.md) (not a line of defense), so it is not taken. This cost is accepted ([0080](0080-error-handling.md)).
  - **Building requires reachability of the backend**: an endpoint that has `use cache` is also called during the build to produce the cache contents. In an environment that cannot reach the fetch target, the build fails — it would not fail if every fetch lived in a dynamic hole. **In a setup that ships the frontend and the backend separately ([0011](0011-no-docker.md)), whether the place that runs the build can reach the fetch target becomes a premise**. With `APP_API_MODE=mock`, `pnpm build` is self-sufficient by standing up the handlers generated from the contract as an HTTP endpoint — prerendering runs in a separate worker process, so in-process interception (`src/instrumentation.ts` / `next.config.ts`) does not reach it (both confirmed by measurement). This is accepted in exchange for fewer request-time round trips ([0071](0071-bff-api-integration.md)).
  - **Cache persistence depends on the deployment target**: the default store of `use cache` is process memory and does not span deployments (the key includes the build ID). The deployment targets [0011](0011-no-docker.md) lists are all on the serverless side, so **request-time reuse happens on some occasions and not on others**. What reliably remains is only what was baked into the static shell at build time, and this is what is lost relative to the `fetch` Data Cache (which survives across deployments and instances). The means to make up for it (`cacheHandlers` / `use cache: remote`) depend on the deployment target, so the core does not choose one ([0010](0010-standards-and-non-lockin.md)).
  - **Changed navigation semantics**: client-side navigation of every route changes to state-preserving behavior via `<Activity>` (the previous route is hidden rather than unmounted). The effect on dropdowns / dialogs / list position restoration is checked with E2E and VRT.
- **The caching model after enabling** is governed by `use cache` + `cacheLife` / `cacheTag`. The owning layer of cache directives (`adapters` / the calling RSC), tag naming, the shape of profiles (no `expire` on the profile of fetches that land in the static shell, so refetching happens in the background) and the convention for revalidating after mutations are governed by [0071](0071-bff-api-integration.md)'s caching and revalidation design, and **user-scoped values are uncached by default per [0112](0112-data-classification-cache-boundary.md)**.

## Prohibitions

- ❌ Enabling it without [0112](0112-data-classification-cache-boundary.md)'s classification and cache boundary in place (Enforcement: Prose — **not mechanizable**. It is a judgment about the order of enabling and classifying, and does not appear in the code after enabling)
- ❌ Putting user-scoped values into the static shell or a shared cache on the grounds of cache hit rate or PPR coverage ([0112](0112-data-classification-cache-boundary.md))
- ❌ Using `export const instant = false` as a means of returning the response status to 404 / 3xx (it does not return; when enabled, a dynamic route always streams from a static shell) (Enforcement: Prose — **not mechanizable**. The motive for naming `instant = false` appears only in the reason text and is not decided by the shape of the declaration)

## Notes

- In the taxonomy of [0140](0140-documentation-operations.md), this ADR belongs to the **decision** class.
- The granularity of `use cache` is held by [0071](0071-bff-api-integration.md)'s caching section, consistency with [0030](0030-environment-variable-management.md)'s env freezing during prerendering by that same ADR, the position of `<Suspense>` boundaries that split static shell / dynamic hole by [0040](0040-routing-rendering-strategy.md), and the status of responses streamed from a static shell by [0080](0080-error-handling.md).
- The data-fetching boundary of pagination / infinite scroll is outside this ADR's scope and is owned by [0073](0073-pagination-fetch-boundary.md). The caching model that infinite scroll's initial RSC fetch relies on follows what this ADR settles.

## Related ADRs

- [0073-pagination-fetch-boundary.md](0073-pagination-fetch-boundary.md) — the data-fetching boundary of pagination / infinite scroll (rides on this ADR's caching model)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — no rendering mode enforced (this ADR settles the adoption of `Cache Components`) / the position and granularity of `<Suspense>` boundaries
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — caching and revalidation of data fetching (uncached by default, opt-in, owning layer, profiles)
- [0112-data-classification-cache-boundary.md](0112-data-classification-cache-boundary.md) — data classification and cache boundary (the precondition for this ADR's enabling)
- [0080-error-handling.md](0080-error-handling.md) — the status of responses streamed from a static shell, and the loading UI of fallbacks
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — env freezing during prerendering (intersection with the Cache Components decision)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the standards-conformance and non-lock-in decision axis (the basis of this ADR's vendor-independent justification)
