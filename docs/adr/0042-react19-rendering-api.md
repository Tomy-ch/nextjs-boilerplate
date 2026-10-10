# React 19 Rendering API Conventions

This ADR defines the usage conventions for React 19's rendering-related APIs — **ref as prop (toward retiring `forwardRef`) / `use()` / restraining `useEffect` / whether to adopt the React Compiler**. On top of **the App Router rendering mechanisms and the placement of the RSC / Client boundary** defined by [0040](0040-routing-rendering-strategy.md), it fixes **how React itself is written** inside components.

## Status

Accepted

## Context

[0040](0040-routing-rendering-strategy.md) is the routing ADR that defines "**where** to place the Server / Client boundary" (WHERE); "**how** to write React APIs inside the boundary" (HOW) is out of its range. This ADR holds that HOW.

This repository adopts **React 19.2 / Next.js 16** (a consequence of [0011](0011-no-docker.md) / the App Router being de facto), an area that diverges widely from AI agents' training data ([`docs/design/rendering.md`](../design/rendering.md) holds the terms and the mistakes). Without conventions, old and new patterns (`forwardRef` / hand-written `memo` / `useCallback`, versus ref as prop / the React Compiler) get mixed from one implementer to the next. This ADR codifies the usage conventions for rendering-related React APIs.

Sources verified (checked before implementation; what [0010](0010-standards-and-non-lockin.md) says to "ride on"): `node_modules/react` (v19.2.4) / `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/reactCompiler.md` / likewise `01-getting-started/06-fetching-data.md` (examples of resolving a Promise / Context with `use()`).

### Range declaration (no overlap with 0040)

This ADR is **limited to rendering-related React APIs**. The following are outside this ADR's range and owned by existing ADRs (an explicit demarcation to separate the starting points of local reasoning):

| Concern | Owning ADR | Demarcation from this ADR |
| --- | --- | --- |
| **Where to place** the RSC / Client boundary, pushing `"use client"` down | [0040](0040-routing-rendering-strategy.md) | This ADR covers only **how APIs are written** inside the boundary |
| **Orchestration, caching and deduplication of data fetching** with `use()` | [0071](0071-bff-api-integration.md) | This ADR covers only how `use()` is written **as a rendering primitive** |
| **Boundary placement and granularity** of `<Suspense>` | [0040](0040-routing-rendering-strategy.md) (the loading UI of `loading.tsx` / fallbacks is [0080](0080-error-handling.md)) | This ADR covers only the **invariant** that `use()` presupposes Suspense |
| The **home** of cross-cutting reactive client hooks (runtime capabilities) | [0022](0022-capabilities-kernel.md) | This ADR covers only the **policy of restraining how `useEffect` is written** |

## Decision

### 1. Adopt ref as prop; do not use `forwardRef` in new code

- In React 19 a function component can receive ref as **an ordinary prop**. New components use this and **do not newly write `forwardRef`**.
- **Vendor-independent justification** ([0010](0010-standards-and-non-lockin.md)): `forwardRef` creates an extra layer of indirection through a wrapper and complicates the types (`ForwardRefRenderFunction`, etc.). Ref as prop needs only a plain function signature, and the typing of props and ref becomes uniform. This is a simplification grounded in API design that holds even with React's authority taken out, and goes beyond "because React deprecated it". React 19 places `forwardRef` on the path to deprecation ([0010](0010-standards-and-non-lockin.md)'s "ride on the de facto" = conforming to React's conventions), and riding on it also avoids reinventing the wheel.

### 2. Allow `use()` as a conditional read primitive

