---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features]
test-requirement: [feature, component, unit]
---

# features

Screen-level feature slices. Each `features/<name>/` co-locates its screen use cases, dedicated UI, hooks and Server Actions flat.

## What Belongs Here

- Orchestrating data fetching, aggregating several APIs, form submission flows, optimistic updates
- UI, hooks and `actions.ts` dedicated to that feature

## What Does Not Belong Here

- Direct dependencies on another feature
- Elements several features should share, and backend business logic

## Slices

**This README owns the layer's role, and no slice README restates it.** A child writes only the lines
specific to that slice and an index into its contracts, specifications and design. The template is held
by the [feature README template](../../docs/templates/feature-readme.md).
`pnpm gen feature <name> --screen=<screen>` adds the README too when the feature does not exist, adds only
the screen directory when it does, and stops only when `<name>/<screen>/` already exists.

| slice | Role | README |
| --- | --- | --- |
| `auth/` | The entry point that hands identity over. It does not own authentication itself; it passes to the BFF endpoint | [README](auth/README.md) |
| `dev-session/` | The surface that swaps the actor during development. Never in the production bundle | [README](dev-session/README.md) |
| `maintenance/` | The surface shown in place of every route while delivery is stopped | [README](maintenance/README.md) |

<!-- sample:begin -->
What the bundled sample adds:

| slice | Role | README |
| --- | --- | --- |
| `home/` | The entry surface. Lays out several fetches side by side so one failure does not bring the whole down | [README](home/README.md) |
| `products/` | Find and browse the subject. Conditions live in the URL; reading proceeds incrementally | [README](products/README.md) |
| `cart/` | The container before buying. Lends its operation endpoints to other slices through a facade | [README](cart/README.md) |
| `checkout/` | The step before confirmation. Reconciles the cart with the destination and sends exactly once | [README](checkout/README.md) |
| `purchases/` | History of what was confirmed, one record's detail, and the state transitions from there | [README](purchases/README.md) |
| `account/` | Your own record. Registration, editing, account closure, and summaries for yourself | [README](account/README.md) |
| `inquiry/` | Exchanges with support. A message that arrives lines up without waiting for a refetch | [README](inquiry/README.md) |
| `admin/` | The operations surface only actors holding a role may enter | [README](admin/README.md) |
| `site-info/` | Static surfaces with no fetching | [README](site-info/README.md) |
<!-- sample:end -->

## Vocabulary Inside a Slice

The two axes of the directory layout (screen × nature) and what `page-content` / `view` / `ui/` / `facade/`
mean are owned by [0027](../../docs/adr/0027-directory-structure.md). **What this section owns is the list of
modules beneath that where the same name carries the same role** — a vocabulary whose spelling and contents
match in every slice. When the names match, "what can be called, and what verifies it" is settled without
opening the file. Whether a component goes in `ui/` or is promoted to `components` is decided by
[`docs/design/placement.md`](../../docs/design/placement.md); the order of the work is held by the
[tutorial for building one screen](../../docs/tutorial/build-a-screen.md).

