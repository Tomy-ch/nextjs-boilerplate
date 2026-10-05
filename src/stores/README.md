---
imports-allowed: [model, errors, config] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [adapters, components, capabilities, server-config, business-logic]
test-requirement: unit
---

# stores

The client-only kernel that holds client state shared by multiple features. Stores are implemented with Zustand.

## What Belongs Here

- Cross-cutting client state such as selection state, wizards, and global UI toggles
- Policy state that is **needed synchronously before the first render, and is reactive**. A value meeting both conditions is held here
  together with its raw reads and writes ([0031](../../docs/adr/0031-policy-state-supply.md), on how the home of such a value is decided)

## What Does Not Belong Here

- Server state, single-feature state, UI markup, secrets, business logic

## Modules

| Module | Role |
| --- | --- |
| `consent-store.ts` | The intent on whether cookies may be used for optional purposes. Persists the chosen result to a cookie and reflects it in the tree on the spot |

<!-- sample:begin -->
What the bundled sample adds:

| Module | Role |
| --- | --- |
| `cart-store.ts` | The request "is the cart open" shared by the sample screens. An example of exposing the hook as is and having readers use a selector |

<!-- sample:end -->
## Operations

- In client-only implementations, place `"use client"` at the smallest boundary
- Single-feature state stays as local state inside the feature
- The store `create` returns is one per module and needs no Provider. If a shape that needs a Provider is adopted, its
  mount position is set by [0026](../../docs/adr/0026-layout-shell-mount.md)

### Store Shape

- One store per file. The file is `<subject>-store.ts`, the type `<subject>Store`, the hook `use<subject>Store`. The test
  sits next to it as `<subject>-store.test.ts` (`.tsx` if it touches the DOM) (flat co-location in [0027](../../docs/adr/0027-directory-structure.md)).
  `pnpm gen` has no store kind (only `feature` / `component` / `adapter`), so place it by hand
- Put the initial values and the update operations together in the initializer of `create<State>()`. Operations are held as part of the state, and readers
  are not made to call `setState` directly — the entry points for updates line up inside the store
- Readers **select each value with a selector** (`useXStore((s) => s.field)`). Taking the whole store re-renders every time an unrelated value
  changes. A side that needs only operations selects only operations — operation references do not change, so it does not re-render when the state moves
- There are two shapes of public surface. If the readers are features and reads and writes have no side effects, export the hook as is.
  **If reads or writes carry side effects** (reading back from storage, writing to storage), do not export the store; expose only a hook that returns the state and
  a function that writes. **Writing and reflecting are combined into one function** — making them separately callable allows a state that was written but
  not reflected, and the reverse (example: `decideConsent` in [`consent-store`](consent-store.ts))

### How to Cut the State Held

- **What is held is the request, not the presentation.** Hold "wants to see the contents"; whether a drawer covers the body or the sidebar appears
  is decided by the container that knows the width. Holding the presentation in the store makes the store change every time the container changes
- Do not hold copies of server-owned values ([0023](../../docs/adr/0023-stores-kernel.md)). **The more something looks like it would be held,
  the more the doc should say it is not** — as in a store that holds open/closed but not the contents
- **Write the lifetime in the doc**: whether it survives a reload, and if so, where it is stored. A store that survives is bound by the initial-value constraint in the next subsection

### Server-Side Initial Values and Hydration

- **Initial values are the same on the server and in the browser.** The initializer does not read `document` / `window` / `location` / storage
  — they do not exist on the server, and even if they did, the two sides would get different values
- For values readable only in the browser, **put "not read yet" as the initial value, and read once in an effect after the hook mounts.**
  Hold it separately from "read but absent" — both keep the gate closed, but whether to ask is reversed (the discriminated union shape is
  `ConsentState` in [`model/consent`](../model/consent.ts)). Check whether reading has finished before reading, and do not
  read again on a second mount. Subsequent rewrites are done only by the writing function
