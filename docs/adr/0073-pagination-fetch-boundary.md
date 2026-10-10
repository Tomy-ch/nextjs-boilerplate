# Data-Fetching Boundary for Pagination and Infinite Scroll

This ADR defines the data-fetching boundary for **pagination / infinite scroll** on list screens. [0040](0040-routing-rendering-strategy.md) holds only "no rendering mode is enforced"; the caching design of data fetching is held by [0071](0071-bff-api-integration.md), the placement of Suspense boundaries by the same [0040](0040-routing-rendering-strategy.md), and the loading UI of `loading.tsx` by [0080](0080-error-handling.md). On top of that, the additional client fetching that infinite scroll inevitably brings is in direct tension with [0060](0060-state-management.md)'s "Server state = RSC fetch by default / client-side data fetching is not presupposed in the core", and is not covered by [0071](0071-bff-api-integration.md)'s fetch wrapper either (resilience applies mainly to `adapters/server` = server premise). This ADR makes explicit the owner of this fetching boundary and settles it under [0010](0010-standards-and-non-lockin.md)'s standards-conformance and non-lock-in decision axis.

## Status

Accepted

## Context

How the UI side handles paging and infinite scroll on list screens (offset vs cursor, how page state is represented, whether additional client fetching is allowed) gets invented per feature unless an owner is made explicit. Infinite scroll in particular inevitably involves `IntersectionObserver` + client fetch, in tension with [0060](0060-state-management.md)'s default. In addition, that client fetch path is not covered by [0071](0071-bff-api-integration.md)'s fetch wrapper (server premise), and with no owner, raw `fetch` scatters across components. This ADR keeps most lists inside the RSC-driven default, and places only the incremental fetching of infinite scroll as a limited exception with an owner.

## Decision

### 1. Pagination is cursor by default, page state is searchParams (RSC-driven = inside 0060)

- **Cursor pagination is the default**. Offset is allowed only for "a small, stable set" or when "jumping to a page number is a requirement".
  - **Vendor-independent justification**: cursor is stable against inserts / deletes in the data (rows are not skipped or duplicated even if boundaries shift), whereas offset shifts page boundaries on inserts / deletes. This is a general property of data consistency, a basis independent of Next.js.
