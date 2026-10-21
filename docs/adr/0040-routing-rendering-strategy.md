# Routing and Rendering Strategy

This ADR ratifies the adoption of the App Router and defines the policy on **the Server / Client Components boundary / whether to adopt Server Actions / the responsibility of `page.tsx` / rendering modes (CSR, SSR, SSG, ISR / Next.js 16 caching)**. On top of the layer structure defined by [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md), it fixes how each App Router mechanism is used.

## Status

Accepted

## Context

This repository adopts **Next.js 16 / React 19**, whose rendering and caching defaults differ from earlier Next.js. Having checked `node_modules/next/dist/docs/` before implementation, the following are taken as premises:

- Server Components are the default. `"use client"` at the top of a file declares the **Server / Client module-graph boundary**, and everything imported and every child below it is **included in the client bundle** (`getting-started/server-and-client-components`)
- A Server Function (Server Action) is defined with the `"use server"` directive, either inline in a Server Component or gathered in a `"use server"` file that a Client Component imports and invokes (`getting-started/mutating-data`)
- `fetch` is **not cached by default** (regardless of Cache Components; `getting-started/fetching-data`). Opt-in caching via the `use cache` directive, and **Partial Prerendering (PPR)** with `<Suspense>` / `use cache`, are **mechanisms available when Cache Components (`cacheComponents: true` in `next.config.ts`) is enabled** (PPR is the default behavior with Cache Components enabled; `getting-started/caching` / `api-reference/directives/use-cache`). When it is disabled, the earlier model (opt-in via `cache: 'force-cache'`, etc.) applies (`guides/caching-without-cache-components`)

## Decision

### App Router + Server Components by default

- Adopt **the App Router alone** (the Pages Router is not adopted). Route structure, special files and segment notation follow the Next.js conventions ([0028](0028-naming-convention.md))
- **Server Components are the default**. A component without `"use client"` runs on the server

### Push `"use client"` down to the leaves inside a feature

- `"use client"` is placed only on **leaf components inside a feature that actually use client features (state / events / browser APIs)** ([0021](0021-frontend-responsibility.md), which owns where Server Actions live, is the authority for this rule)
- Reason: everything inside a `"use client"` boundary, down to imports and children, goes wholesale into the client bundle, so putting the boundary high up (`layout.tsx` / `page.tsx`) spreads client conversion needlessly. Lowering the boundary to the leaves minimizes the client bundle
- `page.tsx` / `layout.tsx` stay Server Components

### Adopt Server Actions

- Server Actions are **adopted** and defined with `"use server"`. Their home is **`actions.ts` inside a feature** (the controller equivalent; [0021](0021-frontend-responsibility.md) is the authority)
- As a driving adapter it performs **orchestration only** and **writes no business logic** ([0011](0011-no-docker.md) thin proxy / [0020](0020-adopted-architecture.md) design principle 4 / [0021](0021-frontend-responsibility.md))

### `page.tsx` = a thin driving adapter

- Route segments (under `app/`) and `page.tsx` are **thin call sites that call a feature's screen RSC** ([0020](0020-adopted-architecture.md) design principle 4). They hold no orchestration or business logic. The primary axis of code splitting is the feature, not the route

### Rendering modes: no particular mode is enforced

