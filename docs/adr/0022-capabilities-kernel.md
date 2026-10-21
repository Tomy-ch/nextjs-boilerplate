# The `capabilities` Kernel (Cross-Cutting Client Hooks)

For the kernel **`capabilities`** in [0020](0020-adopted-architecture.md)'s **feature slices × presentation-layer kernels** architecture, this ADR sets its **responsibilities / dependencies / `"use client"` invariant / composition policy / portability**.

Where [0021](0021-frontend-responsibility.md) is the **SSOT for the responsibility matrix, the naming discipline and the promotion rule** across all kernels, this ADR sets the **contents** of the `capabilities` kernel. This follows the established practice that "a kernel with real substance has its own ADR" (`config` → [0030](0030-environment-variable-management.md) / `errors` → [0080](0080-error-handling.md) / `logging`, `observability` → [0081](0081-observability-logging.md) / the contents of `adapters` → [0071](0071-bff-api-integration.md)). The lightweight `model` / `components` are covered within 0021, whereas `capabilities` has thick contents (responsibilities + the RSC invariant + composition policy + portability), so it is made independent.

## Status

Accepted

## Context

[0021](0021-frontend-responsibility.md)'s **promotion rule** (promote cross-cutting elements spanning features to `model` / `components` / `adapters`) on its own **has no exit for reactive cross-cutting client hooks**. A "cross-cutting client hook in the frontend domain (an extension point / seam)" such as `useOnlineStatus` is neither display logic, nor UI, nor an external connection, and needs a promotion target when multiple features use it.

[0021](0021-frontend-responsibility.md)'s naming discipline states: "the moment a place that cannot name its role becomes necessary, that is a gap in the design; **if something truly needs to cut across, create it after defining its role in an ADR addendum**". This ADR follows that clause and sets up the kernel after defining its role. There is no counterpart among the onion's layers (React client hooks are specific to the frontend).

## Decision

### Responsibilities

`capabilities` is the kernel that **supplies the capabilities of the runtime (browser + the Next.js framework) as reactive client hooks**. Expected hooks:

- `useOnlineStatus` (online/offline detection = subscribing to `navigator.onLine`)
- `useMediaQuery` / breakpoint
- `useClipboard`
- Web Storage (`useLocalStorage` / `useSessionStorage`) / reading client cookies
- safe-area / viewport
- Page visibility (confirming something as read, suppressing reconnection while hidden)
- navigation-block (leave guard). Not promoted while only one feature declares it — the promotion rule requires references from multiple features, so until then it is enough for the feature to bundle the components (`components`)
- Scroll control
- Offloading to Web Workers (seam)

Keyboard shortcuts are excluded from the hook examples because they are deferred and excluded ([0053](0053-ui-component-interaction-seam.md)). What does not change is that, if global shortcuts are adopted, they go in `capabilities`.

### The `"use client"` Invariant (client-only)

`capabilities` is **fixed as client-only (`"use client"`)**. Its position follows the **two-axis model** ([0024](0024-adapters-server-client-split.md)):

- **WHAT**: `adapters` = the boundary with *remote external systems the app calls* (backend APIs, etc.) / `capabilities` = the boundary with *the local runtime the app runs inside* (browser + framework)
- **WHERE**: `capabilities` is client only. `adapters` has both server / client faces (split into the two faces `adapters/server` and `adapters/client` in [0024](0024-adapters-server-client-split.md))

`capabilities` is **not** a "client mirror" of `adapters`; **its WHAT differs** (the runtime boundary). The RSC boundary of both (server-only / use-client) is **not enforced by ESLint boundaries** — the boundary check looks only between layers and areas and has no distinction between server and client. Enforcement is held by the build-time failure of `import "server-only"` and by [`scripts/server-only.gate.test.ts`](../../scripts/server-only.gate.test.ts) ([0024](0024-adapters-server-client-split.md) / [0040](0040-routing-rendering-strategy.md)). **Local browser APIs (Web Storage / clipboard / reading cookies) are browser runtime APIs, not "external systems", so `capabilities`, not `adapters`, owns them**.

### What Does Not Belong Here

- **Remote IO** (fetch / WebSocket, SSE / sending analytics or telemetry) → `adapters/client` ([0024](0024-adapters-server-client-split.md)). Note: Web Storage / reading cookies are local runtime APIs, not remote, so `capabilities` owns them ("Responsibilities" above)
- **State of the communication mechanism** (whether a stream is alive = the state of an `EventSource`, the remaining reconnection backoff) → the subscription seam in `adapters/client` ([0074](0074-runtime-communication-seam.md)). Whether there is a connection is a runtime capability, but whether a stream is alive is state of the communication mechanism; **the two are different things, and screens need both**
- **server config** (the runtime config object holding secrets; not allowed because this is client). Note: client config (= NEXT_PUBLIC build-time inlined **literals**) is a public constant rather than a runtime object and may be imported ([0030](0030-environment-variable-management.md))
- **Business state**
- **UI markup** → `components`
- **Policy state**: consent-gate is owned by [0131](0131-cookie-consent.md)'s mechanism (the supply route of [0031](0031-policy-state-supply.md)), and feature-flag by [0078](0078-dynamic-feature-flag-seam.md)'s seam. `capabilities` is **limited to runtime capabilities** (policy hooks do not go here)

### Dependencies

| Layer (importing side) | Allowed import targets |
| --- | --- |
| `capabilities` | `model` / `errors` / `logging` / client config (**no server config**; no secrets. client config = NEXT_PUBLIC literals allowed. [0030](0030-environment-variable-management.md)) |
| `features` | Existing + **`capabilities`** |

