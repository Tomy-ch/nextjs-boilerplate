# Element Structure of the app Layer (Route Handler / Server Action / metadata)

Besides `page.tsx`, `src/app/` also holds App Router special files (`route.ts` / `actions.ts` / `robots.ts`, etc.). The single line "`app` is a thin driving adapter that calls a feature's screen (its only import target is `features`)" contradicts the need of **Route Handlers** (`route.ts`) and metadata routes (`robots.ts`, etc.) to import `adapters` / `config` — [0030](0030-environment-variable-management.md) presupposes "Route Handler → direct import of adapters".

This ADR resolves this by **splitting the `app` layer into four roles** (no new kernel needed). The machine holds declarations for three of them; `route-segment` is not declared because the set to subtract cannot be written (see the element table below). Mounting cross-cutting UI / Providers in the root layout ([0026](0026-layout-shell-mount.md)) is set there, building on the `app/route-segment` this ADR defines.

## Status

Accepted

## Context

Putting the home of Server Actions only in `feature/actions.ts` leaves two gaps.

- **There is no home corresponding to Route Handlers.** **Cross-cutting endpoints that belong to no feature**, such as BFF relay endpoints ([0081](0081-observability-logging.md) telemetry intake, health), are physically forced by framework convention into `src/app/**/route.ts`, so they cannot be placed inside a feature and cannot be written with an `app → features only` matrix. Likewise there is no route by which metadata routes reach config values (site URL / per-env noindex)
- **Sometimes a Server Action cannot live in the feature's home.** A Server Action is a **public HTTP endpoint** to which anyone who knows the action id can POST from any route, so the authorization of the screen that rendered it cannot be presupposed. The role assertion is therefore needed inside the action, but only `app` and `adapters` may touch `adapters/server/auth`, which `features` cannot reach

## Decision: Split `app` into Four Roles (All App Router Special Files)

The Pages Router (`pages/` / `pages/api`) is not adopted. Evidence: the official doc `route-handlers.md` "Route Handlers are the equivalent of API Routes … you do not need to use API Routes and Route Handlers together" + [0040](0040-routing-rendering-strategy.md) (App Router only).