- This repository **closes off none of CSR / SSR / SSG / ISR**. It does not uniformly enforce a particular mode and **keeps support for both** prerendering the static shell and streaming at request time
- Derivation: the deployments assumed by [0011](0011-no-docker.md) have **both** static CDN and SSR PaaS as primary targets, and this repository presupposes no mode
- **The choice of mode is subordinate to confidentiality.** Server Components by default is **a default for performance and UX**, not a constraint that overrides the confidentiality of PII / user-scoped data. Mode selection for ranges that contain PII is governed by [0112](0112-data-classification-cache-boundary.md) (invariant 1 / Decisions 8 and 10), and **giving up SSR / PPR for PII is permitted** (but the range made CSR is limited to the smallest Client Island)
- **However, a screen never declares which way it renders.** Because Cache Components is enabled ([0041](0041-cache-components-decision.md)), the split between static shell and dynamic hole is decided by the shape of the layout shell itself — what is placed outside `<Suspense>` and what inside — and segment config (`export const dynamic`) does not coexist with it. Fetching, `params` / `searchParams`, cookies, authorization decisions and the real clock are all resolved inside the dynamic hole. **Only a screen that cannot serve a static shell names itself with `export const instant = false`, with a reason.** Declaration and reality are cross-checked by `scripts/render-mode` against `compute` in `prerender-manifest.json`, looking both at routes that block without a declaration and at routes with a surplus declaration. **What a machine can confirm stops at whether a static shell could be served**; "whether the content may go into the static shell" cannot be read from the build output
- **The rendering mode is decided not by the page alone but by the whole route, including the chain of layouts.** If an ancestor layout shell reads request-time APIs (`cookies()` / `headers()`, etc.) outside a dynamic hole, the screens below it can no longer serve a static shell **even if they themselves fetch nothing**. The screen side has no way to escape. Therefore **the layout shell of a route group that contains screens meant to be static either confines its request-time reads inside a dynamic hole or does not have them**. If the layout shell needs that read on the static-shell side, move the screens meant to be static outside that layout shell (the decision to split layout shells is [0026](0026-layout-shell-mount.md))
- **The declaration is not etiquette but the only means of detecting this propagation.** As the previous item says, what a machine can read stops at whether a static shell could be served, and **"could serve one but does not" cannot be read from the build output**. When a screen without a declaration blocks because of its layout shell, nothing turns red, and a screen that could be static sits silently dynamic. If screens naming `instant = false` are limited to "only screens that cannot serve a static shell", `scripts/render-mode` fails as soon as an undeclared screen blocks, exposing the read added to the layout shell
- **Caching is opt-in** (`use cache`, on the premise that `fetch` is uncached by default). However, **the concrete caching policy (where to `use cache` / `cacheLife`) is not fixed in this ADR**. The caching and revalidation design of data fetching is owned by [0071](0071-bff-api-integration.md). The unit at which `<Suspense>` boundaries are placed is held by "Boundary Granularity" below, and responsibility for the loading UI that `loading.tsx` / a fallback shows is held by [0080](0080-error-handling.md)
- **The decision to enable `Cache Components` (the setting that makes PPR the default) is held by [0041](0041-cache-components-decision.md)** (adopted). This ADR fixes only that "no mode is enforced"

### Allow route-as-modal (intercepting / parallel routes)

