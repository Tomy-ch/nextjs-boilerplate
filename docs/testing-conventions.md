# Testing Conventions

This document is the code of conduct applied when **writing** tests and when **reviewing** them. The judgment of what to verify and how is held by [ADR 0090](adr/0090-testing-strategy.md) (testing strategy) and [ADR 0091](adr/0091-test-verification-methods.md) (verification methods); this document makes concrete the points where applying them is confusing. If the two conflict, the ADRs take precedence.

The basis is limited to **the de facto standards of TS / Vitest / Testing Library** or **what this repository's structure derives** (ADR 0090's strategy). A translation of another language's customs is not a basis.

## Meaning coverage — coverage carries no information

This repository has a coverage gate at 100% on all four metrics (ADR 0090). **So coverage says nothing about "whether the assertions mean anything".** Every line has been executed, by construction.

Two questions remain.

1. **Branch coverage** — for each logical branch, is there at least one case that goes through it
2. **Meaning coverage** — does it assert the result **specific** to that branch

Typical shapes that fail 2 are the following.

- An error branch checks only that it "threw", not **which error**
- An operation that changes state checks only that it "was called", not **the state after the change**
- A success branch asserts a value that **cannot be distinguished** from other branches
- A boundary case asserts only one side
- Starting things concurrently is checked by the **order** of calls. Sequential `await` lines them up in the same order, so the two cannot be distinguished.
  Keep the first fetch unresolved and check that the later ones have already been called — resolving everything immediately passes even when run serially

A test that does not fail when a branch is inverted or a condition is removed entirely verifies nothing about that branch.

## Assertion Strength

- **Do not apply `toBeDefined()` to a value the types guarantee.** It cannot fail.
- **Do not apply an existence assertion to the result of a logical AND.** `expect(a && b).toBeDefined()` passes even when `a` is falsy, because `false` is
  defined. Check each item by name.
- **Do not feed a sentinel value meaning "not found" straight into a magnitude comparison.** In an ordering check, using `findIndex`'s `-1` in
  the comparison makes a misspelled name always "come first", and the check passes without testing a single ordering.
  Fail when it is not found.