- **`components` is unchanged** (`model` / `errors` only) = **`components` does not import `capabilities`**
- **The fourth exit of the promotion rule**: reactive cross-cutting client hooks (runtime capabilities) → to `capabilities`. A hook used by only one feature stays co-located inside the feature ([0021](0021-frontend-responsibility.md)'s acceptance criteria 1 and 2)

### Features do the composition

Calling hooks and wiring them to UI (composition) is done by the **feature**. **No composition logic is written in app (route / page = driving adapter)** (the thin-app principle of [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md)).

- **The Provider mount exception**: mounting a Provider exported by `capabilities` in the root layout is treated as **the layout's thin mount exception** (app only places `<Provider>` and stays thin; the feature calls `useXxx()` directly, and `components` stays props-in = the feature owns the prop wiring). **The convention that generalizes this mount exception from capabilities alone to cross-cutting UI / Providers in general is set by [0026](0026-layout-shell-mount.md)**
- **Behavior hooks tightly bound to UI** (focus-trap / scroll-lock, etc.) are **co-located** with that component rather than placed in `capabilities` (they are UI behavior, not runtime capabilities). For responsive decisions, **prefer CSS (Tailwind breakpoints / `@container`)** over JS hooks ([0050](0050-styling-strategy.md)), and avoid overusing `useMediaQuery`

### Naming

`capabilities` is a **role name** (supplying runtime capabilities). Kernels with mechanism names such as `hooks` / `utils` remain **prohibited** ([0021](0021-frontend-responsibility.md) bans places that do not name a role). Co-locating a single hook inside a feature is allowed as before.

## Portability

A feature's portability is **relative to the kernel contracts** (it is not a zero-dependency island). A feature that consumes `capabilities` is **as portable** as a feature that consumes `components`, and `capabilities` widens the foundation (the kernels) of that portability rather than threatening it.

To maximize portability, the hook APIs of `capabilities` lean toward **the shape of the de facto standard** (the idiomatic signatures of `useOnlineStatus` / `useMediaQuery`, etc.) ([0010](0010-standards-and-non-lockin.md)'s conformance to standards). The more standard the shape, the more likely an equivalent kernel is found in the destination project, and the feature plugs in as is.

## Prohibitions

- ❌ Placing server-executed code / remote IO / server config / secrets / business state / UI markup in `capabilities` (NEXT_PUBLIC literals in client config are allowed) (Enforcement: the build-time failure of `server-only` and `scripts/server-only.gate.test.ts` fail on server-executed code and server config; ESLint `project-rules/no-markup-outside-ui-layers` fails on UI markup; ESLint boundaries (no `adapters`) and `no-restricted-syntax` (assembling subscriptions) fail on most remote IO. A raw `fetch` is Prose — **mechanizable** (fail `fetch` calls under `src/capabilities/`. No rule exists). Secrets and business state are **not mechanizable**: they are decided by the meaning of the value)
- ❌ Mixing client hooks into `adapters/server` (server-only) / giving `adapters/client` secrets (the RSC and secret boundaries; [0024](0024-adapters-server-client-split.md))
- ❌ `components` importing `capabilities` (composition goes through the feature; UI behavior hooks are co-located with the component) (Enforcement: ESLint `boundaries/dependencies` (`DEPENDENCIES.components` in `architecture.ts` has no `capabilities`))
- ❌ Writing composition logic in app (route / page) (only a thin Provider mount is allowed) (Enforcement: Prose — **partly mechanizable**. Hook calls in a route / page could be caught as calls starting with `use` in `src/app/**`, but no rule exists. Whether anything else is composition or a thin mount is decided by how values are used and cannot be expressed as a set of imports)
- ❌ Giving `capabilities` policy state (consent / feature-flag) (each seam owns it) (Enforcement: Prose — **not mechanizable**. Whether state is policy or a runtime capability is decided by the meaning of the state and not by the shape of the code)
- ❌ Giving `capabilities` the state of the communication mechanism (whether a stream is alive, backoff) (the subscription seam owns it) (Enforcement: ESLint `no-restricted-syntax` fails on assembling an `EventSource` / `WebSocket` in `capabilities`. Holding a copy of the subscription seam's state is Prose — **not mechanizable**: whether it is a copy is decided by the meaning of where the state comes from)
- ❌ Creating a `hooks` kernel with a mechanism name (the role name `capabilities` is its home) (Enforcement: ESLint `boundaries/no-unknown-files` (fails on files under `src/hooks/`, which is not in `KERNELS`))

## Related ADRs

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — feature slices × presentation-layer kernels (the parent declaration of this kernel)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the SSOT for the responsibility matrix / naming discipline / promotion rule. Invokes the naming-discipline clause "if something needs to cut across, define its role in an addendum before creating it"
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — the two-axis model (this kernel is not a "mirror" of adapters but a runtime boundary with a different WHAT) / the client face of remote IO = `adapters/client`
- [0074-runtime-communication-seam.md](0074-runtime-communication-seam.md) — the subscription seam (owner of the communication mechanism's state)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — where the policy state this kernel does not hold (consent / flag) is supplied
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — the Provider mount exception (generalized from this ADR's capabilities-only form)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the contents of `adapters` (BFF / API integration)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the RSC / Client boundary (the basis for the `"use client"` invariant)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — conformance to standards (hook APIs follow the de facto standard for portability)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) / [0080-error-handling.md](0080-error-handling.md) / [0081-observability-logging.md](0081-observability-logging.md) — precedents for "a kernel with real substance has its own ADR"
- [0131-cookie-consent.md](0131-cookie-consent.md) / [0078-dynamic-feature-flag-seam.md](0078-dynamic-feature-flag-seam.md) — the consent mechanism / feature-flag seam (owners of policy state; not placed in `capabilities`)