- **The option of displaying a route as a modal is allowed**. The means is the Next.js-native combination of **intercepting routes (the `(.)` / `(..)` / `(..)(..)` / `(...)` notation) + parallel routes (a named slot such as `@modal` + `default.tsx`)**. No library is introduced (out of scope for [0004](0004-library-management.md) = no new dependency; this is also a non-lock-in strength; [0010](0010-standards-and-non-lockin.md))
- Behavioral premise: on **soft navigation** (clicking a `<Link>` in a feed, etc.) the route is intercepted, a modal is overlaid and the URL is masked. On **hard navigation** (opening a shared URL directly, refreshing) no interception happens and **an independent full page is rendered**. This satisfies "the modal content's URL is shareable", "refreshing does not close it and keeps context" and "back / forward opens and closes it" (`intercepting-routes` / `parallel-routes`)
- **Separating the modal boundary (the `Modal` component) from the modal content**, with a configuration that keeps the content side a Server Component, is the default (consistent with this ADR's principle of pushing `"use client"` down to the open / close-control leaf). An unmatched slot always gets a `default.tsx` (returning `null`)

**Conformance with [0010](0010-standards-and-non-lockin.md) (vendor-independent justification)**:

- Intercepting / parallel routes are a **Next.js-specific API**, but this is a consequence of a separate, already-settled decision — "the App Router was chosen" ([0011](0011-no-docker.md) / App Router alone) — not feature-specific lock-in (the operational test of [0010](0010-standards-and-non-lockin.md)). The **structural decision** of whether to adopt route-as-modal is itself **replaceable** by a search-param-driven modal such as `?modal=` or by a modal on pure client state ([0053](0053-ui-component-interaction-seam.md) owns the default); even with Next.js taken out of the justification, "a modal tied to a URL" holds as a UI pattern = non-lock-in
- The shape of the seam **rides directly on the Next.js conventions (the `@modal` / `(.)` file conventions)** (no invention of our own, no neutralization; [0010](0010-standards-and-non-lockin.md), the naming precedence of [0028](0028-naming-convention.md))
- This ADR stops at **allowing route-as-modal as an option (a receptacle)**. The policy on the default means for modals overall (native `<dialog>` / focus trap / Escape / scroll lock / when to choose route-as-modal) is **owned by [0053](0053-ui-component-interaction-seam.md)**, which references this section as the receptacle on the URL-design side

### Placement of `loading.tsx` / `error.tsx`

- The placement and responsibilities of the App Router's `loading.tsx` / `error.tsx` / `not-found.tsx` / `global-error.tsx` are governed by [0080](0080-error-handling.md) (the `error.tsx` family, and the loading UI that `loading.tsx` / `<Suspense fallback>` shows). Where `<Suspense>` boundaries go is held by "Boundary Granularity" below. This ADR lays down only the naming of special files ([0028](0028-naming-convention.md)) and the principle "put no business logic in a driving adapter"

### Partitioning models not adopted

The following are **not adopted**. RSC provides the same partitioning at a finer unit, and holding the vocabulary twice makes boundary decisions waver. **When you arrive at the same idea, look here and return to the RSC frame.**

| Model | Why not adopted |
| --- | --- |
| Islands architecture | Partitioning as "place moving islands inside a static surface" is the same as placing Client Components inside a Server Component. There is no need to declare the island unit separately |
| render-as-you-fetch | The technique of separating fetching from rendering and running it first has no premise in RSC, where fetching is inside rendering. Fetching is done by Server Components, and the range that waits is decided by `Suspense` boundaries |

### Boundary Granularity

`Suspense` boundaries are placed **per unit of what is awaited**. When one boundary covers several fetches, the slowest one holds up the others. Conversely, splitting things that arrive together into separate boundaries makes the screen get patched in repeatedly and moves the position where reading began. Therefore boundaries are placed inside the feature, near the parts that actually wait, rather than merely covering the whole `page.tsx` with one `loading.tsx`.

When splitting a later-arriving fetch into a separate boundary, also check **whether the elements that enter and leave on its arrival move the position of interaction**. If they do, either wait in the same boundary without splitting, or reorder so that the entering and leaving elements come after the interaction before splitting ([docs/rules.md](../rules.md#ui-parts)).

**Do not wait at a screen-side boundary for something the outer frame already awaits.** If fetching is memoized with `cache`, the screen's contents are ready by the time the outer frame can render. Putting a boundary there means **showing a loading UI to wait for a value already at hand**, and the elements below move by however much gets swapped in later. For something whose length depends on data, such as a list, the loading UI's height does not match the real thing, so the difference becomes CLS as-is ([0101](0101-performance-budget.md)). **A screen with nothing to wait for has no loading UI** ([0080](0080-error-handling.md)).

The inside of a boundary **cannot be interacted with while waiting**. Do not put inside it anything that needs to be interactive (search box, filters, back links).

## Prohibitions

- ❌ Adding the Pages Router (App Router alone) (Enforcement: none — a decision not to adopt. Not having a Pages Router directory is itself the state; adding one shows up in the diff as the addition of `pages/`)
- ❌ Writing business logic in `page.tsx` / `layout.tsx` / routes / Server Actions (thin driving adapter; [0011](0011-no-docker.md) thin proxy) (Enforcement: ESLint `boundaries/dependencies` (`APP_ELEMENTS` in `architecture.ts`) and `scripts/app-elements.gate.test.ts` reject imports reaching from Route Handlers / Server Actions to where business logic lives. Whether written code is business logic is Prose — **not mechanizable**. The distinction between orchestration and business judgment is decided by meaning)
- ❌ Putting `"use client"` needlessly on `layout.tsx` / `page.tsx` or higher (push the boundary down to the leaves)
- ❌ Merely covering the whole `page.tsx` with one `loading.tsx` and not placing `Suspense` boundaries near the parts that wait (throws away the benefit of streaming) (Enforcement: Prose — **not mechanizable**. How much counts as one wait is decided by the meaning of the screen, not by the shape of the tree)
- ❌ Making the route the primary axis of code splitting (the primary axis is the feature; [0020](0020-adopted-architecture.md)) (Enforcement: Prose — **not mechanizable**. The unit at which code is cut is a design judgment, and per-route directories always exist as a Next.js convention)
- ❌ Uniformly enforcing a particular rendering mode (all SSG / all dynamic, etc.) across this repository (Enforcement: none — a decision not to adopt. Not having a setting that binds every route uniformly (`output: "export"` or a uniform segment config) is itself the state)
- ❌ Enforcing route-as-modal as the default for all modals (it is only **an option**; the judgment on the default means is under [0053](0053-ui-component-interaction-seam.md)) (Enforcement: none — a decision not to adopt. Not having a mechanism that makes route-as-modal the default is itself the state; only screens that choose it add `@modal` and an intercepting route)
- ❌ Inventing or neutralizing a routing mechanism of our own in place of intercepting / parallel routes (ride directly on the Next.js file conventions; [0010](0010-standards-and-non-lockin.md)) (Enforcement: none — a decision not to adopt. Not having a routing mechanism of our own is itself the state; bringing one in shows up in the diff as an added dependency or module)

## Related ADRs

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — the non-split driving-adapter axis / thin `page.tsx` / feature as the primary axis (the parent principles of this ADR)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — where Server Actions live (`actions.ts`), pushing `"use client"` down
- [0011-no-docker.md](0011-no-docker.md) — thin proxy (no business logic in a driving adapter) / assumed deployments supporting both static CDN and SSR (the basis for not enforcing a mode)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — the decision to split layout shells (the counterpart of the rendering mode being decided by the whole route)
- [0028-naming-convention.md](0028-naming-convention.md) — naming of App Router special files and route segments
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — env freezing during prerendering
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — adopting Cache Components (PPR) (the mechanism of static shells, dynamic holes and the `instant` declaration)
- [0060-state-management.md](0060-state-management.md) — Server state = Server Component fetch by default / URL state (search params / route params are handled on top of this ADR's standard App Router mechanisms)
- [0090-testing-strategy.md](0090-testing-strategy.md) — the test lines for Server Components / route handlers / E2E
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the caching and revalidation design of data fetching
- [0080-error-handling.md](0080-error-handling.md) — the loading UI of `loading.tsx` / `<Suspense fallback>` + placement and responsibilities of the `error.tsx` family
- [0053-ui-component-interaction-seam.md](0053-ui-component-interaction-seam.md) — the default means for modals / dialogs (native `<dialog>` / mandatory a11y requirements). Delegates the adoption of route-as-modal to this ADR (this section is the receptacle)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the decision axis for standards conformance and non-lock-in (route-as-modal = a seam riding on Next.js conventions / the structure is replaceable = the basis of the vendor-independent justification)
- [0004-library-management.md](0004-library-management.md) — the library management policy (route-as-modal is a native feature with no new dependency = this ADR is outside that policy's scope)
