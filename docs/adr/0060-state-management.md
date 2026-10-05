# State Management Policy

For state management, this ADR defines **the default for Server state / the starting point for Client state (local-first) / the adoption of a form state library and a cross-cutting client state library**.

## Status

Accepted

## Context

This repository is "a general Next.js application foundation", and both form input and cross-cutting client state are everyday requirements of it. Therefore form state = **react-hook-form + zod** (`@hookform/resolvers`) / cross-cutting client state = **Zustand** (its home is the [0023](0023-stores-kernel.md) `stores` kernel) are adopted in the core. The default is local-first (local for a single feature / server state via RSC fetch), and the libraries are used only for what is needed outside that default. This ADR settles how to divide Server state (TanStack Query, etc.) / Client state (Zustand / Jotai / Context) / Form state / URL state.

## Decision

### Server state = Server Component fetch by default

- Server-originated data uses **`fetch` inside Server Components by default** ([0040](0040-routing-rendering-strategy.md))
- Client-side data fetching and caching (TanStack Query, etc.) is not presupposed in this repository. The needed orchestration of fetching goes through a feature's server functions / `adapters` ([0021](0021-frontend-responsibility.md) / [0071](0071-bff-api-integration.md)). Caching design is the responsibility of **[0071](0071-bff-api-integration.md) (BFF / API integration)**. Only incremental fetching for infinite scroll is owned by [0073](0073-pagination-fetch-boundary.md), as a limited exception to this default

### Client state = local-first