| element | Target files | Allowed import targets | Principle |
| --- | --- | --- | --- |
| `app/route-segment` | `page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` (App Router UI) | `features` / **only for protecting the entry point**, `verifySession()` in `adapters/server/auth` and `model` predicates ([0079](0079-auth-frontend-seam.md)) | Driving adapter, a thin call endpoint. Orchestrating protection is only "call, decide, send back"; it holds neither fetching nor business logic |
| `app/route-handler` | **`route.ts`** (= the App Router replacement for Pages API Routes, **the only HTTP endpoint**) | `adapters/server` ([0024](0024-adapters-server-client-split.md)) / `model` / `errors` / `logging` / **only the feature's `facade/`** ([0021](0021-frontend-responsibility.md)) | **Thin proxy, no business logic** ([0011](0011-no-docker.md) / [0070](0070-backend-role-separation.md)). The HTTP version of `actions.ts`. All it needs to point at a destination is the route's identifier, which the owning feature exposes in `facade/`. Opening up the inside of the slice would let business logic descend here |
| `app/server-action` | **`actions.ts`** (the `"use server"` mutation endpoint) | `adapters/server` / `features` / `model` / `errors` / `logging` | **The actor is asserted here.** It is a public HTTP endpoint and does not presuppose the authorization of the screen that rendered it |
| `app/metadata` | `robots.ts` / `sitemap.ts` / `manifest.ts` / `opengraph-image`, etc. | `config` / `model` (+ only `sitemap.ts`, which walks a list at request time, may also import `adapters/server` and the target feature's `facade/`) | Framework files at build / render time. A thin start-up / build boundary exception (on a par with `instrumentation.ts`). For a sitemap to list a dynamic list it needs a fetch endpoint, which exists only in `adapters/server` |

This creates **an explicit element through which Route Handlers can import `adapters/server`**, and [0021](0021-frontend-responsibility.md)'s dependency matrix and [0030](0030-environment-variable-management.md)'s table of config recipients agree. `route.ts` cannot coexist with `page.tsx` in the same segment (Next.js convention), so deciding the element by filename works.

**Where `actions.ts` goes is decided by whether an assertion of the actor is needed.** Those that need one are `app/server-action`; those that do not stay in `features/<name>/<screen>/actions.ts` ([0027](0027-directory-structure.md)). The same file name appears in two places because the element is decided by **the pair of path and filename**, and only `src/app/**/actions.ts` matches this element. Splitting the location is a consequence of the dependency matrix in which `features` cannot reach `adapters/server/auth`, and it also matches the official Next.js examples, which use `app/**/actions.ts`.

### How much of this table is enforced by machine

Boundary-check elements correspond to directories, so to split files in the same directory by name
the only way is **to subtract from the layer's permissions afterwards**. `APP_ELEMENTS` in `architecture.ts` is that subtracting side, and the effective permission is
the `app` layer's permission minus it. How far enforcement reaches differs row by row.

| element | Enforcement | What passes beyond the table above | Why it cannot be narrowed |
| --- | --- | --- | --- |
| `app/route-handler` | **All** | —— | |
| `app/server-action` | Partial | `config` | What is prohibited is reading `server config` directly, but what `actions.ts` reads is the `NEXT_PUBLIC` public constants. **The two cannot be separated at the granularity of layers** |
| `app/metadata` | Partial | `adapters` (all 5 files) | The element is a set of file names, and there is no granularity to separate just `sitemap.ts` within it |
| `app/route-segment` | **None** | All of the layer's permissions | Not declared as an element. A shape in which `page.dev.tsx` reads `server config` directly really exists |

**Where enforcement does not reach, this table only states guidance.** Green does not mean "it is as this table says"
([0157](0157-inspection-declaration-discipline.md)).

### What cannot be written as a set of import targets

The two above are not missing implementation but **things that cannot be expressed**. Until they can be written, they are kept as prose
([0144](0144-decision-enforcement-pairing.md) asks prose to state why it cannot be mechanized).

- **`server config` and the `NEXT_PUBLIC` public constants** live in the same `config`. Separating them requires looking not at "which module
  was read" but at "whether the value read holds a secret", and that is not a set of imports
- **`observability` and `config` in `route-segment`** are allowed only for mounting instrumentation and for values that Next.js
  conventions require to be placed in a route segment. This is not "what may be imported" but
  **"how it may be used"**, so it cannot be expressed by subtracting permissions

The second of these is why `route-segment` cannot be declared as an element; it is not something declaring would fix —
adding only the element while the set to subtract cannot be written adds rows that **look like enforcement but narrow nothing**.

Within `app/route-segment`, the convention for mounting cross-cutting UI / Providers in `layout.tsx` is set by [0026](0026-layout-shell-mount.md).

## Prohibitions

- ❌ Writing business logic / heavy aggregation in `route.ts` (thin proxy; [0011](0011-no-docker.md) / [0070](0070-backend-role-separation.md))
- ❌ Adding the Pages Router (`pages/` / `pages/api`) (App Router only) (Enforcement: none — a decision not to adopt. Not having `pages/` is itself the state; adding it shows up in the diff as an added directory)
- ❌ Importing `config` directly from `app/route-handler` (config goes through `adapters/server`; metadata may use config as an exception)
- ❌ Importing **`server config`** directly from `app/server-action` (for the same reason as route-handler; the runtime object holding secrets is read on the `adapters/server` side)
- ❌ Omitting the assertion of the actor in `app/server-action` and relying on the screen that rendered the action being protected (anyone who knows the action id can call it from any route) (Enforcement: Prose — **partly mechanizable**. Whether each action in `src/app/**/actions.ts` calls an assertion from `adapters/server/auth` could be caught as the presence or absence of the call, but no rule exists. Whether the assertion suffices as a role and ownership decision is decided by business meaning)
- ❌ `app/route-segment` holding fetching or business logic in the name of protecting the entry point (only calling `verifySession()`, deciding with a `model` predicate and `redirect()` are allowed; [0079](0079-auth-frontend-seam.md))
- ❌ Importing **`server config`** directly from `app/route-segment` (values are received from `adapters` or from the `NEXT_PUBLIC` public constants every layer can read; the same prescription as [0021](0021-frontend-responsibility.md)'s "inner layers receive values as arguments"). **The only exception is values Next.js conventions require to be placed in a route segment** — `metadataBase` / `robots` read by the root layout's `metadata` export (`config/site`; [0044](0044-seo-metadata-strategy.md)) and `config/clock`, which screens read as "now". Routing either through `adapters` would only add a fetch endpoint, even though where the value lives is fixed by convention

## Related ADRs

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the SSOT for responsibilities / the dependency matrix (this ADR subdivides the elements of `app`)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — the table of config recipients (how Route Handlers / metadata reach config)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — App Router only (Pages Router excluded)
- [0011-no-docker.md](0011-no-docker.md) / [0070-backend-role-separation.md](0070-backend-role-separation.md) — thin proxy (no business logic in Route Handlers)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `adapters/server` (the import target of Route Handlers)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — mounting cross-cutting UI / Providers in `layout.tsx` (built on this ADR's route-segment)