- `use()` may be used **to read a Promise / Context**. Reading Context with `use()` instead of `useContext` is allowed (`use()` can be called even inside conditionals and after an early return — because it is a read that is not bound by the top-level constraint of Hooks).
- **The main path**: pass the Promise of a fetch started in a Server Component **as props** to a Client Component and resolve it with `use()` under a `<Suspense>` boundary (the documented pattern of `fetching-data.md`; consistent with 0040's rule of pushing `"use client"` down to the leaves, it keeps the fetch itself on the server and moves only the waiting to the client).
- **Delegation**: **which data to use `use()` with / how to design caching, revalidation and deduplication** is owned by [0071](0071-bff-api-integration.md), and **placement and granularity** of `<Suspense>` boundaries by [0040](0040-routing-rendering-strategy.md). This ADR lays down only the **invariant** "`use()` presupposes Suspense / an error boundary" (do not place a bare `use()` without a boundary).

### 3. Limit `useEffect` to synchronizing with external systems (restraint)

- `useEffect` is used only for **synchronizing with external systems outside React** (subscriptions / non-React DOM operations / subscribing to browser APIs).
- **Forbidden direction**: do not synchronize **derived values** that can be computed from props / state via effect + state (compute them during render or in an event handler). This rides on the React docs' "You Might Not Need an Effect" policy. **Vendor-independent basis**: synchronizing derived values with effects causes extra re-renders and out-of-sync bugs, which is a general principle of state management independent of React's version.
- **Promotion**: a `useEffect` that grows into a reactive cross-cutting client hook (a runtime capability) used by several features is not kept inside the feature but **promoted to the `capabilities` kernel** ([0022](0022-capabilities-kernel.md)) (the promotion rule of [0021](0021-frontend-responsibility.md)). An effect runs on the client, consistent with pushing down to the leaves under the RSC default ([0040](0040-routing-rendering-strategy.md)).

### 4. The React Compiler is not a required capability of the foundation (a performance optimization opted into by annotation)

- **The core does not presuppose the React Compiler.** It keeps ordinary React / Next.js implementations working as-is without the Compiler. A component that does not use the Compiler is not treated as an inferior implementation.
- **Whole-app application (full-auto / infer) is not adopted.** What is adopted is opt-in via `compilationMode: "annotation"` and `"use memo"`. This setting is permanent, and `babel-plugin-react-compiler` is held as an exact-pinned dev dependency ([0004](0004-library-management.md)). `"use no memo"` is an escape hatch and is not a premise of standing operation.
- **`"use memo"` is a performance annotation, not an implementation detail**. It is an explicit declaration that "Compiler optimization is permitted for this component / hook", placed on **paths where a change in one piece of client state reaches a wide subtree**. It is not sprinkled; it is placed by counting the components that make up that path.
- **The path is decided by subscriptions, not by position on screen.** A state change reaches only the components that subscribe to its supply and the descendants rebuilt from them via props. **It does not reach the supply's ancestors** (it does not propagate from child to parent), and **it does not reach a subtree received as `children`** (the same element reference is passed through, so React skips it). **Nor does it reach state held by a child** — if the state is inside the child, like opening and closing an overlay, the parent that assembled that JSX is not re-run on each open and close. Therefore "sitting in the same band" or "being on the screen of that interaction" is not a basis for the marker. Before counting, look at what that component `use()`s.
- **Keep Compiler-readiness everywhere and make only Compiler execution opt-in.** Conformance to the Rules of React and the Compiler-derived rules of `eslint-plugin-react-hooks` are kept whether or not the Compiler is used. These are not checks for the Compiler but **checks that stop bugs in ordinary implementations** — deriving state in effects, side effects during render, the handling of refs ([0002](0002-formatter-linter.md)).
- **Do not uniformly replace hand-written `memo` / `useMemo` / `useCallback` with the Compiler.** Do not mechanically delete existing memoization.
- **Preventive memoization itself is not forbidden.** Heading off a possible cost in advance is not stopped. What is forbidden is **handling beyond one's responsibility** under [0020](0020-adopted-architecture.md) design principle 6, and **memoization that carries no meaning**.
  - **What the layer below holds** — a memoized value is passed down as-is. Checking whether that value is valid belongs to the receiving side (feature / `adapters` / the contract / the backend), and the passing side does not get ahead of it
  - **Nothing depends on identity** — the value goes neither into a dependency array nor to a memoized child (such as a handler passed only to a plain DOM attribute)
  - **The cost does not matter even if a re-render happens** — something that catches only an edge case of an edge case
- **Measurement is not "the condition for being allowed to write it".** It is the deciding factor when you cannot say whether it has meaning. Conversely, writing something that can be said to have meaning needs no measurement.
- **The reason is blast radius, not maturity**: the Compiler is stable, and its implementation is React itself. The problem is not quality but that **the way it breaks is not fail-fast**. [0030](0030-environment-variable-management.md)'s taint throws on violation, and [0041](0041-cache-components-decision.md)'s Cache Components fails the build if its premises are not met. The Compiler does not fail — because it transforms components automatically at build time to introduce memoization, **silent, non-fail-fast behavioral differences can appear in referential identity of values, effect dependencies, subscriptions and interaction with third-party libraries**. We have the nets of lint / E2E / VRT / a11y, but **they are not used as grounds to justify automatic whole-app application**.
- **Match the reach of the cost to the scope of application**: full-auto puts +16.4 KB gzip on the shared chunk and +4–15 KB on each route's initial JS, across every route. `annotation` does not grow the shared chunk; only the routes that carry a marked component grow — measured, one screen with markers on 13 subscribers of a supply is +2.4 KB, and other routes with no marker grow by 0 (`pnpm bundle-budget <current .next> <comparison .next>`).
- **The benefit shows up in INP, not TBT.** Growth in JS is on the side that worsens TBT (execution time), and what the Compiler shrinks is re-rendering, which can only be observed from real user interactions. Therefore **we do not pay a cost that is measured to apply in advance, across every route, a benefit that is not yet measured**.
- **The condition for adoption is not "becoming stable"** (it already is stable). The conditions are **being able to say it is a path where re-rendering concentrates**, and **being able to show by measurement that the cost paid stays within that route**.
- **Do not make measuring the effect a condition for the marker.** What the Compiler shrinks is event processing (the work React does synchronously inside a handler), and of the interaction latency that decides perceived responsiveness it does not shrink presentation (style / layout / paint). Measured, even with the CPU throttled 4x, processing had a median of 0–4 ms across all interactions and a worst case of 94 ms (8x throttle), and **the difference between two measurements of the same build (+12 to +63%) was larger than the Compiler's difference** (method: operate the built app in a real browser and repeatedly read `PerformanceObserver` for `event` and `long-animation-frame` under CPU throttling. `processingEnd - processingStart` is the part the Compiler shrinks; the rest of `duration` does not shrink). Deciding here that "the effect cannot be measured, so do not mark" would make what this repository ships reflect the circumstance that its subject screens are light, not real screens. **What this repository holds is the mechanism and worked examples of where to place markers**; whether it pays off on your own screens is decided anew by INP in RUM ([0082](0082-client-observability.md)).

### 4-1. Order of performance improvement (the Compiler is one means)

For a performance problem, identify the cause before choosing the means. The Compiler is one option, not the default entry point.

```text
Detect the performance problem
  ↓
Analyze the cause
  ↓
Choose the appropriate improvement
  ├─ Move to Server Components
  ├─ Reduce client JS
  ├─ Revisit component / state boundaries
  ├─ Revisit data fetching / caching
  ├─ Manual memoization
  └─ Opt in to React Compiler
```

**Do not mistake the relationship with SSR-First.**

```text
SSR-First       → reduces the need to run on the client at all
React Compiler  → an optimization candidate for what still has to run on the client
```

The Compiler is not placed as a premise or standard behavior of SSR-First. Do not distort the architecture in order to use the Compiler.

## Prohibitions

- ❌ Using `forwardRef` in a new component (ride on ref as prop; Decision 1) (Enforcement: biome `noReactForwardRef` (`--error-on-warnings` rejects uses of `forwardRef`))
- ❌ Placing a bare `use()` outside `<Suspense>` / an error boundary (the invariant of Decision 2) (Enforcement: Prose — **not mechanizable**. The boundary is placed in an ancestor in another file and is not decided by the shape of the file that calls `use()`)
- ❌ Synchronizing derived values computable from props / state with `useEffect` + `useState` (compute during render or in an event handler; Decision 3) (Enforcement: ESLint `react-hooks/no-deriving-state-in-effects` / `react-hooks/set-state-in-effect`)
- ❌ Configuring `reactCompiler` without specifying `compilationMode`, implicitly applying it to every component (Decision 4) (Enforcement: Prose — **mechanizable** (the form where a unit test checks that `reactCompiler.compilationMode` in the config `next.config.ts` returns is `annotation`; no check exists))
- ❌ Sprinkling `"use memo"` without being able to say it is a path where re-rendering concentrates, and placing it without measuring the cost increase on that route (Decision 4) (Enforcement: the `bundle-budget` job rejects increases on marked routes above the limit. Whether it is a path where re-rendering concentrates is Prose — **not mechanizable**. It is a judgment about how far subscriptions spread, not decided by the presence of the marker)
- ❌ Making `"use no memo"` a premise of standing operation (keep it as an escape hatch; Decision 4) (Enforcement: Prose — **partly mechanizable**. Occurrences of `"use no memo"` can be counted statically, but no rule exists. Whether it is a standing premise or a temporary retreat is decided by operational intent)
- ❌ Uniformly deleting existing hand-written `memo` / `useMemo` / `useCallback` and leaving it to the Compiler (Decision 4) (Enforcement: Prose — **not mechanizable**. Whether something was deleted uniformly is the intent of the change and does not appear in the shape of the remaining code)
- ❌ Loosening PII / caching / security boundaries on the grounds of the Compiler's performance benefit ([0112](0112-data-classification-cache-boundary.md) invariant 6) (Enforcement: Prose — **not mechanizable**. The reason for loosening is the motive of the change and does not appear in code. The boundaries themselves are watched by the machinery on 0112's side)
- ❌ Sprinkling **handling beyond one's responsibility** and **memoization that carries no meaning** — what the layer below holds / nothing depends on identity / the cost of re-rendering does not matter ([0020](0020-adopted-architecture.md) design principle 6, Decision 4) (Enforcement: Prose — **not mechanizable**. Whether the handling overlaps with the layer below, and whether something downstream of the memoization depends on identity, are judgments about responsibility and subscriptions, not decided by the shape of the code. The responsibility side is held by [docs/rules.md](../rules.md#layers))
- ❌ Re-deciding in this ADR **the placement of the RSC / Client boundary** (0040), **the caching design of data fetching** (0071) or **the placement of Suspense boundaries** (0040) (out of range) (Enforcement: Prose — **not mechanizable**. Whether a statement re-decides something out of range is decided by the meaning of its content, not by the shape of the document)