- Client state **starts from local state (`useState` / `useReducer`)**. Context is not overused and is limited to ranges that truly need sharing across the tree
- **Deep passing is solved by composition first.** If intermediate components only pass a value through, pass `children` to that component and remove the passing path itself. Context is used only when the caller cannot decide where in the tree the receiving side appears
- URL state (search params / route params) is handled with Next.js's standard mechanisms ([0040](0040-routing-rendering-strategy.md))
- **searchParams sync helpers such as `nuqs` are not adopted**. They pass [0004](0004-library-management.md)'s primary check, but list filters / sort / paging work through **URL change → RSC refetch**, so no layer that syncs client state with the URL is needed. Bring one in after implementing and feeling a shortfall
- **However, "not bringing it in" does not mean each screen may implement its own**. The standard form of `searchParams` is held in **two places, the reading side and the building side**. The reading side is a zod schema passed through `model/search-params.ts` (the rule that turns repetitions of the same key into the value's meaning; `RawSearchParams` / `singleValue` / `repeatedValues`), and `page.tsx` passes the raw `searchParams`, still as `RawSearchParams`, to the feature's reading module (`read-<target>.ts`). The building side (the URL's spelling and the vocabulary of keys) is held in one place by the destination feature, in a module separate from the reading side. The rules for falling back to the default or dropping, and what to put in the URL, are owned by [docs/rules.md](../rules.md#url). Enforcement: the unit tests of `model/search-params` and of each feature's reading module. Making the reading side always go through `model/search-params` is Prose — **mechanizable** (declarations that receive `page.tsx`'s `searchParams` as anything other than `Promise<RawSearchParams>`, and direct property references on `RawSearchParams` values outside `model/search-params`, can be detected statically, but no rule exists)
- State that completes within a single feature stays local in the feature (without cross-cutting use it is not promoted; the promotion rule of [0021](0021-frontend-responsibility.md))

### Form state = react-hook-form + zod

- Form state adopts **react-hook-form**, and validation connects **zod schemas** via `@hookform/resolvers` (`zodResolver`). Its home is **`features` / `components`** (each form is feature-local; not a kernel)
- zod schemas are **separated into two layers** (the two-layer separation of [0062](0062-form-input-validation.md) is the authority). What is fed to the client's `zodResolver` is **the hand-written display-validation schema in `model`** (the SSOT of UX field rules; not a wire contract), and the same display-validation schema can be shared by the revalidation on the Server Action side (centralizing validation rules and types holds at this layer). On the other hand, **contract validation with the server is handled by the generated schemas at the `adapters` boundary** ([0072](0072-api-type-generation.md) / [0071](0071-bff-api-integration.md)), and generated wire schemas are not fed directly to the resolver
- Do not mix approaches to input state. Forms with multiple fields, validation and error display go to react-hook-form (client input state and validation), and a very simple single input may stay plain uncontrolled (`<form>` + `FormData`). **In either case, submission itself merges into [0061](0061-form-mutation-ux.md)'s `<form action>` + `useActionState` (the Server Actions mechanism)**, and rhf does not replace the submission mechanism to duplicate it (even with rhf, `FormData` goes straight to the Server Action via `<form action>`)

### Drawing the line between server-side and client-side processing

Server Actions and Server Component fetch are the default in order to **offload to the server the processing the screen side would otherwise look after**. So when moving something to the server would instead increase the processing, it is a client concern. The judgment is made not by a sense of difficulty but by this one point.

**Does the server have that information?**

- **Operations that change state are on the server**. The backend holds the authority for the result ([0061](0061-form-mutation-ux.md) / [0070](0070-backend-role-separation.md))
- **Fetching the data needed for display is also on the server**. The client holds no copy (this ADR's default / [0023](0023-stores-kernel.md))
- **How the screen currently looks is on the client**. Something the server does not know and does not need to know

**The sign that the line has been crossed is when the screen's previous appearance needs to be rebuilt from the server's response.** The clues for rebuilding were never held by the server, and the client knew them from the start. If the client side starts carrying those clues around as numbers or orderings, it is writing server-driven what cannot be written server-driven.

There is also crossing in the opposite direction. **Anything that, once given to the client, needs freshness management such as refetching, invalidation or subscription is a server concern** and must not be pushed down ([0023](0023-stores-kernel.md)'s three conditions).

This line follows the same idea as a design that separates the path of change from the path of reference. **Do not mix "how the screen looks", which belongs to neither, into either of them.**

### There are four means of writing state transitions, used by purpose

Means overlapping is not the problem. **Allowing several means while their purposes overlap** is the problem. Purposes are assigned as follows.

| Means | Purpose | Condition for use |
| --- | --- | --- |
| `useState` / `useReducer` | **State that completes inside one component**. A few transitions, no conditional branching | The default. Start here |
| Discriminated union (`ActionState<T>`, etc.) | **Making states that cannot coexist mutually exclusive in the type**. The possible shapes are finite, and each shape holds different values | When the accompanying values change per state, as with submission results and fetch results |
| Zustand (`stores`) | **Cross-cutting state read by several features**. To be referenced independent of position in the tree | When [0023](0023-stores-kernel.md)'s acceptance criteria are met |
| **XState** | **State where the transitions themselves are the specification and their correctness needs pinning** | When all three conditions below are met |

**Conditions for using XState** (all must be met).

1. The same screen has **four or more states**
2. Transitions are **conditional** (the same operation goes to different destinations depending on the current state)
3. A transition error becomes **damage visible to users** (double submission, rollback, unreachable screens)

What does not meet the three conditions is written with the three means above. **Having many states is not a reason in itself** — however many there are, if the transitions are linear `useReducer` suffices, and bringing in a state machine makes readers go back and forth between the state table and the implementation.

**Record of adoption**: `xstate` passes [0004](0004-library-management.md)'s primary and secondary checks (responsibility name = state transitions / MIT / TypeScript 1st-party / React 19 support / single publisher). **It is added as a dependency in the first implementation PR that meets the conditions above**, and that PR's body carries 0004's checklist. Do not place the dependency alone with nothing using it.

### How far to lift state

**Keep ancestors light.** The closer to the root, the more state placed there drags in everything below. To avoid raising the page's load, state is placed at **the smallest common ancestor needed**.

**If placing it in an ancestor, design down to a form where the descendants are not affected by it.** When lifting as an exception, satisfy the following.

- Among the components below, **only those that need to read** the state read it (it is not distributed to everything)
- When the state changes, the rendering of components that do not read it does not change
- It is at a position where the state is not lost when the layout shell disappears — confirm that **the reason for lifting is "lifetime"**

**Do not push down on account of re-rendering.** The cost of re-rendering is something to address after measuring ([0042](0042-react19-rendering-api.md)); getting ahead of it with structure before measuring decides boundaries by guesses about cost rather than by lifetime. The reason for pushing down is lifetime (whether it may disappear together with that layout shell).

### The local value held by an input field whose authority is the URL

On a screen where the URL holds the confirmed conditions and the input field holds a local copy of them, **whether to re-align the copy when the URL changes is decided by where the change came from**.

- **When it changed from outside** (a condition was removed by an operation other than that input field, etc.), align it. Otherwise a value that was supposed to be removed stays in the input field and looks as though it is in effect
- **When what arrived is only what it sent itself**, do not touch it. Touching it rolls back values typed between the submission and the end of the transition with its own late-arriving submission

Writing only "align when the URL changes" without looking at the origin falls into the latter. **Submission is reflected immediately, the transition with a delay** — the gap between these two moments is the cause, and since it does not appear in environments with fast transitions, it is hard to notice during implementation.

### Cross-cutting client state = Zustand (its home is the `stores` kernel)

- **Only client state that is truly cross-cutting (shared by several features) is promoted to a Zustand store**, with its home in [0023](0023-stores-kernel.md)'s **`stores` kernel** (the fifth exit of the promotion rule of [0021](0021-frontend-responsibility.md))
- The acceptance criterion for promotion = **referenced by several features**. State used only by a single feature does not use Zustand and stays local in the feature
- Stores are fixed to `"use client"`. Server state is not double-cached in a store (server state is RSC fetch / `adapters`). Detailed responsibilities, dependencies and invariants are owned by [0023](0023-stores-kernel.md)

## Standards Conformance and Non-Lock-In ([0010](0010-standards-and-non-lockin.md))

All three adopted libraries are chosen in line with the two principles of [0010](0010-standards-and-non-lockin.md) (§1 de facto conformance / §2 vendor-independent justification).

- **react-hook-form**: React's de facto form library. It rides on the standard form of `register` / uncontrolled + resolver. Vendor-independent = the input rules have **the hand-written zod display-validation schema in `model` as the SSOT** ([0062](0062-form-input-validation.md) two-layer separation), so with react-hook-form taken out, the structure "handle schema-validated form state with hooks" is portable (alternatives: TanStack Form / Formik). Chosen on the independent grounds of re-render suppression through uncontrolled inputs and affinity with RSC / Server Actions
  - **Its form of guaranteeing non-lock-in differs from the other two (exception note)**: by the nature of hooks, react-hook-form has a structure in which **feature components call `useForm` / `register` directly**, so the form of **localizing direct vendor references to one place**, as with Zustand (the `stores` kernel) / date-fns (utilities), does not hold literally. Therefore rhf's non-lock-in is guaranteed not by "gathering behind a boundary" but by **putting the SSOT of input rules on the zod schema (the display-validation schema in `model`)**. A zod schema is a portable contract, so with rhf taken out the contract (validation rules and types) remains and can be moved onto another form library's resolver (= satisfies [0010](0010-standards-and-non-lockin.md)'s operational test "does the contract remain when swapped"). What must not be scattered is not the vendor API itself but **validation logic of our own that does not go through zod** (to the same effect in Prohibitions)
- **zod**: the de facto TypeScript-first schema validation. A schema is a portable contract that also engages other form libraries via resolvers (alternatives: valibot / yup). The structure "derive types and validation from a schema" is vendor-independent
- **Zustand**: the de facto lightweight store. It rides on the standard form of `create()` + hooks, and with Zustand taken out the structure "read cross-cutting client state with hooks" is portable (detailed in [0023](0023-stores-kernel.md); alternatives: Jotai / Redux Toolkit)

The form of guaranteeing swappability splits two ways. **Zustand gathers direct vendor references into the `stores` kernel** ([0023](0023-stores-kernel.md)) and closes them "behind the boundary". On the other hand, **react-hook-form, per the exception note above, has hooks called directly from features and so cannot be guaranteed by "gathering behind the boundary"; portability is kept by putting the zod schema (the display-validation schema in `model`) as the SSOT of input rules** (the contract remains with rhf taken out). What they have in common is that both satisfy [0010](0010-standards-and-non-lockin.md)'s operational test (does the contract and structure remain when swapped); the decision axis is whether portability holds, not the physical form of gathering. Introduction is done within the frame of **exact-pin + `pnpm audit`** ([0004](0004-library-management.md)).

## Prohibitions

- ❌ Presupposing a client fetching and caching layer such as TanStack Query as the core default (orchestration of fetching goes through feature server functions / `adapters`; [0071](0071-bff-api-integration.md)) (Enforcement: none — a decision not to adopt. TanStack Query and the like are not among the dependencies; adding one shows up as a `package.json` diff and an ADR revision)
- ❌ Double-caching server state in a Zustand store (server state is RSC fetch / `adapters`) (Enforcement: ESLint boundaries (`stores` in `architecture.ts` cannot import `adapters`) rejects fetching inside a store. A feature putting values it fetched into a store is Prose — **not mechanizable**. Whether a value is server-originated is decided by its origin, not by the shape of the store)
- ❌ Lifting a single feature's state into `stores` (Zustand) (without cross-cutting use, local in the feature) (Enforcement: Prose — **mechanizable** (could be rejected by counting on the dependency graph whether only one feature imports each module of `stores`; no rule exists))
- ❌ Writing Zustand stores directly in features / components and referencing them across (cross-cutting state is gathered in `stores`; [0023](0023-stores-kernel.md)) (Enforcement: Prose — **mechanizable** (could be rejected by putting imports of `zustand` into `no-restricted-imports` outside `src/stores`; no rule exists))
- ❌ Scattering validation logic of our own that does not go through zod across forms (make the schema the SSOT) (Enforcement: Prose — **not mechanizable**. Whether a conditional expression is validation is decided by meaning, not by the shape of the code)
- ❌ Replacing the submission mechanism itself with react-hook-form, duplicating it (submission is unified on [0061](0061-form-mutation-ux.md)'s `<form action>` + `useActionState`) (Enforcement: Prose — **mechanizable** (could be rejected by picking up calls to `useForm`'s `handleSubmit` in `features` / `components`; no rule exists))
- ❌ Feeding generated wire schemas directly to `zodResolver` (display validation is the hand-written schema in `model` / contract validation is at the `adapters` boundary; [0062](0062-form-input-validation.md) / [0072](0072-api-type-generation.md)) (Enforcement: ESLint boundaries (`adapters-gen` in `architecture.ts` can be imported only from `adapters`) rejects features / components pulling generated schemas directly. Passing a generated schema that `adapters` exposed to a resolver is Prose — **not mechanizable**. Whether a schema derives from a generated artifact does not appear in the type of the public surface)
- ❌ Adding a state library without exact-pin / `pnpm audit` ([0004](0004-library-management.md)) (Enforcement: the `dependency-audit` job (`make audit`) runs `pnpm audit` on PRs that reach the lockfile and rejects high / critical findings that have a fixed version. Exact-pin is Prose — **mechanizable** (could be rejected by whether a version specifier in `package.json` has a range such as `^` / `~`; no rule exists))

## Related ADRs

- [0061-form-mutation-ux.md](0061-form-mutation-ux.md) — submission mechanics (`<form action>` + `useActionState` + `useFormStatus`). rhf's submission merges here (one submission mechanism)
- [0062-form-input-validation.md](0062-form-input-validation.md) — the authority on input validation UX and the two-layer separation of validation (the `model` display-validation schema fed to the resolver / `adapters` contract validation)
- [0063-mutation-result-notification.md](0063-mutation-result-notification.md) — notification UX for mutation results (the layer that takes `ActionState` as input and chooses the notification means)
- [0023-stores-kernel.md](0023-stores-kernel.md) — the home of cross-cutting client state (Zustand). The SSOT of responsibilities, dependencies, the `"use client"` invariant and promotion criteria
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance + vendor-independent justification (the decision axis for adopting the three libraries)
- [0004-library-management.md](0004-library-management.md) — exact pin / `pnpm audit` (the frame for adopting libraries)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — Server Components by default (the foundation of Server state = fetch) / URL state
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the promotion rule (the exit for cross-cutting client state → `stores`) / kernel placement and naming discipline
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — client-side data fetching and caching design / the server state boundary
- [0073-pagination-fetch-boundary.md](0073-pagination-fetch-boundary.md) — incremental fetching for infinite scroll (a limited exception to the default of not presupposing client fetching)
- [0011-no-docker.md](0011-no-docker.md) — the presentation-layer role
- [0052-ui-component-policy.md](0052-ui-component-policy.md) — adopting UI components (shadcn/ui + Tabler icons + complex inputs). Works paired with the form components