| module | Holds | Does not hold |
| --- | --- | --- |
| `<screen>/page-content.tsx` | Interpreting the URL, the fetches that do not change with conditions, placing loading boundaries, classifying `not-found`, issuing the idempotency key carried by a one-time submission | Appearance |
| `<screen>/results.tsx` | Only the fetches that change with conditions. Sits inside the `Suspense` that `page-content` placed and bounds the refetch scope | The controls (search field, filters, display of the active conditions) |
| `<screen>/view.tsx` | Composition of a screen renderable from props alone. Receives what `page-content` fetched and assembles it | Fetching |
| `<screen>/breadcrumb-content.tsx` | The hierarchy down to the current location. Placed by the app layer's `@breadcrumb` slot. May go through the same fetch as the body to get a name — it is collapsed to one within the same render | |
| `<screen>/ui/<part>/` | That screen's components. One directory per component, co-locating implementation, test and stories | References from other screens (when a second screen needs it, move it up one level) |
| `ui/skeleton/` | The loading UI. Same column layout as the real thing; the number of placeholder slots is a fixed value that fits one screen. `aria-hidden` | Matching the real item count |
| `ui/submit-button/` | The submit control that reads `useFormStatus`. Extracted as a **child** of the component that renders the `form` | |
| `ui/error-state/` | What is shown when fetching fails. Rendered by the route's `error.tsx` | Composing the wording (`errors` looks it up from the classification) |
| `query.ts` | URL key spellings, building destinations, the type of the location currently viewed — **the building side** | The schema that reads `searchParams` |
| `read-<target>.ts` | The side that reads `searchParams` with zod. Decides whether an unreadable value falls back to the default or is returned naming the key | Building destinations |
| `page-size.ts` | How many items are listed at once. Separated from interpreting conditions — a client that imports it does not drag in the validation library | |
| `paths.ts` | Spellings and builders for the routes this feature owns. Directly under the feature, not under a screen. If another feature points at them, move them out to `facade/paths/` | Copies of routes another feature owns |
| `actions.ts` | Server Actions. Orchestration and classification only | Business logic, decoding `FormData`, wording |
| `form-names.ts` | Declarations of the `FormData` field names. The sending and reading sides draw the same spelling. **Holds no validation** — an input field needs only the spelling and does not drag in the receiving side's validation | |
| `parse-<target>-form.ts` | The boundary that decodes `FormData` into a type. `null` when unreadable (an empty string is not converted to a number — `Number` reads both a missing value and an empty string as `0`). The accepted range is rejected by the contract | |
| `form-state.ts` | `ActionState<T, Field>` closed over this screen's field names, the type of the Action received from the app layer, and wording only this screen can state | |
| `<scope>.fixture.ts` | Fixed values read by stories and tests. Aligned to the display model with `satisfies`; images come from `~catalog/lib/sample-asset`. Mix in long names, items without images and items with a special status so the container width and the branches appear in stories | Judgments |
| `__mocks__/actions.ts` | Replacing Server Actions in the catalog. Give `fn(async () => succeededActionState(...))` a `.mockName` | Imports from the production path |
| `facade/<part>/` | The surface lent to other features — routes, URL contracts, UI carrying the subject's vocabulary, Actions triggered from other features, and their `__mocks__` | References into the feature's internals (stopped by `features-facade` in `architecture.ts`) |
| `use-<target>.ts` | Policies that carry state or subscriptions. The criterion for cutting a hook is in [0021](../../docs/adr/0021-frontend-responsibility.md) (how a feature splits its components) | Pure computation (a function suffices) |

- **While there is only one screen, `<screen>/` may be omitted and files placed directly under the feature**
  ([0027](../../docs/adr/0027-directory-structure.md)). `pnpm gen feature` creates a screen directory from the
  start — this removes the work of moving the first screen when the second arrives, and the second and later
  screens are added with the same `--screen`
- **A nested README (`<name>/<resource>/README.md`) declares only `test-requirement` and `coverage-exclusions`,
  and holds no `imports-allowed` / `forbidden`.** Boundaries attach to an element's root, and only
  `<name>/README.md` may declare them (`scripts/architecture/readme-scan.ts` fails otherwise)
- **List `__mocks__/**` and `*.fixture.ts` in `coverage-exclusions`.** The reason for the exclusion and its
  removal condition are held by the declaration in `scripts/lib/untested-modules.ts`; the README holds only
  the list ([0090](../../docs/adr/0090-testing-strategy.md))

## Fetching and Loading Boundaries

**Separate what changes with conditions from what does not.** `page-content` fetches what does not depend on
conditions (filter candidates, master data), and `results` owns the list and count that change with
conditions. Give the `Suspense` wrapping `results` **a key serialized from the conditions** — when conditions
change the list is replaced wholesale, and without a key the previous conditions' list stays until the next
one arrives. Without the split, every condition change drops the controls along with everything into the
loading UI, and the foothold for continuing to filter disappears.

```tsx
<XxxListView selection={selection}>
  <Suspense fallback={<XxxListSkeleton />} key={serialize(selection)}>
    <XxxListResults query={parsed.query} />
  </Suspense>
</XxxListView>
```