- **A cursor can move only one page forward or back at a time**. A cursor is an opaque value pointing at "the next position" and does not express a way to jump to an arbitrary position. **The URL remembers where to go back to** — a cursor points only at the next position, so if something other than the URL holds the starting points of pages already passed, there is no going back.
- **Page state (current page / cursor) is expressed in searchParams** (riding on [0060](0060-state-management.md)'s "URL state uses Next.js's standard mechanisms"). Bookmarks, sharing and the back action restore correctly.
- **When the conditions change, the position read so far is discarded.** When filters or sort order change, the page position (page / cursor) is not carried over. A position partway through the previous conditions points somewhere else under the new conditions. That a position loses its meaning when the population changes is a property of paging, not of the business, and it applies the same way to every list.
- Paging (previous / next) uses **the default path where searchParams drive an RSC refetch**. This is **inside** 0060's "Server state = Server Component fetch by default" and needs no exception. Therefore **most lists work without additional client fetching**.

### 2. Additional client fetching for infinite scroll is a limited, explicit exception, owned by `adapters/client`

- Infinite scroll (detecting reaching the end with `IntersectionObserver` + additional fetching) inevitably involves client fetching, so it is treated as **an explicit, limited exception** to [0060](0060-state-management.md)'s default "client-side data fetching is not presupposed in the core". The exception is kept narrow:
  - **The first page is fetched by RSC** (§1). Client fetching is limited to **only the incremental fetching** of "show more".
  - **Owner = `adapters/client`**: additional client fetching does not scatter raw `fetch` across components and always goes **through `adapters/client` ([0024](0024-adapters-server-client-split.md) = the owning boundary of client-side remote IO; mainly same-origin BFF fetch, and the same layer also owns sends outside the same origin that an ADR explicitly allows)**. Resilience (dual timeout / retry / breaker) is held by the server side = `adapters/server` ([0071](0071-bff-api-integration.md)), and this ADR's additional client fetching stays a thin fetch to the same origin (`/api/*` BFF / Route Handler). This **makes explicit the owner of the client path that the 0071 wrapper, on its server premise, does not cover**.
  - **The trigger hook** (a reactive client hook that detects reaching the end) is **feature-local** by default (from [0060](0060-state-management.md) client state = local). The moment cross-cutting use across several features arises, it is **promoted to the `capabilities` kernel ([0022](0022-capabilities-kernel.md))** (the promotion rule of [0021](0021-frontend-responsibility.md)).
  - **Priority on URL restorability**: wherever possible, prefer a searchParams-driven "show more" button (RSC refetch), and limit true infinite scroll to places that perceptibly need it. Even when infinite scroll is adopted, write the number of items read so far back to the URL, keeping the current cursor restorable from the URL / state. Without writing back, both the back action and a reload return to a screen with only the first page, losing what was read along with the scroll position. What can be restored goes up to the item limit the contract accepts, and writing back does not push history (the back action exits to the screen before the list).
- Responses of additional client fetches also go through **runtime validation and error normalization at the `adapters` boundary** ([0071](0071-bff-api-integration.md) / [0080](0080-error-handling.md)). The principle of not leaking raw status or raw errors to the UI is the same on the client path.
- **The decision to discard what has accumulated is not held by the fetching hook.** Whether it has become a different list is expressed by the placing side
  with a React key, letting the framework rebuild it. If the hook watches for the first page being swapped, it rolls back even when the content
  is the same and it was merely rebuilt (when the server returned the same result again), losing what was read and
  the scroll position. **Watching by referential identity is especially wrong: since the server builds a new value every time, it
  is always true.**
- **Expired credentials are not treated as "a failure to fetch the continuation".** In a list behind authentication, the session can expire while the user is
  reading. Folding this into the same state as a retryable failure leaves the screen able to offer only
  a re-read action, and since pressing it follows the same path, the user cannot get out. **Where to send the user when unauthenticated
  is already held by the route's definitive authorization ([0079](0079-auth-frontend-seam.md)),
  so ask the server to re-render and defer to that decision** (`router.refresh()`). Deciding the destination here would
  multiply the same decision into two places.
- **No data-fetching library (TanStack Query, etc.) is bundled** (does not break [0060](0060-state-management.md)'s exclusion). The state of incremental fetching stays within what local state / a thin call site in `adapters/client` can cover.

## Prohibitions

- ❌ Confining page state (current page / cursor) to something other than searchParams (component state only, etc.), making it unrestorable through bookmarks, sharing and the back action (§1)
- ❌ Casually making offset pagination the default for data where inserts / deletes happen (cursor by default; offset only under limited conditions) (Enforcement: Prose — **not mechanizable**. Whether inserts and deletes happen in the data is decided by the nature of the contract and the data, not by the shape of the code)
- ❌ Carrying the page position over when filters or sort order change (§1; a position under the previous conditions points somewhere else under the new ones) (Enforcement: Prose — **not mechanizable**. Which keys are positions and which are conditions is decided by each list's meaning and is visible only in per-list tests)
- ❌ Writing the client fetch for infinite scroll / additional fetching **directly in components with raw `fetch`** (always through `adapters/client`; §2 / [0024](0024-adapters-server-client-split.md)) (Enforcement: Prose — **mechanizable** (calls to `fetch` outside `adapters` could be rejected with the same `no-restricted-syntax` as the subscription `SUBSCRIPTION_CONSTRUCTION_SELECTOR`; no rule exists))
- ❌ Implementing resilience (timeout / retry / breaker) for additional client fetches **on our own on the client side** (resilience is held by the server = `adapters/server`; the client is a thin same-origin fetch) (Enforcement: Prose — **not mechanizable**. Whether it carries its own cutoffs or retries is decided by the meaning of the control flow, not by shape)
- ❌ Passing responses of additional client fetches to the UI without validation and normalization (the boundary principles of [0071](0071-bff-api-integration.md) / [0080](0080-error-handling.md) also apply to the client path) (Enforcement: types (`request` in `src/adapters/client/http/request.ts` takes `schema` as a required argument) and `request.test.ts` (rejecting responses that differ from the contract as internal). Raw `fetch` that does not go through the wrapper is Prose — **mechanizable** (no rule rejects `fetch` outside `adapters`))
- ❌ An incremental-fetching hook watching for the first page being swapped and discarding what has accumulated (§2; it is held by the placing side's key) (Enforcement: Prose — **not mechanizable**. Whether it watches is decided by the meaning of the effect's dependencies and is visible only in per-hook tests)
- ❌ Folding expired credentials (401) into the same state as a retryable failure (§2; a retry path is wrong for a 401) (Enforcement: `src/adapters/client/http/request.test.ts` maps 401 to unauthenticated and rejects folding it into an internal failure. Whether the incremental-fetching hook separates states by classification is Prose — **not mechanizable**. It is decided by the meaning of the hook's branches)
- ❌ Bringing in a data-fetching library on account of infinite scroll ([0060](0060-state-management.md) exclusion) (Enforcement: none — a decision not to adopt. A data-fetching library shows up as an added dependency in the `package.json` diff, and not bundling one is itself the state)

## Notes

- Rules enforced day to day (details of the paging UI, skeletons, etc.) are held by [docs/rules.md](../rules.md).
- The decision to enable Cache Components (PPR) is outside this ADR's scope and owned by [0041](0041-cache-components-decision.md). The caching model that infinite scroll's initial RSC fetch relies on follows 0041 and [0071](0071-bff-api-integration.md)'s caching and revalidation design for data fetching.

## Related ADRs

- [0041-cache-components-decision.md](0041-cache-components-decision.md) — the decision to enable Cache Components (PPR) (the owner of the caching model the initial RSC fetch rides on)
- [0060-state-management.md](0060-state-management.md) — Server state = RSC fetch by default / URL state = Next's standard mechanisms (the foundation of this ADR's §1) / client fetching not presupposed (this ADR's §2 adds a limited exception) / no data-fetching library bundled
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — caching and revalidation of data fetching / fetch wrapper resilience on the `adapters/server` premise (the counterpart of this ADR's §2 client path)
- [0080-error-handling.md](0080-error-handling.md) — error normalization at the `adapters` boundary (also applied to the responses of this ADR's §2 additional client fetches)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `adapters/client` (the owning boundary of client-side remote IO; mainly same-origin BFF fetch; the owner of this ADR's §2 additional client fetching)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — where cross-cutting client hooks are promoted to (the home of the infinite-scroll trigger hook once it becomes cross-feature)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the standards-conformance and non-lock-in decision axis (the basis of this ADR's vendor-independent justification)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the promotion rule (feature-local → capabilities)
