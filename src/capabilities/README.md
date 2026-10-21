---
imports-allowed: [model, errors, logging, config] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [adapters, components, stores, server-config, business-state]
test-requirement: unit
---

# capabilities

The kernel that holds client hooks for browser runtime capabilities used by several features: connectivity, media queries, storage, clipboard and the like.

## What Belongs Here

- Client-only hooks used across features, and thin abstractions over browser APIs

## What Does Not Belong Here

- Remote IO, server config, business state, UI, policy state
- Hooks for behaviour tied closely to UI (focus trap / scroll lock and the like). They are UI behaviour, not runtime capabilities, so they are
  co-located with that component ([0022](../../docs/adr/0022-capabilities-kernel.md), on composing such behaviour with its component)

## Operations

- In a client-only implementation, place `"use client"` at the smallest boundary
- A hook used by a single feature goes inside that feature
- The shape of exporting a Provider and mounting it in the root layout is set by [0022](../../docs/adr/0022-capabilities-kernel.md) /
  [0026](../../docs/adr/0026-layout-shell-mount.md). Whether a hook called outside its Provider throws or
  becomes a no-op is decided by the hook ([`docs/rules.md`](../../docs/rules.md#layers))

### Shape of What Is Supplied

What a hook returns is decided by whether the capability is **a value that keeps changing** or **an event that happens once**.

- **A value that keeps changing** (a condition matching, connectivity, the most recent direction) is supplied with `useSyncExternalStore`.
  Place `subscribe` / `snapshot` / `serverSnapshot` as separate functions, and pair starting and ending a subscription through `subscribe`'s
  return value. Do not copy the browser's value into `useState` and track it with `useEffect` — this is React's standard shape for reading
  an external value ([0022](../../docs/adr/0022-capabilities-kernel.md), portability),
  and the server-side initial value stands in one place, `serverSnapshot`
- **An event that happens once** (an element became visible) is received through a callback, and the hook returns a ref to hand to the observed target. Distributing "it happened"
  as state makes each reader write an effect that watches it and a ref that holds the latest handler, and that set multiplies by
  the number of readers. The callback keeps the latest in a ref and **does not resubscribe when the handler changes** — an event that occurs
  at the moment of resubscribing is lost
- **It does not hold what to do.** It only notifies; what to start there is decided by the caller
- Optional tuning (the distance in advance, whether to observe) is taken in one options object, and the hook holds the defaults.
  **Whether to observe is taken as an option, and while it is `false` no subscription is held at all** — so that mounting the element and
  having a subscription can be handled separately (stopping only the notification while keeping the marker, in cases like "finished reading" or "nothing more to load")
- When deriving a direction or step from a jittery input, place a dead zone as a named constant and write its reason in the constant's doc.
  Switching at the smallest unit makes the appearance keep flipping with finger tremor or inertial rebound (e.g.
  `THRESHOLD_PX` in [`use-scroll-direction`](use-scroll-direction.ts))
- Align the hook API with the de facto standard shape (the conventional signature) ([0022](../../docs/adr/0022-capabilities-kernel.md),
  portability)

### Server-Side Initial Values

The server has no browser values. Place `serverSnapshot` as a function that returns **the appearance the initial HTML should take**, and
write in its doc "always returns X" and why that side. The choice is "the side where the user has not done anything yet" or "the side the
very delivery of that HTML presupposes", and every implementation decides the same way.

| Capability | Server value | Basis for the choice |
| --- | --- | --- |
| Condition matching | The not-matching side | The condition cannot be evaluated. UI that appears only on the matching side appears after hydration |
| Connectivity | The connected side | What is delivered to a disconnected device is a cached response |
| Most recent direction | The not-yet-moved side | The position cannot be known |

**For a capability with no value on the server, write these three points in the hook's `@remarks`**: the server value, which appearance the
initial render takes (whether it is operable until hydration also follows that appearance), and the conditional rendering that is therefore unusable (anything that changes the body's
width or order). The display shifts at hydration by however much the initial value and the actual environment differ, so it is not used for conditional rendering that moves positions
(express those in CSS). Which conditional rendering may be used is *Where Callers Draw the Line*.

### How Subscriptions Are Held

- If the value is decided by arguments (query), hold a subscription per call and resubscribe with the arguments as deps
- If there is only one value per screen (scroll direction), fold the subscription into one per module. Hold a set of listeners,
  **start observing on the first subscription and stop on the last unsubscription**. Attaching a listener per component runs the same
  computation that many times on every event. Folding gives the module state, so tests reload the module (*Writing
  Tests*)
- Attach scroll listeners with `{ passive: true }`
- Always return the unsubscription, and pin it in tests

### Where Callers Draw the Line

- **Conditional rendering that moves positions is done in CSS, not with these hooks.** What may use them is what cannot work
  with the DOM left in place (a surface with a focus trap), and what does not move positions when it appears. The rule is held by
  [`docs/rules.md`](../../docs/rules.md#layout), and the relationship with hydration by
  [`docs/design/rendering.md`](../../docs/design/rendering.md#some-things-only-the-server-knows-and-some-only-the-browser-knows)
- When a width step is the condition, do not write numbers; pass the string [`model/breakpoint`](../model/breakpoint.ts) builds from
  design tokens. Write numbers on the JS side and they drift from the CSS boundaries when the steps are replaced
- **A capability and whether what follows succeeds are separate.** Having a connection is separate from communication succeeding; the liveness of a connection is held by
  the side that holds the connection (the subscription seam). A screen needs both ([0022](../../docs/adr/0022-capabilities-kernel.md),
  which excludes connection liveness from this kernel)

### Writing Tests

**Hook tests use Vitest + React Testing Library's `render` / `act`**. `test-requirement` is
`unit`, but anything that uses React's hook API internally can only be called through a React tree, so it cannot be verified by the same means as
pure logic (the selection criterion is "does the subject use the hook API"; [0090](../../docs/adr/0090-testing-strategy.md)).

- Put `// @vitest-environment jsdom` at the top of the file. The default environment is node (`vitest.config.ts`)
- Write a Probe component that only calls the hook, and read the return value reflected in the rendered output
  ([`docs/testing-conventions.md`](../../docs/testing-conventions.md#component-and-hook-tests--testing-library-principles), "Assert what the user observes")
- `vitest.setup.ts` supplies browser APIs jsdom lacks (that file holds the list of what it supplies). **A test that needs to cause a
  change places, in that file, a minimal implementation it can control via `vi.stubGlobal`** — the shape that returns a set of listeners
  and `change` / `fire` to trigger them. Read-only values (`navigator.onLine` / `window.scrollY`) are
  replaced with `vi.spyOn(…, "get")` / `Object.defineProperty`
- Pin the server-side initial value by rendering with `renderToStaticMarkup`. Run it with no stub, and confirm it returns the initial value
  without looking at browser values
- Pin the unsubscription. For a per-subscription hook, the listener count after unmount is 0; for a hook folded into the module,
  `removeEventListener` is called only when the last component detaches, and not while components remain
- A subscription folded into the module carries over the previous test's state. Per test, `vi.resetModules()` and then reload it with a dynamic
  `import`, swapping what the Probe calls

## Hooks Provided

| hook | Capability supplied |
| --- | --- |
| [`use-media-query`](use-media-query.ts) | Matching media conditions such as width and input method |
| [`use-online-status`](use-online-status.ts) | Whether the connection is up (subscribing to `navigator.onLine`) |
| [`use-scroll-direction`](use-scroll-direction.ts) | Which way the most recent scroll went |
| [`use-on-visible`](use-on-visible.ts) | That an element became visible (subscribing to `IntersectionObserver`) |

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: adapters` — do not import `adapters`, and hold no remote IO such as `fetch` | violation. Imports and subscription assembly (`EventSource` / `WebSocket`) are failed by the machine, so what is checked here is calls to the global `fetch` | [0022](../../docs/adr/0022-capabilities-kernel.md) prohibitions. Machine: ESLint boundaries and `no-restricted-syntax` |
| `forbidden: components` — do not import UI components | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) dependency matrix. Machine: ESLint boundaries |
| `forbidden: stores` — do not import `stores` | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) dependency matrix. Machine: ESLint boundaries |
| `forbidden: server-config` — do not import server config (`*.server.ts`). `NEXT_PUBLIC_` public constants (`*.client.ts`) may be read | violation | [0022](../../docs/adr/0022-capabilities-kernel.md) prohibitions / [0021](../../docs/adr/0021-frontend-responsibility.md) dependency matrix. ESLint sees `config` only at layer granularity |
| `forbidden: business-state` — hold no business state, no policy state such as consent or feature flags, and no communication-mechanism state such as subscription liveness or backoff. Hold only browser runtime capabilities | Business state is a violation. When it cannot be read whether a state is a copy of policy or communication-mechanism state, suggestion | [0022](../../docs/adr/0022-capabilities-kernel.md) prohibitions |
| The hooks placed here are used by several features. A hook dedicated to one feature goes inside that feature | A suggestion if only one feature uses it | [0022](../../docs/adr/0022-capabilities-kernel.md) / this README, *Operations* |
| For a capability with no value on the server, the server-side initial value is written in the hook's doc | A violation if not written. A suggestion if there is no test pinning it with `renderToStaticMarkup` | This README, *Server-Side Initial Values* / *Writing Tests* |
| A value that keeps changing is supplied with `useSyncExternalStore`, naming `serverSnapshot` | A suggestion for the shape that copies a browser value into `useState` and tracks it with `useEffect` | This README, *Shape of What Is Supplied* |
| A hook that subscribes returns the unsubscription, and a test pins it | A violation if there is no unsubscription. A suggestion if no test pins it | This README, *How Subscriptions Are Held* / *Writing Tests* |

## Related ADRs

- [0021](../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries
- [0022](../../docs/adr/0022-capabilities-kernel.md) — The scope this kernel takes on, and the line that keeps single-feature hooks from being promoted
- [0026](../../docs/adr/0026-layout-shell-mount.md) — The exception for thinly mounting Providers in the root layout
- [0040](../../docs/adr/0040-routing-rendering-strategy.md) — How Server / Client Components are split, and where `"use client"` goes
- [0090](../../docs/adr/0090-testing-strategy.md) — What tests each layer is responsible for, and co-location