- **Give a client island inside a dynamic hole a `key` built from its contents.** What has been read so far
  lives in the island's state and is not replaced when props change. Building the key from the contents
  re-stacks it only on a refetch, and keeps the reading position when nothing changed
- **One loading boundary per set of things that arrive together.** Splitting what arrives in the same request
  across separate `Suspense` boundaries makes the screen append twice and shifts the position the reader
  started at. Even when the outer frame and the body read the same fetch, the round trips do not increase if
  the fetch endpoint is memoized within the request
- **Turn a fetch failure outside the body into a value, and leave only a record.** Accessories such as counts
  and auxiliary displays fall back to `undefined` with `.catch` and are recorded with
  `reportQuietly(() => getLogger().warn(...))`; a failure of the body is thrown as is and handed to the route's
  `error` boundary. When independent streams are each shown as a body, receive them with `Promise.allSettled`,
  map them to a per-stream state (`ready` / `failed`) and pass that to `view` — `Promise.all` abandons the wait
  at the first failure, and the results of the streams that succeeded cannot be used even though they are at
  hand
- **`page-content` takes the `not-found` classification.** It classifies a fetch failure with `findAppError`,
  calls `notFound()` for `NOT_FOUND`, and rethrows anything else. The route's `not-found.tsx` renders the
  not-found surface; this layer holds only the classification
- **Place loading boundaries with `Suspense`, not `loading.tsx`, in one of two places.** Either the route's
  `page.tsx` wraps `page-content` as a whole, or `page-content` wraps `results`; take the latter when the
  controls should stay outside the wait. In the former, resolve `params` / `searchParams` inside the dynamic
  hole while they are still promises (waiting on the layout shell's side means not even the static shell can be
  delivered while it waits)

Who owns each of a screen's four states ([docs/rules.md](../../docs/rules.md#states)) is fixed by the table
below, and **this layer holds only the display components**.

| State | Owner | What lives in this layer |
| --- | --- | --- |
| loading | The `Suspense` fallback | `ui/skeleton/` |
| empty | `view` (distinguishing "none yet" from "nothing matched the filter") | `ui/empty/` or a branch in `view` |
| error | The route's `error.tsx` | `ui/error-state/`. The boundary looks up the wording from `errors` and passes it (in production only `digest` arrives) |
| not-found | The route's `not-found.tsx` | Classification only (`page-content`) |
| Operation failure | `ActionState` | A component shown next to that operation. Not made a screen state |

**A screen with no fetching has no loading / empty / error, and its README states why.** If there is only one
state, no whole-screen story is placed either, and the E2E screen comparison covers its appearance — a story
would be a single `Default`, adding only VRT run time.

## Submission Shape