- As a consequence, the server does not know the value, so **surfaces that depend on the value appear after it is read**. The only choices are to render without knowing or to
  wait until it is known. The basis for not reading it on the server side is owned by [0131](../../docs/adr/0131-cookie-consent.md)
- **The server-side snapshot of a Zustand hook is `getInitialState()`**, which returns the initial value even after reading has finished. Under Cache
  Components, when a dynamic hole arrives, hydration of the subtree runs once more, the server snapshot is read at that moment, and the state
  rolls back to "not read yet" — the shown surface disappears once and reopens, and that disappearance is counted as layout shift.
  **A store that reads back after mount does not expose the Zustand hook**; it ties things together with `useSyncExternalStore(store.subscribe, snapshot,
  snapshot)` and a single snapshot function that returns the same current value on both sides (example: `useConsentState` in [`consent-store`](consent-store.ts)).
  The general discussion of hydration mismatches is
  [`docs/design/rendering.md`](../../docs/design/rendering.md#hydration-mismatches-are-not-accidental) "Hydration mismatches are not accidental"

### Stores That Write to Browser Storage

- Making cookie attributes explicit per purpose, the consequences of being unable to set `HttpOnly`, converging the spelling on one place in `model`,
  and the declaration that turns off biome's `noDocumentCookie` through per-file overrides are owned by the app-cookie item of
  [`docs/rules.md`](../../docs/rules.md#data-classification)
- **`secure` is set only when `location.protocol === "https:"`.** Always setting it means that in development on `http://localhost` the cookie is
  not saved, and even after choosing, the next render asks again
- Interpreting the spelling (which way to fall for an unreadable value, matching versions) belongs in `model`; the store holds only the read/write entry

### The Consuming Side

- `components` cannot import `stores` ([`docs/design/placement.md`](../../docs/design/placement.md)).
  UI that reads a store goes in a feature, or in an `app` island that the root layout mounts
- For state that spans every screen, gather the surfaces that read it into **one island**. If separate islands subscribe to the same state,
  there is a moment right after a change when only one of them has reacted
- A story sets the state with `useXStore.setState(...)` inside a decorator, before rendering. Values that change per story are
  received through `parameters`

### Writing Tests

- `test-requirement` is `unit`. A store without hooks is exercised with `getState()` / `setState()` / `subscribe()`, and the
  node environment suffices. A store with hooks (one that ties in `useSyncExternalStore`) is exercised with Testing Library's
  `renderHook` / `act`, with `// @vitest-environment jsdom` at the top of the file (the default is node)
- A store that is one per module carries over the previous test's state. Reset it to the initial values with `setState` in `beforeEach` —
  the same goes for tests on the reading side
- **A store that reads back once after mount cannot be reset with `setState`** (whether it has read is also held by the module). Per test,
  `vi.resetModules()` and then re-read with a dynamic `import`, placing the stored value beforehand
- The server-side snapshot is pinned by rendering a Probe with `renderToStaticMarkup`. Both that it returns "not read yet" before reading,
  and that it returns the read value after reading has finished
- Cookie attributes are not visible by reading `document.cookie` (the getter returns only names and values).
  Capture the written string with `vi.spyOn(document, "cookie", "set")`. For the https side,
  `vi.stubGlobal("location", { protocol: "https:" })`. Clean up in `afterEach` with `vi.unstubAllGlobals()` and
  an overwrite with `max-age=0`
- Pin with `subscribe` that changes reach the subscribing side
- The order of cases follows [`docs/testing-conventions.md`](../../docs/testing-conventions.md) (a store is a "subject that returns a value";
  `// ----- 正常系 -----` / `// ----- 異常系 -----`)

### How to Add One

1. Check the promotion criteria — whether two or more features read and write it, or whether the two conditions of [0031](../../docs/adr/0031-policy-state-supply.md)
   both hold. If neither, it is local state inside the feature
2. Create `<subject>-store.ts` and put `"use client"` in it
3. Write the types, initial values and operations. In the doc, write "copies not held" and "lifetime", and, if there are values readable only in the browser, when they are read
4. Place the test next to it
5. Add one row to the "Modules" table above. In the kernel dependency table of the reading feature's README, write why it is cross-cutting

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: adapters` — does not import `adapters` and holds no remote IO such as `fetch`. Server state is held by RSC and `adapters` | violation. Imports are failed by machines, so what is checked here is calls to the global `fetch` | The prohibitions in [0023](../../docs/adr/0023-stores-kernel.md). Machine: ESLint boundaries |
| `forbidden: components` — does not import UI components and holds no UI markup | violation | The prohibitions in [0023](../../docs/adr/0023-stores-kernel.md). Machine: ESLint boundaries and `project-rules/no-markup-outside-ui-layers` |
| `forbidden: capabilities` — does not import `capabilities` | violation | The dependency matrix of [0021](../../docs/adr/0021-frontend-responsibility.md). Machine: ESLint boundaries |
| `forbidden: server-config` — does not import server config (`*.server.ts`) and holds no secrets. Public `NEXT_PUBLIC_` constants (`*.client.ts`) may be read | violation | The prohibitions in [0023](../../docs/adr/0023-stores-kernel.md) / the dependency matrix of [0021](../../docs/adr/0021-frontend-responsibility.md). ESLint sees `config` only at layer granularity |
| `forbidden: business-logic` — holds no business logic. What it holds is only cross-cutting client state and its updates | violation. suggestion when a state update cannot be told apart from a business judgment | The prohibitions in [0023](../../docs/adr/0023-stores-kernel.md) |
| API responses are not copied into a store to cache them twice. A snapshot of display values included in a record of a selection is not such a case | suggestion (who owns freshness is not determined by the store's type) | The prohibitions in [0023](../../docs/adr/0023-stores-kernel.md) |
| The stores placed here are used by multiple features. Values that came here by [0031](../../docs/adr/0031-policy-state-supply.md)'s rule for deciding where such a value lives (needed synchronously before the first render, and reactive) are outside this count | suggestion if fewer than two feature slices import it | The prohibitions in [0023](../../docs/adr/0023-stores-kernel.md) / [0031](../../docs/adr/0031-policy-state-supply.md), how the home of such a value is decided / this README, "Operations" |
| Zustand stores are not created outside `src/stores/` | violation | The prohibitions in [0023](../../docs/adr/0023-stores-kernel.md) |
| Initializers do not read browser-only values, and stores that read back after mount tie things together with a snapshot that returns the same current value on both sides | violation if an initializer touches `document` / `window` / `location` / storage. violation if a store that reads back after mount exposes the Zustand hook as is. suggestion if there is no test pinning it with `renderToStaticMarkup` | This README, "Server-Side Initial Values and Hydration" |
| A store's doc states the copies it does not hold and its lifetime | suggestion if not stated | This README, "How to Cut the State Held" |

## Related ADRs

- [0021](../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries
- [0023](../../docs/adr/0023-stores-kernel.md) — The cross-cutting client state this kernel handles, and the line against holding copies of server state
- [0026](../../docs/adr/0026-layout-shell-mount.md) — The exception for mounting Providers and islands that span every screen in the root layout
- [0027](../../docs/adr/0027-directory-structure.md) — Flat co-location within a kernel
- [0031](../../docs/adr/0031-policy-state-supply.md) — The shape of supplying policy state such as consent, and the conditions under which `stores` holds it with its raw reads and writes
- [0041](../../docs/adr/0041-cache-components-decision.md) — Adopting Cache Components. Reading the cookie server-side in the root layout would give every screen a dynamic hole, so it is read back in the browser
- [0060](../../docs/adr/0060-state-management.md) — Adopting Zustand, and who holds server state
- [0131](../../docs/adr/0131-cookie-consent.md) — The decision to read consent state on the browser side, and its consequences
