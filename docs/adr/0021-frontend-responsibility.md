# Separation of Responsibilities within the Frontend

For the **feature slices × presentation-layer kernels** architecture adopted in [0020](0020-adopted-architecture.md), this ADR sets each kernel's **responsibilities / the dependency matrix / the naming discipline / the kernel acceptance criteria / where Server Actions live / mechanical enforcement (Enforcement) / how per-layer READMEs are operated**.

Where [0020](0020-adopted-architecture.md) **declares** the pattern, this ADR sets the **conventions** referred to in day-to-day operation.

## Status

Accepted

## Context

[0020](0020-adopted-architecture.md) declares the 11-kernel layout `src/{app, features/<name>, model, components, adapters, capabilities, stores, config, errors, logging, observability}` (`capabilities` in [0022](0022-capabilities-kernel.md), `stores` in [0023](0023-stores-kernel.md)) and its design principles, and delegates the details of "what each kernel accepts and what it may import" to this ADR as subordinate decisions. This ADR codifies those subordinate decisions.

## Responsibilities of Each Kernel

The mapping table in [0020](0020-adopted-architecture.md) is expanded into definitions of responsibility.

| Kernel | Family | Responsibility | Does not accept |
| --- | --- | --- | --- |
| `app` | Slice | Driving adapter. **The file name decides the role** (`route-segment`=page/layout→features / `route-handler`=`route.ts`→adapters/server + model + the feature's `facade/` / `server-action`=`actions.ts`→adapters/server+features / `metadata`=robots etc.→config; [0025](0025-app-layer-elements.md)). `layout` may thinly mount cross-cutting UI/Providers ([0026](0026-layout-shell-mount.md)) | Business logic / orchestration / direct fetch (in a route-segment) |
| `features/<name>` | Slice | Screen use cases (orchestrating data fetching / aggregating multiple APIs / form submission flows / optimistic updates) + slice-specific UI / hooks / Server Actions (those that need no assertion of the actor). The composition point of hooks + UI. Flat co-location inside | Dependencies on other features (see the promotion rule below) |
| `model` | Kernel | Display ValueObjects / formatters / unit conversion / display validation rules / **display result types (`ActionState<T>`, etc.)**. Pure, with minimal dependencies | **Business rules** (a backend responsibility) / fetch / config |
| `components` | Kernel | Cross-cutting UI (design-system-like pure UI components). May hold UI state such as toasts | fetch / config / business state / importing `capabilities` or `stores` |
| `adapters` | Kernel | External connections only (backend API client / BFF fetch / analytics, etc.). **Two faces, server / client** ([0024](0024-adapters-server-client-split.md); server = config allowed, secrets / client = `"use client"`, no secrets. **The faces are a split by execution context, not elements of the boundary check**). The ownership boundary for the conversion that keeps generated and external types from leaking into inner layers | Business logic / UI / local browser APIs (→ `capabilities`) |
| `capabilities` | Kernel | Cross-cutting client hooks (runtime capabilities = connectivity / mediaQuery / storage / clipboard / reading cookies, etc.). **client-only**. [0022](0022-capabilities-kernel.md) | Remote IO (→ adapters) / `server config` / business state / UI / policy state (NEXT_PUBLIC literals in client config are allowed) |
| `stores` | Kernel | Cross-cutting client state (Zustand stores shared by multiple features = selection state / wizards / global UI toggles, etc.). **client-only**. [0023](0023-stores-kernel.md) | Server state (→ RSC/adapters) / state of a single feature (→ local inside the feature) / UI markup (→ components) / `server config` / secrets / business logic |
| `config` | Kernel | Typed config (**per purpose**; no single object. server config ⟨secrets⟩ / client config ⟨NEXT_PUBLIC literals⟩; [0030](0030-environment-variable-management.md)). The only place that reads `process.env` directly | UI / fetch / business logic |
| `errors` | Kernel | Error classification (protocol-agnostic sentinel classification). Referenceable from every layer. [0080](0080-error-handling.md) | Dependencies on other kernels |
| `logging` | Kernel | Structured logging. Receives config values by injection. [0081](0081-observability-logging.md) | — |
| `observability` | Kernel | OTel / tracing. Receives config values by injection. [0081](0081-observability-logging.md) | — |

## Dependency Matrix

What each kernel may import (importing side → allowed targets). **This table is authoritative.**

| Layer (importing side) | Allowed import targets |
| --- | --- |
| `app/route-segment` (page/layout; [0025](0025-app-layer-elements.md)) | `features` / **only for protecting the entry point**, the definitive authorization in `adapters/server/auth` (`verifySession()`) and `model` predicates ([0079](0079-auth-frontend-seam.md)) / **only for mounting instrumentation**, extracting trace correlation from `observability` ([0082](0082-client-observability.md)) (+ `layout` may thinly mount cross-cutting UI/Providers from `components`/`capabilities`/policy seams; [0026](0026-layout-shell-mount.md)) / **only for values Next.js conventions require to be placed in a route segment**, `config` (`config/site`, read by the root layout's `metadata` export, and `config/clock`, read by screens; an exception to [0025](0025-app-layer-elements.md)'s prohibitions) |
| `app/route-handler` (`route.ts`) | `adapters/server` / `model` / `errors` / `logging` / the feature's `facade/` only (thin proxy, no business logic; [0025](0025-app-layer-elements.md). `APP_ELEMENTS` in `architecture.ts` enforces this mechanically) |
| `app/server-action` (`actions.ts`; [0025](0025-app-layer-elements.md)) | `adapters/server` / `features` / `model` / `errors` / `logging` (**the actor is asserted here**; no business logic) |
| `app/metadata` (robots etc.) | `config` / `model` (start-up / build boundary exception). Only `sitemap.ts`, which walks a list at request time, may also import `adapters/server` and the target feature's `facade/` ([0025](0025-app-layer-elements.md)) |
| `features` | `model` / `components` / `adapters` (public surface only) / **`capabilities`** / **`stores`** / `errors` / `logging` / `observability` (the endpoint for putting rendering on spans; [0081](0081-observability-logging.md)) |
| `adapters/server` ([0024](0024-adapters-server-client-split.md)) | `model` / `errors` / `logging` / **`config` (= the only layer allowed `server config`)** / `observability` (the endpoint for putting telemetry relayed from the browser onto signals; [0082](0082-client-observability.md)). `server-only` |
| `adapters/client` ([0024](0024-adapters-server-client-split.md)) | `model` / `errors` / `logging` / client config (**no `server config`**; NEXT_PUBLIC literals allowed). `"use client"` |
| `capabilities` ([0022](0022-capabilities-kernel.md)) | `model` / `errors` / `logging` / client config (no `server config`; NEXT_PUBLIC literals allowed). `"use client"` |
| `stores` ([0023](0023-stores-kernel.md)) | `model` / `errors` / client config (no `server config`; NEXT_PUBLIC literals allowed). `"use client"` |
| `components` | `model` / `errors` (`capabilities` / `stores` are not imported) |
| `model` | **`errors` only** (all the stable core may know is the error classification) |
| `errors` | None. `logging` / `observability` receive config values by injection |

- Every import direction not in the table is **prohibited** (the inward-dependency principle; [0020](0020-adopted-architecture.md)'s first design principle)
- **Protecting the entry point is a named exception for `app/route-segment`** ([0079](0079-auth-frontend-seam.md)). Call `verifySession()`, decide with a `model` predicate, and `redirect()` if it is not satisfied — only these three are allowed; neither fetching nor business logic is. The reason for the exception is that protection is meaningless unless it is closed per entry point, and **only the app layer knows the set of route segments**. It cannot be moved to `features` because, as a consequence of the same matrix, only `app` and `adapters` may touch `adapters/server/auth`, which contains the DAL (the same shape as "Where Server Actions live" below)
- **Mounting instrumentation is also a named exception for `app/route-segment`** ([0082](0082-client-observability.md)). The root layout extracts the trace correlation of the active span and passes it to the client component it mounts — only this is allowed; neither creating nor recording spans is. The reason for the exception is that, as a result of **not putting the OTel SDK in the browser** ([0081](0081-observability-logging.md)), the browser has no trace of its own, and only the layer that assembles the layout shell can pass the server-side trace id. Without it, records originating in the browser are tied to the span of the relay request and become parent and child of a request in which no measurement took place
- **Only `adapters/server` may import `server config` (the runtime config object holding secrets)** (the only layer allowed at runtime = the boundary adapter). Inner layers **receive values as arguments** rather than server config (inner layers do not know config). Note: client config (= NEXT_PUBLIC build-time inlined **literals**; [0030](0030-environment-variable-management.md)) is a public constant rather than a runtime object, so client-side layers (`adapters/client` / `capabilities` / Client Components) may import it too
- **Since `features` does not read config**, only `app` knows the origin as seen from outside. Building absolute URLs (the `url` of structured data, canonical, etc.) is done by `app`; a feature receives where it lives from the screen's canonical URL, or does not hold it
- **The start-up / build boundary exception**: `instrumentation.ts` (directly under `src/`) and `next.config.ts` (repository root), which are where config validation runs, may import config. These are start-up / build entries **outside** the 11 kernels. `app/metadata` (robots etc.; [0025](0025-app-layer-elements.md)) and `proxy.ts` (the config it can reach goes as far as `environment.ts` → `application-environment.ts`; [0043](0043-middleware-policy.md)) are allowed config imports as start-up / build boundary exceptions of the same standing. ESLint boundaries treats them as dedicated elements

### No `features ↔ features` Imports, and the Promotion Rule

Direct imports between features are **prohibited**. An element that needs to be shared by multiple features is **promoted** to a kernel according to its nature:

- Display logic (VOs / formatters) → to `model`
- UI components → to `components`
- External connections → to `adapters` (choose the server / client face by execution context; [0024](0024-adapters-server-client-split.md))
- **Reactive cross-cutting client hooks (runtime capabilities) → to `capabilities` ([0022](0022-capabilities-kernel.md))**
- **Cross-cutting client state (stateful stores) → to `stores` ([0023](0023-stores-kernel.md))** (non-cross-cutting ⟨within a single feature⟩ state is not promoted and stays local inside the feature; the default is [0060](0060-state-management.md))

As soon as something must cross features, decide "which kernel to promote it to", and do not create sideways dependencies between features.

#### What cannot be promoted — the feature's `facade/`

**Some things are needed by a second feature yet no kernel can accept them.** Only those are **placed by the feature in `facade/`**, and other features may import them. Two kinds qualify, and the condition for both is that "there is nowhere to promote them to".

- **UI that carries the vocabulary of a specific domain.** `components` is the surface for components with no domain, so it cannot accept them. The same holds for UI that depends on `stores`: `components` cannot import `stores`. In other words, the promotion table above **cannot have a row for "UI that carries a specific domain's state or vocabulary"**
- **Identifiers of routes the feature owns, and how they are built.** Path constants and URL construction are not within what `model` accepts (display values, conversions, validation rules); promoting them would turn `model` into a registry of the app's URL space that grows with every screen added. The feature owns the route, so only the endpoint it shows outward goes into `facade/`.
  **The pointing side does not transcribe the destination; it takes it from the owner's `facade/`.** Transcribing creates two definitions of the same route, and
  when it changes the old one remains — this is why `facade/` exists in the first place

- **Promotion comes first.** `facade/` may hold only what none of the kernels in the table above can accept. Pure display logic goes up to `model`, UI that does not know the subject matter to `components`, cross-cutting hooks to `capabilities`
- **Place something only when a second feature actually needs it.** Anything only one feature uses lives inside that feature ([0027](0027-directory-structure.md)'s co-location policy). When the features using it drop back to one, move it back down
- **Nothing outside `facade/` is visible from outside.** Both under a screen and directly under the feature are the feature's internals
- **The two kinds above enumerate "the public surface shown to other features"; they are not an exhaustive list of files that may be placed in `facade/`.**
  Internal implementation the public surface depends on (pure decision functions and the like) also lives in `facade/`. For the boundary check, `facade/`
  **cannot import the feature's internals** (what the area can import is the same as `features`, and does not include `features`
  itself), so placing what the public surface uses directly under the feature makes the public surface's reference to it fail there.
  Co-location is therefore a structural consequence, not a convenience. However, **what is co-located does not thereby become public surface** —
  other features may import only the two kinds above
- **The name means "the face this feature shows outward".** `public` is not used because in Next.js it names the static-serving directory, and the association drifts toward "publishing to the Web". `exports` is not used because what is constrained is **whether something may be imported from outside**, not a collection of exports (every file has exports). It names a role, so it differs in nature from banned names such as `common` / `shared`
- **It is not a layer that wraps things to simplify them.** It is a surface where components are placed as they are; no wrappers are made for the sake of `facade/`

**The only exception is whole-screen stories (`src/features/**/*.stories.tsx`).** A story that does not include the components of other features the screen actually combines cannot be used to check that screen. A story is a check-only surface with no runtime dependencies, and composing there does not change the dependency direction of product code. This one kind of file is therefore given the same composition rights as the app layer (the `feature-story` category of `ENTRY_POINTS` in `architecture.ts` enforces this mechanically). **On the product-code side the only exits are the five above, and passing types or implementations through a story is prohibited.**

### Declarations show the public surface — no barrels

**No barrels (`index.ts`) are made.** The public surface is what the area declarations in `architecture.ts` and the frontmatter of layer READMEs declare, and a barrel blurs that — "is it exported from index" becomes the de facto public surface, and nobody objects when it diverges from the declaration. Barrels also breed circular references and hinder tree-shaking. Imports point directly at the real file (an `index.ts` that a generated artifact contains is the generator's output and outside this convention).

## Criteria for Splitting Components within a Feature

Where the promotion rule decides splits that **cross** features, this section decides splits that **do not cross** — where to cut components, hooks and pure functions within one feature.

**Split only when one of the following applies.**

- **There are two or more reasons to change.** If change requests come from separate events, they are separate components
- **A boundary is technically enforced.** The specification side requires the split: the `"use client"` boundary, Server Actions, mechanisms that cannot keep the DOM such as a focus trap, APIs whose state can only be read by a form's children, and so on
- **The lifetime and owner of state differ.** In-progress interaction versus display, and policy versus container, differ both in where they live and in when they are swapped
- **A second reference has actually appeared.** Do not split on a prediction (the same discipline as the promotion rule). **The style of waiting for the third time (rule of three / AHA) is not adopted** — waiting presupposes that "you cannot abstract correctly at the second place", and that premise does not hold once the design is worked through. It is required to **choose the right abstraction** at the second place
- **It becomes verifiable without React.** Ordering, decisions and conversions are extracted as pure functions
- **A policy involving state or subscriptions is needed by a second component too.** Only in this case is it made a hook (pure computation is not made a hook; a function suffices)

**Do not split in the following cases.** Over-splitting breaks a design just as much as not splitting.

- It would only pass props through (like `Wrapper` / `Inner`, the role cannot be named)
- They always change together
- Extracting into a hook a policy used in only one place (premature abstraction)
- Splitting results in more boolean props. **That is the signal to fix it with composition, not splitting**

The claim of "put it where it is used" (Locality of Behaviour) and the claim of favoring readability over smallness (CUPID) are taken in as these "do not split" criteria. A stance that rejects splitting itself is not adopted.

**Duplication is consolidated at the second place (DRY).** Components in `components` holding a copy of an upstream implementation is a decision to take it in as a reference implementation ([0052](0052-ui-component-policy.md)), not an exception to DRY.

When unsure, apply the following in order. **Naming** (can it only be explained as "X and Y") / **early return** (does it return a different shape) / **props** (do they split into two groups, with branches that use only one) / **imports** (do they split into two families) / **state** (are there two or more mutually unrelated pieces of state).

**Container / Presentational is not adopted.** That dividing line has been replaced by [0040](0040-routing-rendering-strategy.md)'s server (fetching, orchestration) / client (interaction), and the practical line is pushing `"use client"` down to the leaves.

**Use `children` to pass server output into a client container.** When placing server-assembled content inside a container with interaction, pass the content as `children` rather than carrying it as a prop value. The container need not know the content's type, and the `"use client"` boundary stops at the container's edge.

**What types can express is expressed in types.** How state is represented, settling at the boundary, branding identifiers and how to use `satisfies` are held by [0029](0029-type-design-discipline.md).

**Split props according to the needs of the using side** (Interface Segregation). If the props one component receives include a group used only by a particular caller, it is two components.

### Ideas not restated under another name

The following ideas are **not set up as separate rules**. Their substance is already prescribed in another form, and listing them as slogans would make the same rule appear in two places. **When you think of the same concept, look here and go back to the existing prescription.**

| Idea | Where the substance lives |
| --- | --- |
| Single source of truth | "Do not hold a copy of server state" ([0023](0023-stores-kernel.md)) and "the SSOT for input rules is the zod schema" ([0060](0060-state-management.md) / [0062](0062-form-input-validation.md)) |
| YAGNI / KISS / Rule of Least Power | The "do not split" criteria above (do not split on a prediction / premature abstraction / quantity is not a criterion) |
| Conway's law | Not adopted. Organizational structure is not an input to judgment. Where things go is decided by responsibility |
| SOLID other than S (O / L / D) | The direction of dependencies is the dependency matrix; dependence on abstractions is prescribed individually by the ADRs that hold seams ([0079](0079-auth-frontend-seam.md), etc.) |

**Splitting moves the unit of tests and stories** ([0090](0090-testing-strategy.md)'s one test per module / [0054](0054-ui-catalog-storybook.md)). Finish it after the implementation settles and before writing tests.

## Naming Discipline

Kernels and directories **may only have role names**. Names from which the acceptance criteria cannot be inferred are **prohibited**.

- **Banned names**: `common` / `shared` / `utils` / `util` / `helpers` / `lib` / `misc`, etc. (places that do not name a role)
- **Basis**: the moment a place that cannot name its role becomes necessary, that is **a gap in the design**. No home for general-purpose utilities is made. Display helpers go in `model`, non-display ones inside features. If something truly needs to cut across, create it **after defining its role in an ADR addendum**
- **Example**: the boundary adapter layer is named **`adapters`**, not `lib`

The naming discipline (the name declares the role) and the kernel acceptance criteria below (the criteria inspect the contents) form a **two-stage defense**.

## Kernel Acceptance Criteria

There are four criteria for adding an element to a kernel. 1–3 are the general kernel policy "place only what is referenced across features and keep a single responsibility"; 4 is a consequence of the presentation-layer role definition ([0011](0011-no-docker.md)).

1. Accept only what **is referenced from multiple places, or wraps an external library**
2. **Single-feature helpers** (used by only one feature) are placed inside the feature. They are not promoted to a kernel
3. Keep a **single responsibility** (one kernel = one role)
4. **No business logic** (a backend responsibility; [0011](0011-no-docker.md))

An element that does not satisfy both the naming discipline (banned names) and these acceptance criteria must not be added to a kernel.

## Where Server Actions live

Server Actions are placed in `actions.ts` (the controller counterpart). **Which `actions.ts` is decided by whether an assertion of the actor is needed** ([0025](0025-app-layer-elements.md)'s element table is authoritative).

| Assertion of the actor | Location | element |
| --- | --- | --- |
| Needed | `src/app/**/actions.ts` | `app/server-action` |
| Not needed | `features/<name>/<screen>/actions.ts` | `features` |

- **A Server Action is a public HTTP endpoint.** Anyone who knows the action id can POST to it even on routes that do not render that action. So the role and ownership decisions are not substituted with "this screen is protected", but **asserted inside the action**
- Only `app` and `adapters` may touch `adapters/server/auth`, which the assertion needs, so an action holding an assertion cannot live in `features`. Splitting into two locations is a consequence of this dependency matrix, not an exception clause
- **A feature's screen does not decide its own submission target.** A screen using an action that holds an assertion receives that action as a prop from the `app` route. Sealing the session is the domain of `adapters/server/auth`, and since only `app` may touch it, only `app` knows the submission target
- Treated as a driving adapter, it does **orchestration only** (calls the feature's orchestration functions / server functions). **It does not hold business logic** (connected to [0011](0011-no-docker.md)'s thin-proxy decision)
- `"use client"` is pushed down to leaf components inside the feature, and `page.tsx` stays a thin Server Component call endpoint ([0040](0040-routing-rendering-strategy.md))

## Enforcement (Mechanical)

Layer dependency directions are not protected by documents alone; they are enforced mechanically with an ESLint boundaries-style plugin. The overall enforcement policy connects to [0002](0002-formatter-linter.md)'s use of ESLint as a complement to Biome (formatting and the checks Biome can express go to Biome; only the boundary check that takes "the layer doing the import" as context is complemented with ESLint).

- **Plugin choice (settled in this ADR)**: **`eslint-plugin-boundaries`** is adopted for the layer-boundary check (this settles what [0002](0002-formatter-linter.md) leaves to this ADR: the concrete plugin and the layer-definition mapping). It is chosen because it can take "the layer doing the import" as context as an element, a check Biome's `noRestrictedImports` cannot express (matching 0002's capability-based division)
- **Layer-definition mapping (settled in this ADR)**: the "Dependency Matrix" above is itself the definition of the element + allowed-import rules. The 11 kernels are elements, and `features` uses per-feature elements to prohibit `features ↔ features`. **Units finer than a kernel are split in two ways, which are not mixed** — in `app` **the file name decides the role**, so it is declared as a category of `boundaries/files` (`APP_ELEMENTS` in `architecture.ts`; [0025](0025-app-layer-elements.md)), while `adapters` carves out **areas** as elements (`RESTRICTED_AREAS`: `gen/` / `http/` / `server/auth/`). **`adapters/server` and `adapters/client` are not elements** — they differ by execution context, and the boundary check only looks between layers and areas, so this axis is held separately by the build-time failure of `import "server-only"` and by [`scripts/server-only.gate.test.ts`](../../scripts/server-only.gate.test.ts) ([0024](0024-adapters-server-client-split.md)). `server config` (the runtime config object) may be imported by `adapters/server`, the start-up / build boundary (`instrumentation.ts` / `next.config.ts` / `proxy.ts` ⟨the config it can reach goes as far as `environment.ts` → `application-environment.ts`; [0043](0043-middleware-policy.md)⟩), and **only for values Next.js conventions require to be placed in a route segment** (an exception to [0025](0025-app-layer-elements.md)'s prohibitions: `config/site` in `app/metadata`, and `config/clock`, which screens read as "now") (NEXT_PUBLIC literals in client config are allowed on the client side too). **A shape in which development-only screens that do not ship in the production bundle (`page.dev.tsx`) read config directly also exists**, and [0025](0025-app-layer-elements.md)'s element table records it
- **Violation severity**: boundary violations block on CI (`pnpm lint:ci`) (error)
- **The matrix's authority (settled in this ADR)**: the machine-readable expression of the dependency matrix lives in **one place, `architecture.ts`**. ESLint imports it and turns it into enforcement, and the `imports-allowed` of layer READMEs is **generated from it** (`pnpm gen:architecture`). `pnpm check:architecture` compares against a fresh regeneration and fails on any diff. **It is not made something people transcribe** — a declaration that demands an exact match has its value fully determined elsewhere; transcribing adds no correctness at all and only creates the need for a mechanism to detect transcription errors. Generating from a single authority and checking for zero diff is the same shape as `gofmt -l` / `prettier --check` / `cargo fmt --check`
- **Only element roots hold boundary declarations (settled in this ADR)**: non-root directories hold no declaration and inherit the declaration of the nearest element root. Resolution is done by `scripts/architecture/` reading `BOUNDARY_ELEMENTS` in `architecture.ts` (narrower elements first), and **it receives the same order as ESLint from the same single place**. **Only for a layer whose elements `KERNEL_PATTERNS` narrows (`features`) does the layer root also become a declaration site in addition to the slice roots** — what is narrowed is the granularity of enforcement, not the set of dependencies, so both declare the same set. With two resolvers that have an order, one of them runs without looking at areas, and an area's README ends up writing a value that is not its effective permission. **`forbidden` is not generated** — it is a prose-leaning column containing vocabulary that is not kernel names, such as `fetch` / `business-logic`, and has no corresponding value in `architecture.ts`
- **Division between static enforcement and semantic audit**: static layer-boundary enforcement is ESLint; the semantic audit of layer responsibilities (does what was placed fit what the README accepts) is done by `arch-check`, which reads the "Audit Criteria" section of the layer READMEs

## Operating Per-Layer READMEs

A README is placed in each of the 11 kernels (`app` / `features` / `model` / `components` / `adapters` / `capabilities` / `stores` / `config` / `errors` / `logging` / `observability`) + each feature.

- Each README is **the source read at runtime by the per-layer architecture audit and for test perspectives** (= the authority). If the auditing side held a copy of the conventions, fixing the README would still leave the audit judging by the old conventions
- What the per-layer architecture audit (`arch-check`) reads is the **`## Audit Criteria`** section of each kernel README. Its columns are the three `Criterion` / `How It Is Judged` / `Basis`; each tag in the frontmatter's `forbidden` has one row, which sets how that tag is read. The remaining rows carry principles that cannot be expressed as a set of imports, drawn from the README, `docs/rules.md` and ADRs. The verdict shapes are two: `violation` (what the README does not accept, or a conflict with `forbidden`) and `suggestion` (shapes that are ambiguous and need a human to judge); for rows a machine already fails, the basis column names that means and the audit does not re-judge them. Feature READMEs do not have this section — the kernel READMEs hold the discussion of roles
- Each README restates this ADR's **naming discipline** (role names only, banned names) and **kernel acceptance criteria** so they can be referred to on the spot

## Prohibitions

- ❌ Import directions not in the dependency matrix (outward dependencies / external imports from `model`, etc.)
- ❌ Direct `features ↔ features` imports (promote to a kernel per the promotion rule). **There are two exceptions** — whole-screen stories, and **the other feature's `facade/`** ("What cannot be promoted" above)
- ❌ Importing `server config` from layers other than `adapters/server` (+ the start-up / build boundary) (inner layers receive values as arguments). Note: NEXT_PUBLIC literals in client config may be imported by client-side layers too
- ❌ Creating places that do not name a role (`common` / `shared` / `utils` / `lib` / `misc`, etc.) (Enforcement: ESLint `boundaries/no-unknown-files` fails on banned-name places (the JS/TS inside them) created directly under `src/`. Inside kernels and features it is Prose — **mechanizable** (match each segment of the path against the list of banned names. No rule exists))
- ❌ Creating barrels (`index.ts`) (the public surface is declared by `architecture.ts` and the README frontmatter) (Enforcement: Prose — **mechanizable** (fail `index.ts` files that hold only re-exports with Biome's `noBarrelFile`, excluding generated artifacts by override. No rule exists))
- ❌ Writing business logic in Server Actions / `actions.ts` (orchestration only)
- ❌ Placing single-feature helpers or business logic in a kernel (violates the acceptance criteria)
- ❌ Splitting components by line count, number of props or file size (the criterion is reasons to change, not quantity) (Enforcement: Prose — **not mechanizable**. Whether the criterion for a split was quantity or reasons to change is decided by the motive for the split and does not show in the shape of the code)
- ❌ Creating splits whose role cannot be named (`Wrapper` / `Inner` / `Base`, etc.) (Enforcement: Prose — **partly mechanizable**. Spellings such as `Wrapper` / `Inner` / `Base` could be caught by matching identifiers and file names, but no rule exists. Whether any other name names a role is decided by the name's meaning)

## Notes

- The **dependency rules and naming discipline** this ADR holds fall into the rule class in the taxonomy of [0140](0140-documentation-operations.md). Those in a shape where one can mechanically say "doing this is a violation" are held by `docs/rules.md` with a back-reference to this ADR, and this ADR holds the reasoning behind them

## Related ADRs

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — the declaration of the adopted architecture (this ADR's parent decision)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — the `capabilities` kernel (cross-cutting client hooks; reflected in this ADR's matrix / promotion rule)
- [0023-stores-kernel.md](0023-stores-kernel.md) — the `stores` kernel (cross-cutting client state; reflected in this ADR's responsibility table / dependency matrix / the fifth exit of the promotion rule)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — the server/client two-face split of `adapters`, and that the boundary check is not what holds that separation
- [0025-app-layer-elements.md](0025-app-layer-elements.md) — the four roles of `app` (route-segment/route-handler/server-action/metadata) and the three of them for which the machine holds declarations (the authority on allowed import targets is that ADR's element table)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — how consent/flags are supplied (source adapter + stateless props)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — the exception for `layout` mounting cross-cutting UI/Providers
- [0011-no-docker.md](0011-no-docker.md) — the presentation-layer role definition (no business logic / thin proxy). The basis for `model`'s ban on business rules and for limiting Server Actions to orchestration
- [0002-formatter-linter.md](0002-formatter-linter.md) — ESLint complementing the layer-boundary check (where Enforcement connects)
- [0027-directory-structure.md](0027-directory-structure.md) / [0028-naming-convention.md](0028-naming-convention.md) / [0030-environment-variable-management.md](0030-environment-variable-management.md) — the ADRs that make this ADR's physical placement, naming and config details concrete