- **Do not make `expect(fn).not.toThrow()` the only assertion.** "Nothing happened" does not state what should have happened.
- **Do not use a snapshot instead of concrete assertions.** A snapshot records the code's behavior as is, so it locks in bugs along with it. Use one only when "the whole structure has not changed" is itself the subject.
- **Do not mock what you want to verify.** Replacing the subject's internals with a mock makes the test verify the mock's setup.
- **Do not fix time or random values as literals.** They rot at date boundaries. For time, fix the display timezone (`Intl`'s `timeZone`) and pass absolute instants.
- **Do not copy a list the subject holds into the test.** A test that checks "everything declared takes effect" takes
  that list from the subject. Copied, adding an item to the subject adds no check, and **it looks like it protects something but protects nothing**.
  If needed, export the constant from the subject (and write the reason for exporting it in its doc).
- **Do not treat counting as having identified an element.** A lower bound on `querySelectorAll(...).length` or a matching count
  does not say which element is the one. If other elements satisfy the condition, it passes even when the intended subject is missing.
  Assert the element by name, and **also check the side that must not be so**.

## Component and hook tests — Testing Library principles

The following are the guiding principles Testing Library defines, not this repository's preferences. When pointing one out, call it by the principle's name.

- **Follow the query priority.** `getByRole` (with `name`) comes first, then `getByLabelText` / `getByPlaceholderText` / `getByText`; `getByTestId` and `data-*` are **the last resort when there is no clue a user can follow**. Querying by `data-slot` or a class name when a role and accessible name exist verifies the implementation, not what a user can reach.
- **`user-event` over `fireEvent`.** `user-event` reproduces the actual input sequence (focus / keydown / pointer events). `fireEvent.click` only dispatches one synthetic `click`, so it **skips the paths that involve the pointer**.
  **The exception is a stand-in for an input whose real counterpart returns a committed value all at once rather than per keystroke** (a rich-text editing surface and the like).
  Sending one character at a time to the stand-in verifies a way of being called that differs from the real one. Pass the committed value once with `fireEvent.change`.
- **`user.type` appends.** Typing into a field that already has a value from autocomplete or an initial value concatenates the values.
  `user.clear` before typing.
- **Overlays render into `body` through a portal.** `screen` looks at the whole document, so it reaches them, but a query narrowed with
  `within(container)` cannot. Receive the opened surface with `screen.findByRole("dialog")`, and narrow the execute action that has the same name
  as the trigger to the inside with `within(dialog)` (a confirmation's trigger and its execute action usually have the same name). The same applies when a story's
  play function starts from `within(canvasElement)`: query the opened surface from `within(document.body)`.
- **"Show it where the user is looking" is not settled by `toBeVisible`.** jsdom has no overlap, so
  `toBeVisible` passes even for elements behind an overlay. Querying from `screen` also finds text that has escaped the surface,
  and **the test is green while the promise is broken**. If the place itself is the promise, narrow the query with the container that
  defines that place — if the promise is to show it inside the surface, query from `within(dialog)` so that the query fails the moment
  it escapes.
- **Do not read a value that is true only during rendering after things have settled.** The settled value is false on every path, so it tells you nothing.
  Wrap with a probe component that records the value on each render into an array, and look at the recorded sequence.
- **Wait instead of sleeping.** Use `await waitFor(...)` / `await screen.findBy...`. A fixed delay is structurally flaky. If time itself is the subject, use `vi.useFakeTimers` + `vi.advanceTimersByTime`.
- **Use matchers that carry meaning.** `toBeVisible` / `toBeDisabled` / `toHaveAccessibleName` state what they claim. `toBeTruthy()` on a queried element claims almost nothing.
- **Assert what the user observes.** If the rendered result can distinguish the branches, look at that rather than a hook's internals or a private call order. Do not settle for reading a store's value directly.

## Where visual claims are checked

Claims such as "two options are laid out with equal weight" or "a surface covers what is behind it" cannot be expressed with a role or an accessible
name. **Where to check one is decided by what the claim is about.**

- **The concrete appearance itself** (spacing, color, glyphs, position) is **held by the baseline images**. Counting class names or
  styles one by one in a unit test turns red on every rewrite that does not change the meaning, and **the appearance it claimed
  is not protected in the first place** — even with the same class, a declaration that applies later changes the appearance.
- **Baseline images protect a claim only when the fixture holds the values in which that claim shows**. To compare the appearance per
  category, put every category and the appearance of a value that matches no category in one row. To check wrapping,
  mix long words with no break points and Japanese text — either one alone does not bring out the wrapping behavior.
- **Relationships between elements** (same / different / only one of them emphasized) may be checked in a unit test. But
  **check only the relationship**. `expect(reject.className).toBe(accept.className)` is exactly the claim "do not make only one of them stand out",
  but baking in the spelling with `toBe("inline-flex …")` locks in the current implementation rather than the
  claim.
- **Present / absent** (not creating the element at all, what is behind becoming unreadable) is the domain of unit tests; this is not a visual
  claim but a structural one.

## Tests clean up what they start

One worker runs many files in a row, so **whatever was not cleaned up when a file ends stays in the worker**. Leftover subscriptions, timers and React roots run after the environment has been torn down and surface as something like `window is not defined`. This does not fail as a failed test but **fails the whole run as an unhandled error** — it turns red with every test passing, and the file named is unrelated to the cause, so the log does not lead to the cause.

- What was `render`ed is cleaned up by Testing Library's `cleanup` (`vitest.setup.ts` applies it to every file). **Whatever was created through any other path, clean up yourself.**
- **Reset the default of a `vi.fn()` created with `vi.hoisted` per test in `beforeEach`.** `vi.restoreAllMocks()` restores only what was created with `vi.spyOn`, and a value given to a `vi.fn()` with `mockResolvedValue` carries over into the rest of the file's tests. On top of a carried-over value, a test that assumes the default stays green while going through a different branch, and which test changed the value can only be found from the order of the file.
- **`vi.resetModules()` does not restore mocks.** A re-imported module receives the same mock the `vi.mock` factory returned before, with its call records and any implementation given midway still in place. A test that re-imports a module also calls `vi.resetAllMocks()` in `beforeEach` — `vi.fn(impl)` returns to `impl` on reset, so a spy wrapping the real thing stays wrapped.
- When calling a production function that has no way to clean up, capture the creation itself on the test side ([`docs-viewer/src/mount/mount-portal.test.tsx`](../docs-viewer/src/mount/mount-portal.test.tsx) does this for `createRoot`). **Do not add a cleanup hook to production just to make it cleanable** — an API that has no caller in production is only baggage that makes the next reader question what it is for.

## Handling browser APIs that jsdom lacks

jsdom does not implement parts of the specification. **Do not work around it by changing how an individual test fires events** — that produces a test that does not go through the path you wanted to verify.

- **Fill the gap in the shared `vitest.setup.ts`, and that file holds all of the fills.** Do not copy the list here — if a component's README says something is "filled" that is not in that file, one of them is stale.
- For each fill, write **why it is needed** in that file. The next person who hits the same problem looks there before escaping into an individual workaround.
- What cannot be filled (anything that needs layout computation, etc.) is **stated explicitly and handed to another verification method**. Do not pass it on "it should work".

**Stylesheets do not apply either.** Of the two forms switched by band, only one is visible on the actual screen, but
both are in the test's tree. A query for the same role and name returns two results, and `toBeVisible` does not tell apart switching by
class. Do not implicitly take the first of `getAllBy*`; decide which one to take and query it by name (the one not inside the sidebar,
for example). The form at each width itself is the domain of the baseline images.

Escaping to `fireEvent` stops the failure, but in exchange the test **goes through not a single line of the gesture-detection code**. A failing test carries more information.

## Memoization cannot be verified here

Vitest does not resolve with the `react-server` condition, so the public `react`'s `cache` is **a pass-through implementation**.
Calling a function wrapped in `cache()` twice in the same render runs it twice, and the test always sees the "not deduplicated" form.
**Whether the intent of wrapping it takes effect cannot be determined from this path.**

- **If you count, count in a real process.** Run it with `pnpm build && pnpm start`, temporarily count the calls on the inside of the wrapped side (the actual
  decryption or fetch), and check that they are deduplicated to one within a single request.
- **Do not claim a mechanism that is not working in a comment.** If it is not deduplicating, remove `cache()` and fall back to fetching once
  on the calling side. The worst state is one where only the words "once per request" remain.

## Rendering a tree that contains `next/dynamic`

**Import that module first in `beforeAll`.**

```ts
beforeAll(async () => {
  await import("../contents/contents");
});
```

Resolving `next/dynamic` inserts an actual module load into every render. Waiting with `findBy*` without importing it first **puts the load inside the wait time**. Running the whole suite in parallel uses up the wait time on loading alone, and whether it fails depends on how busy things are at that moment — it shows up as passing alone, while in the full run a different file fails on every run.

**Do not absorb it by widening the wait time (`asyncUtilTimeout`).** The needed margin becomes determined by "how slow loading is", and it has to be widened again every time components are added.

**Do not perform a second dynamic resolution in the same file.** Even with the module imported first, a second resolution within one file
does not fit in the wait time, and that case alone fails reliably (reordering only swaps which side fails).
Fold facts about the same render into one case.

**It applies not only to tests that render that component directly.** Every test that renders a tree containing a dynamically loaded component is covered, including tests that render the outer frame (`layout`). Importing first does not remove the `dynamic()` boundary — `Suspense` is still passed through.

## Gates that scan the whole repository

**Pass an explicit timeout to `it`.**

```ts
const TIMEOUT_MS = 300_000;

describe("...", () => {
  it("...", () => { /* ... */ }, TIMEOUT_MS);
});
```

The default 5 seconds is a value meant for **one test**, and does not include a scan that walks the whole tree resolving types.
Running the whole suite in parallel stretches it further through contention, so the slowness of the scan turns straight into red, and **the gate fails
while its verdict is correct**. Looking at the failing side shows not a single violation, so it is a long way to the cause.

**Do not shrink the scan scope to cut the time.** Every bit you shrink adds unchecked scope, and the gate keeps reporting "no violations"
while going silent. Take the time with the timeout, and take as much scope as needed.

## Mock Boundaries

- **Stop HTTP with MSW.** Do not substitute a hand-written `fetch` stub or a module mock of an adapter (ADR 0090 limits the integration subject to the HTTP boundary, so if the boundary's position moves from test to test, what is being verified is not fixed).
- **Use contract-driven handlers for mocks.** Keeping separate test-only stubs lets the tests alone keep passing in the old shape even when the contract changes.
- **Only files that import `vitest.setup.msw.ts` start MSW.** Interception costs about 480ms per file, so load it only in files that have an HTTP boundary. In a file that does not load it, `fetch` fails at the moment it tries to go outside, naming the destination (no response is produced).
- **When checking generated artifacts made with random values, fix the seed and run several times.** A nullable field of a mock generated from the contract
  draws either a value or `null`, so a single run leaves the side that was not chosen unchecked.
- **Replace `next/cache` in a module that has `use cache`.** `cacheLife` / `cacheTag` work only in the execution context of Next with Cache Components
  enabled, and unit tests do not have that context. What is replaced is the execution context, not
  the subject under verification.
- **If the same file also checks the rendered result, do not replace child components with empty mocks.** Wrap the real thing with `vi.mock(path, async (importOriginal) => …)`,
  make it `vi.fn(actual.X)`, and record only the props passed. Replacing it strips the content from the same file's ordering and
  a11y checks.
- **Do not narrow the responses a mock can reach on the grounds that "the real API only returns them in this order".** A mock's control surface is
  **an endpoint for reaching states**, not an implementation of the real system's lifecycle policy. What the side under test observes
  is only the state at that moment, not the sequence of operations that led there. Only invalid or contradictory states
  may be narrowed out ([0113](adr/0113-development-access-surface.md)).

## What goes where

- **Put a test next to its subject** (co-location). Do not gather them in `__tests__/`.
- **A property promised by a component that remains is pinned by that component's own tests.** It is not enough that a sample screen's test checks the same property — in a tree with the sample purged, nothing would check that property anymore.
- **The outermost `describe` is the exported symbol's name** itself. One file per subject.
- **Group perspectives with comment dividers**. Use nested `describe` only for contexts with shared setup.
- **The axis changes with what the subject returns** (ADR 0090).
  - **Subjects that return values** (pure functions / adapters / stores / Route Handlers / Server Actions) use `// ----- 正常系 -----` / `// ----- 異常系 -----`. The split is inside versus outside the happy path, not the means of expression (throwing or returning an error state). A Server Action that ends in `redirect()` is the typical case: it throws when it succeeds — the real one does not return, so the replacement of `next/navigation` throws too, and the destination is taken from that exception. It goes under `正常系`.
  - **Subjects that return rendering** (components / rendering hooks / `page-content`) are **not split**. When it is long and you want to group, the axis is the four states (loading / empty / error / success) that [docs/rules.md](rules.md#states) requires of every screen. **An upstream failure is also one of the states**, not an input to reject.
- The split exists for readability, so a borderline case may be placed wherever it reads better.

## Review Order

1. **Is there any subject symbol with no test at all** (invisible to coverage: it is executed, but no test bears its name)
2. **Branch coverage** — is there a branch that does not fail when inverted
3. **Meaning coverage** — does it check the result specific to that branch
4. **Assertion strength** and **the Testing Library principles**
5. **Structural conformance** (the shape in ADR 0090)

1 and 2 cannot be seen without starting from the subject's source. Reading only the test files can judge only the quality of the tests that are there.
