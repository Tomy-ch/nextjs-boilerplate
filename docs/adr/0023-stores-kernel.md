# The `stores` Kernel (Cross-Cutting Client State)

For the kernel **`stores`** in [0020](0020-adopted-architecture.md)'s **feature slices × presentation-layer kernels** architecture, this ADR sets its **responsibilities / dependencies / `"use client"` invariant / adopted library / promotion criterion**.

[0060](0060-state-management.md) sets "server state = RSC fetch by default / client state = start local". In adopting **Zustand** as the library for cross-cutting client state, **a home for cross-cutting client state shared by multiple features** is needed (a gap of the same shape as the cross-cutting hooks of `capabilities`). Following the established practice that "a kernel with real substance has its own ADR" (the same shape as [0022](0022-capabilities-kernel.md) capabilities), it is made independent.

## Status

Accepted

## Context

[0021](0021-frontend-responsibility.md)'s **promotion rule** (promote cross-cutting elements to one of `model` / `components` / `adapters` / `capabilities`) on its own **has no exit for cross-cutting client *state* (stateful stores)**. `capabilities` is limited to reactive hooks that supply runtime capabilities and is not a home for application state stores. **Client state that is cross-cutting (shared by multiple features) → the `stores` kernel / non-cross-cutting (within a single feature) → inside the feature** (the same shape as [0021](0021-frontend-responsibility.md)'s promotion rule).

## Decision

### Responsibilities

`stores` is the kernel that holds **cross-cutting client state shared by multiple features** (Zustand stores).

- **The default stays as in [0060](0060-state-management.md)**: server state = RSC fetch / client state of a single feature = local state inside the feature (`useState` / `useReducer`). **Only truly cross-cutting client state is promoted to `stores`** (acceptance criterion = referenced by multiple features).
- The adopted library = **Zustand** (lightweight, de facto; [0010](0010-standards-and-non-lockin.md)'s conformance to standards). Stores are `"use client"`.

### The `"use client"` Invariant

`stores` is **fixed as client-only (`"use client"`)**. On a separate axis from server state (RSC/adapters in [0071](0071-bff-api-integration.md)), it handles session / cross-UI state in the browser (selection state, wizards, global UI toggles, etc.). Data coming from the server is passed by RSC as props, and stores hold the client's interaction state (server state is not held twice in a store).

### What Does Not Belong Here

- **Server state** (→ RSC fetch / [0071](0071-bff-api-integration.md) adapters). API responses are not cached a second time in a store. **However, a record that itself represents "what the user chose" is an exception** (below)
- **State of a single feature** (→ local state inside the feature; not promoted)
- **UI markup** (→ `components`) / `serverConfig` / secrets / business logic (a backend responsibility; [0011](0011-no-docker.md))
- **Policy state** (consent/flags by default do not belong to `stores` and are held by each seam. However, a value that meets [0031](0031-policy-state-supply.md)'s condition — needed synchronously before the first render, and reactive — is held by `stores` (consent is such a value))

### Display-Value Snapshots Included in a Record of Choices

**A record that represents the user's choices themselves** (a list of items the user picked and accumulated, items chosen for comparison, values pulled into a draft, etc.) **may hold, in the store, a snapshot** of the display values at the time of choosing. This is not an exception to the ban on double caching in the previous item; it is outside its reach in the first place.

What is prohibited is **placing a copy of the latest value the server owns in a store and holding freshness management a second time on the client side** (= reinventing the client fetching and caching layer that [0060](0060-state-management.md) leaves out by default). A record of choices does not fall under this as long as it meets the following three points.

1. **It does not refetch.** The store does not track freshness and holds neither invalidation nor subscriptions
2. **Confirmation is left to the backend.** The final judgment on the validity and acceptability of values is made by the backend at the time of submission; the store's values remain material for display and input
3. **The user is the subject of the record.** It does not mirror server state; it grows and shrinks as a result of the user's operations

Dropping any one of these three points makes it double caching. The decision is made not by the store's type but by **who is responsible for freshness**.

### Dependencies

| Layer (importing side) | Allowed import targets |
| --- | --- |
| `stores` | `model` / `errors` (NEXT_PUBLIC literals of `config/client` are allowed). `"use client"` |
| `features` | Existing + **`stores`** |

- **`components` does not import `stores`** (keeps pure UI, props-in; the feature does composition)
- **The fifth exit of the promotion rule**: cross-cutting client state → `stores` ([0021](0021-frontend-responsibility.md))

### Portability / Non-Lock-in ([0010](0010-standards-and-non-lockin.md))

Zustand is the de facto lightweight store and rides on the standard shape of `create()` + hooks (vendor-independent = the store API is React's idiomatic hook, so the structure "read cross-cutting client state through a hook" stays portable even without Zustand). Keeping stores consolidated in `stores` rather than written directly in features/components keeps them replaceable. Exact pin + `pnpm audit` ([0004](0004-library-management.md)).

## Prohibitions

- ❌ Caching server state (API responses) a second time in `stores` (server state belongs to RSC/adapters). **Display-value snapshots included in a record of choices do not fall under this** (§Display-Value Snapshots Included in a Record of Choices) (Enforcement: Prose — **not mechanizable**. Whether it is double caching or a record of choices is decided by who is responsible for freshness, not by the store's type)
- ❌ Promoting state of a single feature to `stores` (without cross-cutting use it stays local inside the feature) (Enforcement: Prose — **mechanizable** (fail when fewer than two feature slices import a store in `src/stores/`. No rule exists))
- ❌ `components` importing `stores` (composition goes through the feature) (Enforcement: ESLint `boundaries/dependencies` (`DEPENDENCIES.components` in `architecture.ts` has no `stores`))
- ❌ Placing UI markup / secrets / `serverConfig` / business logic in `stores` (Enforcement: ESLint `project-rules/no-markup-outside-ui-layers` fails on UI markup, and the build-time failure of `server-only` and `scripts/server-only.gate.test.ts` fail on `serverConfig`. Secrets and business logic are Prose — **not mechanizable**: they are decided by the meaning of the value and where the judgment lives)
- ❌ Writing a Zustand store directly in a feature/component and having it referenced across features (cross-cutting state is consolidated in `stores`) (Enforcement: ESLint boundaries fails on another feature referencing a store inside a feature. Using `zustand` outside `src/stores/` is Prose — **mechanizable** (fail `zustand` imports from outside `src/stores/` with `no-restricted-imports`. No rule exists))

## Related ADRs

- [0060-state-management.md](0060-state-management.md) — the state-management policy (server=RSC / client=local by default; this ADR holds the home for cross-cutting client state)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — the cross-cutting client hook kernel (an independent kernel of the same shape as this ADR)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — server state (RSC/adapters; the boundary that is not duplicated with stores)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the promotion rule (the cross-cutting client state → stores exit)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — Zustand's conformance to standards + replaceability