The canonical mechanism of `<form action>` + Server Action + `ActionState` is owned by
[0061](../../docs/adr/0061-form-mutation-ux.md), where Actions live by
[0021](../../docs/adr/0021-frontend-responsibility.md) (its rule for placing Server Actions), and the rules for
idempotency keys, 409 and confirmation dialogs by [docs/rules.md](../../docs/rules.md#forms).
What this section owns is how that is divided inside a slice.

1. Input fields get their `name` from the spellings in `form-names.ts`
2. The Action decodes `FormData` with `parse-<target>-form.ts`. If it cannot, `failedActionState({ formError })`
   — the wording is a constant of that screen and prompts the user to reload the screen
3. Call `adapters`, and map a failure to a classification with `actionStateFromError`
4. On success, `revalidatePath` or `redirect`. **If the value also appears in the outer frame (header, sidebar),
   invalidating a single path leaves the outer frame stale** — use `revalidatePath("/", "layout")`, with a
   reason attached to the `project-rules/no-app-wide-revalidate` suppression

- **Decide the success value by "does the succeeded state appear on screen".** A submission that `redirect`s,
  and one whose result is shown by a Server Component re-rendered in the same round trip, is
  `ActionState<void>`. Carry a display name in the success value only when the target has disappeared from the
  list by the time it succeeds and the result wording must name the target
- **An Action living in the app layer is passed by the route through props, and `form-state.ts` holds its
  type** (`(state, formData) => Promise<State>`). A screen does not decide its own submission target — only
  the app layer, which can touch `adapters/server/auth`, may decide it
- **Where the idempotency key is issued depends on how many times it is sent.** For a one-time creation
  (registration, confirmation), `page-content` makes one per assembly and passes it through props. For
  submissions repeated from the same screen (adding items one at a time), the client island holds it with
  `useState(newIdempotencyKey)` and **regenerates it only on success**. Setting (PUT) and deletion produce the
  same result if delivered twice, so they carry no key
- **Distinguish only conflicts (409).** The action the person who pressed can take (reload the screen) differs
  from other failures
- **For an operation sent from inside a confirmation, keep the dialog open while sending and on failure.**
  Using a component that closes when pressed (`AlertDialogAction`) puts both the sending indicator and the
  failure wording where the user is not looking

## Putting rendering on spans

Wrap exports in one of the two from `observability`. **Which one is decided by where it lives.**

| Location | What to use | Default |
| --- | --- | --- |
| The top of a screen (`<screen>/page-content` / `<screen>/view`, and compositions on the static shell's side that hold fetches) | `withScreenSpan` | Enabled |
| `<screen>/ui/**` | `withPartSpan` | Disabled (opened with `OBS_RENDER_SPANS=part`) |

```tsx
export const XxxPageContent = withScreenSpan(
  "features/<name>/<screen>/page-content",
  async ({ id }: XxxPageContentProps) => {
    // 取得と組み立て
  },
);
```

**A screen split into a static shell and dynamic holes has two or more tops.** With Cache Components enabled,
sections that can be delivered without waiting may be moved outside `Suspense`. The side moved out is also the
top of a screen that holds fetches, so wrap it with `withScreenSpan` and align its span name with that module's
path — one route then has several top-level spans, which is exactly the fact that the static shell and the
dynamic holes resolve separately.

The mechanism and how to read spans are owned by [observability/README.md](../observability/README.md).

- **Match the name to the module path from `src/`.** The span name points straight at the location, so a mismatch makes it impossible to get back from a trace to the file. Never mix in user input
- **Do not wrap client components (files with `"use client"`).** Rendering in the browser creates no span, so wrapping one yields only the single server render
- **Wrapping the side that holds fetches gives attribution.** The requests `page-content` waits on fall inside that span, so outbound `fetch` calls can be tied to the screen
- **Do not use it on components routinely.** Opening `part` multiplies the spans of one render by the number of components rendered. It pays off when you want to read from a trace the result of a branch — which form it returned

## Putting it in the catalog

Screens go under `Page/` and components under `Features/` (the rule for the leading segment is in
[`components/README.md`](../components/README.md)). **Every rendering component under `<screen>/ui/**` and
`facade/**` has its own story.** It does so even when the state is reachable from the screen's story — the
screen passes through a component in only one form, so the remaining states the component can express (width
per band, the contract's maximum length, sending, a rejected result) do not appear there.

Only **components that cannot be rendered in the browser** may go without a story. An async composition that
contains a fetch going through `server-only` is one. Write in its doc why it cannot have one and where its
contents can be seen. **Split so as not to drift there** — separate the composition holding the fetch from the
component holding the appearance, and give the story to the side that receives state through props. Bundling
them into one leaves a component whose look cannot be checked without a fetch.

- **The `title` scheme is owned by [`components/README.md`](../components/README.md).** That is its only
  owner, so it is not copied here
- **A screen's story has a decorator that wraps it in the same layout shell as the route.** It reproduces the
  shell, reading width and heading with the same components as `page.tsx`, uses `layout: "fullscreen"`, and for
  docs adds `iframeHeight` to `inline: false`. The form per band is fixed per story with `globals.viewport`.
  Whether to add the layout shell's cross-cutting UI (the sidebar and so on) to a screen's story is decided by
  whether the real thing has the same arrangement
- **A story containing a component that reads the current location (a nav's `aria-current` and so on) supplies `parameters.nextjs.navigation.pathname`**
- **`@see Storybook` points at the component's own story.** If it points at the screen's story, whoever fixes
  that component cannot find where to check it
- Hold the sending state with a submission target that never resolves
  ([`~catalog/lib/pending-action`](../../.storybook/lib/pending-action.ts)). With a target that returns at once,
  the submission has finished before the capture
- A component that reads a Server Action directly is listed in the replacement declarations of
  `.storybook/preview.tsx`. Otherwise, pressing it fails on loading `config`. **Replace the failure appearance in
  the story's `beforeEach` with `mocked(action).mockResolvedValue(failedActionState(...))`** — a failure cannot
  be produced through props
- A component that receives its input state from outside is wrapped in a wrapper that goes through the real
  hook. Replacing it fakes even the association between label and control, leaving nothing the catalog can
  verify
- The stand-in for an Action that redirects to another URL on success **returns success and stays in place**.
  In the real thing the succeeded state never appears on screen, but the catalog has no destination. State in
  the stand-in's doc that it stays, unlike the real thing
- A wrapper that needs different values per story is made a component that receives args rather than a
  decorator. The wrapper's values are then handled as story args with their types intact. As a decorator, the
  wrapper's values sit outside the component's args and travel through `parameters`, losing their types
- **Rules that come from the catalog's own frame**, such as how overlays are located and how docs pages are
  split, **are owned by [`.storybook/README.md`](../../.storybook/README.md)**

## Testing Approach

The methods are owned by [0091](../../docs/adr/0091-test-verification-methods.md) (async RSC is
`render(await X(props))`), and how to write them by
[docs/testing-conventions.md](../../docs/testing-conventions.md). The shapes that recur in this layer are these
three.

- **A `page-content` test checks the boundaries.** Replace `adapters` with `vi.hoisted` + `vi.mock`, replace
  `results` with a stub returning a marker, and check that what changes with conditions is placed inside the
  loading boundary and the conditions mapped from the URL to the contract (`toHaveBeenCalledWith`). Check with
  `rejects` that a fetch failure is "handed to the boundary, not swallowed"
- **A `view` test passes fixtures as props.** Render per state and check a11y with `axe`. Replace the Server
  Action module with `vi.fn()` via `vi.mock`
- **Things that return values (`parse-*` / `read-*` / `query` / `paths` / hooks) are `unit`.** They have no
  rendering; match the return values and branches directly

## Operations

- Elements that need cross-cutting use are promoted to `model`, `components`, `adapters`, `capabilities` or `stores` according to their responsibility
- Server Actions only orchestrate; no business logic goes in them
- A feature's root (`features/<name>/README.md`) carries a README with the same frontmatter. What a nested README
  may declare is at the end of the Vocabulary Inside a Slice section
- **Do not reference ADRs from code comments.** Gather references in the README, and write comments so they can
  be followed from next door, e.g. "placement is in this feature's README"
  ([`docs/rules.md`](../../docs/rules.md#comments)). An ADR's number, sections and the location of a decision
  all move, but a README moves with its layer, so a move does not ripple to the referrer — when comments point
  directly, references scatter across the code and rot while the ADR cannot see who points at it
- **Declare `test-requirement: [feature, component, unit]`, stating that a slice holds three shapes.** `feature`
  applies to what is assembled at the screen level (`page-content` / `view` / `results` / compositions on the
  static shell's side) and carries behavior that holds only once the components come together. **A single
  component under `ui/<part>/` takes the `component` shape** — that one component's rendering contract and
  a11y — and **things that return values** (pure functions, hooks, Server Action helpers) are verified in the
  `unit` shape. The distinction is made by the degree of composition, not by the method
  ([0090](../../docs/adr/0090-testing-strategy.md) responsibilities per layer). Declaring `feature` alone applies
  it uniformly to every file under the feature, imposing composition criteria even on subjects that need no
  React tree, so the declaration disagrees with tests that are correct

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: features` — do not import another feature's internals. Only its `facade/` and whole-screen stories pass | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) (no `features ↔ features` imports, and how to promote instead). Mechanical: ESLint boundaries (`features-facade` / `feature-story` in `architecture.ts`) |
| What is placed in `facade/` is something no kernel can accept (UI carrying a specific domain's vocabulary, identifiers and builders for owned routes), and a second feature actually uses it | Something in a shape promotable to a kernel, or used by only one feature, is a suggestion | [0021](../../docs/adr/0021-frontend-responsibility.md) (a feature's `facade/` as what cannot be promoted) |
| Paths and URLs of routes another feature owns are not copied; they are taken from the owner's `facade/` | violation if it writes the same string as a spelling the other's `facade/` exports | [0021](../../docs/adr/0021-frontend-responsibility.md) (what cannot be promoted) / [docs/rules.md](../../docs/rules.md#url) |
| Several features do not each hold the same display logic, UI or hook. When a second appears, it is moved up to the kernel matching its responsibility | suggestion (a human judges whether they change for the same reason) | [0021](../../docs/adr/0021-frontend-responsibility.md) (how a feature splits its components) / this README's Operations |
| Holds no backend business logic. Does not compute and output values the contract does not return | violation. suggestion when formatting for display cannot be told apart from a business judgment | [0021](../../docs/adr/0021-frontend-responsibility.md) (kernel acceptance criterion 4) / [0070](../../docs/adr/0070-backend-role-separation.md) Prohibitions |
| A feature's `actions.ts` holds only orchestration, and is limited to what needs no assertion of the actor. A change that needs the assertion lives in `src/app/**/actions.ts` | violation if it holds business logic. suggestion if it sends an actor-bound change without the assertion | [0021](../../docs/adr/0021-frontend-responsibility.md) (where Server Actions live) / this README's Operations |
| The top of a screen (`page-content` / `view`, compositions on the static shell's side that hold fetches) is wrapped with `withScreenSpan`, and `<screen>/ui/**` with `withPartSpan`. Span names match the module path from `src/` and mix in no user input. Files with `"use client"` are not wrapped | A top left unwrapped, a name not matching the path, and a wrapped client component are each a violation | this README's Putting rendering on spans / [docs/rules.md](../../docs/rules.md#layers) |
| Every rendering component under `<screen>/ui/**` and `facade/**` has its own story. Only components that cannot be rendered in the browser may lack one, and their doc states why and where the contents can be seen | violation if there is no story and no reason in the doc. suggestion if a composition holding fetches and a component holding the appearance are bundled into one | this README's Putting it in the catalog / [0054](../../docs/adr/0054-ui-catalog-storybook.md) |

## Related ADRs

**The ADRs this layer depends on are gathered here.** Each slice holds its own, so what is listed here is only
what the layer itself — its acceptance criteria, import boundaries and shared fittings — depends on.
Slice-specific ones are held by the section of the same name in `features/<name>/README.md` (the template is the
[feature README template](../../docs/templates/feature-readme.md)).

- [0021](../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. Forbids direct dependencies between features; what is lent goes out through `facade/`. Where Server Actions live
- [0027](../../docs/adr/0027-directory-structure.md) — Physical layout of `src/` and co-location. Screen use cases, dedicated UI, hooks and Actions are co-located in `features/<name>/`
- [0029](../../docs/adr/0029-type-design-discipline.md) — Discriminated unions and parsing at the boundary. Where the boundaries that decode `FormData` and `searchParams` into types are placed
- [0041](../../docs/adr/0041-cache-components-decision.md) — Whether to use Cache Components (PPR). The basis for one route having several top-level spans
- [0054](../../docs/adr/0054-ui-catalog-storybook.md) — Catalog policy. Which things have stories, and the replacement declarations for Server Actions
- [0061](../../docs/adr/0061-form-mutation-ux.md) — The canonical `<form action>` + Server Action mechanism and `ActionState<T>`. The container `form-state.ts` closes over
- [0080](../../docs/adr/0080-error-handling.md) — Error handling. The line between handing a body's failure to the boundary and turning an accessory's failure into a value
- [0090](../../docs/adr/0090-testing-strategy.md) — Test responsibilities per layer. What each layer's `test-requirement` points to, and how fixtures / `coverage-exclusions` are placed
- [0091](../../docs/adr/0091-test-verification-methods.md) — Verification methods. The basis for rendering async RSC with `render(await X())`