## Notes

- **The demarcation between decision and rule** (the taxonomy of [0140](0140-documentation-operations.md)): this ADR settles **whether to adopt** the React Compiler (decision) and **the adoption policy** for each API (decision). On the other hand, the constraints enforced day to day — "do not write `forwardRef`", "do not synchronize derived values with effects", "do not sprinkle memoization that carries no meaning" — are of the **rule class**; the first two, which machines decide, are held by the lint rules named in Prohibitions. The third, not decided by shape, is held by [docs/rules.md](../rules.md#layers) as a judgment about responsibility. Only the core of the rule (why) remains in this ADR's body.
- **No linked convention "hand-written memo is forbidden" arises**: because Decision 4 does not adopt whole-app application, no convention forbidding hand-written memoization on the premise of leaving memoization to the Compiler arises. The choice of `compilationMode` is also held by Decision 4, as `annotation`.
- **The React Compiler is not a premise of correctness / architecture / runtime**: the core's implementation, review and tests do not depend on whether the Compiler is present. Opted-in places are kept after confirming that E2E has not regressed and that the cost increase stays within that route. **VRT cannot be used for this confirmation** — story captures shoot the Storybook build, which does not read `next.config.ts`, so the Compiler does not run. What is captured is always the rendering of the unmarked side; only paths that go through `next build` pass through the Compiler's transformed output.

## Related ADRs

- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the App Router rendering mechanisms / placement of the RSC and Client boundary (this ADR's parent; it owns WHERE, this ADR owns HOW)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — feature slices × presentation-layer kernels (the parent principles of pushing `"use client"` to the leaves and of promotion)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the promotion rule (cross-cutting client hook → `capabilities`)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — the home of reactive cross-cutting client hooks (where `useEffect` is promoted to)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — orchestration, caching and deduplication of data fetching with `use()` (delegated from this ADR)
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — whether to adopt Cache Components (a fail-fast mechanism whose build fails if its premises are not met; the contrast for Decision 4's blast radius)
- [0080-error-handling.md](0080-error-handling.md) — the loading UI of `loading.tsx` / `<Suspense fallback>` and error boundaries (the premise of `use()`)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance (ride on React's conventions) + mandatory vendor-independent justification
- [0140-documentation-operations.md](0140-documentation-operations.md) — the decision / rule taxonomy (this ADR = decision / linked constraints = rule → lint rules / rules.md)
- [0004-library-management.md](0004-library-management.md) — exact pin of `babel-plugin-react-compiler` + the `pnpm audit` flow
- [0101-performance-budget.md](0101-performance-budget.md) — the performance budget (the measuring side that judges whether to apply the Compiler)
- [0082-client-observability.md](0082-client-observability.md) — RUM of Web Vitals including INP (the premise for measuring effect)
