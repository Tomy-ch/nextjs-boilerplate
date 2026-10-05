# Testing Strategy

Defines testing's **framework choice / responsibilities per layer / naming and placement / coverage gate / two-tier execution / mock strategy**. The grounds for the conventions are limited to the TS / Vitest de facto standards and derivation from this repository's architecture (§Strategy).

## Status

Accepted

## Context

Left undecided, the framework choice, per-layer responsibilities, coverage, and placement and naming of tests get written in a different shape per directory, and nobody can answer what the coverage number means. This ADR settles them. The grounds for the strategy (what to verify and how) are limited to the TS / Vitest de facto standards and derivation from this repository's architecture, and the framework follows the Next.js / React standards.

## Decision

### Framework: Vitest + RTL + MSW + Playwright

- Adopt **Vitest** (unit / component) + **React Testing Library** (component) + **MSW** (mocking the HTTP boundary) + **Playwright** (E2E)
- Grounds for the choice: effectively unique under the criteria of [0004](0004-library-management.md) (actively maintained, ecosystem standard). The packages themselves and main tools are exact-pinned + `pnpm audit` ([0004](0004-library-management.md))

### Strategy

Only two grounds for conventions are accepted — **the TS / Vitest de facto standard**, or **derivation from this repository's architecture**. Translations of other languages' customs are not grounds. Below, the source of each is stated alongside.

- **Co-location** (de facto): tests are placed next to the implementation ([0027](0027-directory-structure.md)). They are not collected into `__tests__/`
- **The case name identifies the case** (de facto): it is required that a failed case can be identified by its name. `it.each` / `it.for` **satisfy this requirement and may be used** when accompanied by a name template (such as `"$name の…"`). What fails it is looping over cases with a hand-written `for` / `forEach`, where the `it` name is shared across all cases so a failure cannot be traced to a case, and state also tends to be shared. This is forbidden
- **One subject, one test** (derived): each callable export has a corresponding test. A 100% coverage hard gate means something as a number only when a machine can answer "where the contract of which export lives"
- **Write tests after the look is settled** (derived): for subjects that return rendering, finish checking the look (stories and review) before writing tests. Test-first is not adopted — the other way round means rewriting tests every time the look moves, and rewritten tests slacken toward the sole goal of "passing". Subjects that return values (kernels / pure functions) have no look, and this ordering constraint does not apply

### Test structure: 1:1 export-to-describe mapping

Adopt the common JS/TS structure where `describe` is the subject and `it` the predicate, and fix the subject to the **export name**.

- **The outermost `describe` is the export name**. If one file has several exports, several outermost `describe` blocks are lined up too
- **A callable export has exactly one top-level `describe` with its own name**. Callable values (functions / classes / React components / the return value of `cva()`, etc.) are covered; constants and zod schemas are not required (writing one is allowed)
- **Every top-level `describe` corresponds to some export**. No grouping `describe` without a counterpart is placed
- **Default exports are covered too**. For the `describe` name, use the declared name `Foo` for `export default function Foo`, and the referenced identifier `Foo` for `export default Foo`. That the public name is `default` is an internal detail of the check and does not surface on the test side
- **No default export without a name is placed**. `export default () => {}` / `export default function () {}` have no name that a `describe` can point at and cannot be a 1:1 subject. Give it a name and use the shape above. The property of having no name to point at does not fit the 1:1 gate's vocabulary (missing / duplicate / unknown), so enforcement is held as a naming check by ESLint `project-rules/no-anonymous-default-export`
- **Grouping by viewpoint is done with comment separators, not nested `describe`**. `it` blocks are lined up directly under the export-name `describe` and separated by comments. **The axis changes with where the subject's results appear** ("choosing the axis" below). Nesting is not used because, with only two viewpoints, the hierarchy gets one level deeper and the failure display becomes redundant: `対象 > 正常系 > ケース`. Separator comments have no runtime effect, and the axis of branching is visible when skimming the file
- **Nested `describe` is placed only for a context with shared setup**. When a precondition assembled in `beforeEach` is common to several cases, nesting is allowed (it is also TS idiom). Its name then states **that context** (`describe("ログイン済みのとき", …)`). `正常系` / `異常系` are not used as nested `describe` names — those are viewpoint groupings, not contexts
- `it` strings are in **Japanese** and state the behaviour + the branching condition (connected to AGENTS.md's "test `describe` / `it` strings are Japanese")
- **Exports with no branches are covered too**. A body without an `if` still has a contract (a component that just passes props through pins where it passes them and its default values, etc.)
- **The axis is chosen by where success and failure appear**. For many subjects this coincides with "does it return a value or rendering".
  - **Subjects that return values** (pure functions / adapters / stores / Route Handlers / Server Actions) are split with `// ----- 正常系 -----` / `// ----- 異常系 -----`. Success and failure really exist as return values and exceptions, and "what it accepts and what it rejects" is the subject's own contract
  - **Subjects that return rendering** (components / hooks for rendering / `page-content`) are **not split**. When long enough to want splitting, the axis is **loading / empty / error / success** as stated by "each screen designs the four states loading, empty, error and success" in `docs/rules.md` *State Display and Loading*, naming the state as in `// ----- 空のとき -----`. For a subject that renders, an upstream failure is not "an input it rejects" but **one of the states it shows**, belonging to the happy path on the same footing as success. Treating failure separately would cut only error out of the four states into a separate block and split the coverage of states across two places
  - **Imperative entry points that return no value** (mount / register / start) **lean according to where success and failure appear**. For a subject that returns `Promise<void>` and swallows exceptions, success and failure exist in neither the return value nor exceptions, so the value-side grounds do not hold as is. If the only observable result is the subject's own output (the DOM it rendered), adopt **the same state axis as the rendering side**; if it throws failure back to the caller, adopt **the value-side axis** even though it returns no value. No third axis is set up — what decides the axis is not the return type but where failure appears
- **The rules on `正常系` / `異常系` below apply only to subjects that return values**.
- **Sorting into `正常系` / `異常系` is decided by "inside or outside the happy path"**. `正常系` is the expected course; `異常系` is the opposite — behaviour for inputs outside the contract, missing values, upstream failures and refused boundaries. **How the subject expresses that situation does not matter** (throw / reject / returning an error state / discarding the value / rendering nothing — any of these goes in `異常系`). In TS, failure is not expressed only by exceptions, so cutting by means of expression scatters failure-path tests into `正常系` and defeats the purpose of splitting the blocks
- **The split is for readability**. When the happy path and its opposite are mixed in the same place, skimming cannot follow "what it accepts and what it rejects". So a borderline case may be decided by **which placement makes the file easier to read**
- **An input inside the contract whose result is success goes in `正常系`**. This holds even if the value is a boundary or empty (passing an empty array and getting an empty string back is success, not `異常系`). `境界ケース` is a viewpoint, not a third category, and is split into the two according to the result on each side
- **"Absent" comes in two kinds, sorted in opposite directions**. The absence of a declared optional value (an optional prop / an argument accepting `null` / an empty list) is **inside the contract**, so it is `正常系`, and falling back to a default or "rendering nothing" is the happy path itself. The absence of something that should be there (a required setting, a file that should exist, a response that should come back) is **outside the contract**, so it goes in `異常系`. The test is "does the contract declare that absence"
- **Before `it.skip`, cut out the part that cannot be verified and push it as far as mocks can reach**. In TS, `vi.mock` reaches module boundaries, so the range that can be called "unverifiable" is narrow. The procedure — **cut the side effect blocking verification** (`process.exit` / environment reads at load time / launching external processes, etc.) **out into a dedicated function in a separate module**, and have the subject merely call it. The test mocks that boundary and **verifies up to the arguments it was called with and the branching**. What remains is only the body of the cut-out function, which in most cases has no branches left. **Cutting out is a change to the subject** — the test author neither silently rewrites the subject to reach it nor skips it as unreachable; they show how to cut it out so it becomes reachable, and handle it as a change on the subject's side
- **`it.skip` is allowed only for the remainder that cannot be reached even after the cutting out above**. The reason states "what remains, and why `vi.mock` / `vi.stubGlobal` cannot reach it". **"Already covered by another test" is not accepted as a reason** — it makes the subject's verification depend on another test's implementation; if the covering side shrinks or disappears it stays green, and branches added later go silently unverified. The 1:1 mapping becomes an empty shell of names only
- **`it.todo` is used only when where it gets resolved can be named**. **Confirm with a human** which issue / phase resolves it, and state it explicitly in the text, as in `it.todo("<behaviour>(#123 で解消)")`. If it cannot be stated, do not make it `it.todo`; **write the test as far as the current conventions allow**. In that case prefix the `it` name with `暫定テスト：` to show by name that it is to be rewritten later

```ts
describe("parseSearchParams", () => {
  // ----- 正常系 -----
  it("すべての条件が省略されたとき既定値を返す", () => {});

  // ----- 異常系 -----
  it("契約の外の値を受け取ったとき例外を投げる", () => {});
});
```

The mapping is **checked mechanically by `scripts/one-to-one.gate.test.ts`**. It looks in both directions: "an export has no `describe`" and "a `describe` has no corresponding export". One direction alone would let through the state where an export was deleted but its test remained, and the state where a test was renamed to another name.

This ADR holds the judgment; **the code of conduct for writing and reviewing is held by the [Testing Conventions](../testing-conventions.md)**. Assertion strength, Testing Library principles and handling APIs jsdom lacks are there.

### Responsibilities per Layer

| Layer | Subject | Tool |
| --- | --- | --- |
| unit | Pure logic (`model` / pure functions inside a feature) | Vitest |
| component | Rendering and behaviour of UI components | Vitest + RTL |
| feature | Composed UI and behaviour of a screen slice (`features/**`) | Vitest + RTL |
| route | Composition of a route segment (`layout.tsx` / `page.tsx` under `app/**`) | Vitest + RTL |
| integration | **The HTTP boundary only** (API clients in `adapters` / the route handler boundary) | Vitest + MSW |
| e2e | End-to-end browser paths | Playwright |
| visual | The **look** of stories (comparison with baseline images) | Playwright (in a container) |

Only `visual` has a **story** as its subject rather than an implementation module, and it holds no `test-requirement` declaration either. Whereas the other layers ask "is this behaviour correct", `visual` asks only "**has it changed from before**", because it holds no internal criterion of correctness (the criterion is its past self). It bears the viewpoints that DOM assertions cannot express. The means and operation are in [0091](0091-test-verification-methods.md).

The other layers are declared by `test-requirement` in README frontmatter. **A directory that holds tests must, walking upward, always hit some declaration**. If it does not, there is no way to look up which row of the per-layer responsibility table to check it against, and the reviewer ends up guessing from the subject's appearance. Whether a declaration exists is checked mechanically by `scripts/test-requirement.gate.test.ts`. Resolution is "the first README upward that holds `test-requirement`", and READMEs without a declaration are passed through. However, the declaration in the repository-root README covers only the files directly at the root. Inheriting it downward would make it a global default, and directories lacking a declaration would pass silently without being looked up. The three layers that share the same means (`component` / `feature` / `route`) are told apart by **the degree of composition of the subject**. The rendering contract of a single component is `component`; something that assembles multiple kernels and feature-internal components into a screen unit is `feature`; the container that puts that screen on a route is `route`. They are split by degree of composition rather than by means because the viewpoints they bear change: `feature` and `route` bear "behaviour that holds only once the components come together".

**Where the viewpoints borne are decided by the element rather than the placement, `architecture.ts` declares them ahead of the README.** What an `app` Route Handler verifies is the result for a request, and that does not change whether it is placed under `api/` or outside it. A README found by walking up directories cannot express this; it ends up as a nested override only under `api/`, and the same element moved outside inherits the parent's declaration. The declaration is held by `APP_ELEMENTS` in `architecture.ts` ([0025](0025-app-layer-elements.md)), and `resolveTestRequirement` looks it up before the README walk.

**When a declaration and the tests disagree, do not adjudicate case by case; adjudicate with the following rules.** If the same situation reaches different conclusions per directory, the only option left is copying the precedent of the neighbouring directory. State which rule was applied.

- **If how the tests are taken is right as a design, fix the declaration.** If the means the tests adopted has architectural grounds, it is the declaration that failed to describe reality. Give that directory its own `test-requirement`, and write **the criterion for choosing the means** along with it — writing only the means lets the next directory in the same situation copy the precedent
- **If the declaration is the right intent, fix the tests.** If the deviation has no design grounds, the frontmatter states the state that should be true, and the tests are aligned with it
- **An inherited declaration applies only where its premise holds.** An `integration` declaration written for an HTTP-boundary adapter does not govern a neighbouring pure formatting helper. Resolving formally through the walk and the declaration applying are different things; the nearest declaration that does not apply is treated as if absent, and the directory is closed by giving it frontmatter
- **Directories that are not kernels also own their viewpoints.** Directories such as `scripts/` / `tokens/` that have no kernel README above them hold their viewpoints in their own README. If there is none, that is a missing declaration, not a reason to get by without checking against anything

**Declarations are split by the range the testing means can reach.** One module does not necessarily fit in one layer. Silently dropping the part that does not fit from the declaration leaves a viewpoint nobody bears. If you split, write the layer you split into in the declaration too — frontmatter accepts a list like `test-requirement: [unit, component]`.

**Boot / boundary entries outside the kernels** (`src/proxy.ts` / `src/instrumentation.ts`) have no README and ride on no `test-requirement` walk (the boot / build boundary of [0021](0021-frontend-responsibility.md)). Placing a README in a directory with no layer and declaring there would make it look as if a layer existed there. **The function body is `unit`** — because calling it as a function can exercise its branches. The declaration lives in the same kind of place as elements: `ENTRY_POINTS` in `architecture.ts` holds it, and `resolveTestRequirement` looks it up there. **Neither this ADR nor `scripts/` holds a copy** — with the declaration in two places, nobody can detect a state where only one of them moved. However, the `matcher` of `export const config` in `proxy.ts` does not go through the path of calling the function directly, so in principle it cannot be checked by `unit`. **Selection misses are borne by `e2e`** ([0043](0043-middleware-policy.md)).

- **When a `unit` subject uses React's hook API, RTL's `render` / `act` may be used**. Hooks can be called only through a React tree and cannot be verified by the same means as pure logic (the `capabilities` kernel)
- **Integration = the HTTP boundary only** is the subject, **the inside is mocked**, and **types / shapes are asserted** (correctness of values is ensured by unit). **However, for a Route Handler where the boundary itself holds decisions, the decision results (status / body / headers) are the subject's contract, and integration asserts those values directly** — there is no other unit layer guaranteeing that decision, and looking only at shape cannot distinguish the 400 and 401 branches
- **The testing policy for Server Components / the line between RSC, route handlers and E2E** is owned by [0091](0091-test-verification-methods.md) (async RSC is unit; only what can be verified only end to end goes to E2E / integration)

### Coverage Gate

- **Coverage is measured with istanbul** (`@vitest/coverage-istanbul`). v8 maps runtime block coverage through source maps, and **when multiple test files load the same React tsx, it drops counts from a file that exercises every branch on its own** (measured: `chart.tsx` at 102/102 alone versus 95/102 in the full run; unchanged by pool type, AST-based remapping or worker count). istanbul instruments the source and counts, so this drop does not happen. **Exclusion directives are written as `/* istanbul ignore next */`, always followed by a reason after `--`** (there is no syntax equivalent to v8's `ignore start` / `ignore stop`; directives covering a block are placed per function)
- **A 100% coverage hard gate**. Exclusions are held in one place, the declaration in `scripts/lib/untested-modules.ts`, which both the coverage denominator and the 1:1 gate read. Writing them in two places makes them drift silently when only one is fixed, and drift in the direction of "excluded from the gate yet still required by coverage" goes unnoticed
- **`eslint-rules/` is included in the denominator too**. A home-made lint rule that gets one decision wrong becomes "green with 0 findings despite there being targets", and nobody can see that it broke. No state is left in which the rules themselves go unchecked
- Exclusions carry **removal conditions** written in the declaration. **A coverage exception also requires a record + approval in the README of the owning package (layer / feature)** (governance of exceptions). The record is held by `coverage-exclusions` in README frontmatter, and agreement with the declaration is checked mechanically by `scripts/coverage-exclusion.gate.test.ts` — it looks **in both directions**, rejecting both a missing record (the owning side cannot notice the hole) and a leftover record for something already removed (the README announces more holes than exist)
- **The README holds only the list of subjects**. Reasons and removal conditions are on the declaration side; writing the same content in two places lets one drift. The record answers only "is there a hole in checking under here"; why it is open is read from the declaration. **Approval is outside the mechanical check** — whether it may be increased is left to PR review, and the gate can stand in only up to "is it written"
- **The threshold is judged by the collecting job, not by each split machine.** A split run reaches only the files it was given, and what its siblings covered looks unreached. So each split turns the threshold off and writes a blob report, and the collecting side reassembles coverage over the whole population before judging. Judging per split would turn the 100% gate red depending on how the split was cut
- A coverage **PR report** is produced. The concrete reporting tool and CI integration are handed over as the responsibility of **[0153](0153-ci-configuration.md) (CI configuration)**

### Two-Tier Execution

- Execution is two-tier: **CI = strict (cache disabled)**, **pre-commit / local = fast (cache enabled)** (a fast hook + an authoritative CI doubling; same shape as [0151](0151-git-hooks.md)). Hooking into lefthook / CI is done in [0151](0151-git-hooks.md) / [0153](0153-ci-configuration.md)
- **The suites are split in two: the application itself and `scripts/`** (`vitest.scripts.config.ts`). They are not folded into one because what they check differs — what lives in `scripts/` is the lints and gates themselves, and when they break they fall toward reporting "no violations". So that their failures are not misread as an application regression, both the runs and the CI jobs are separated

### Mock Strategy

- **Use MSW for mocking the HTTP boundary** and **`vi.mock` for swapping at module boundaries**. Hand-written mocks are minimized — a hand-written stub couples to how the subject calls it, and changing the implementation breaks it even when production is correct
- **What MSW handles is counterparts that have a contract**. Handlers generated from the contract (OpenAPI) are the source of truth for the response shape, and hand-writing them makes tests ratify contract violations. A counterpart without a contract — something outside the contract, like the authentication platform — has no generated handlers, and using MSW would mean hand-writing responses anyway, so **swap it with an implementation the caller injects (`fetchImpl`)**
- **Tests that verify the behaviour of the communication itself (retry / circuit breaking / timeout) are also written by injecting `fetchImpl`**. They need a different response per attempt, and that control is held by the caller, not by a per-destination handler. This injection point is a seam the production code holds, not a hole made for tests
- Swapping config is done by env stubs + factory regeneration ([0030](0030-environment-variable-management.md)). The concrete API for env stubs is Vitest's **`vi.stubEnv`** ([0030](0030-environment-variable-management.md) delegates the concrete API to this ADR)

### Placement and Naming

- Test files are co-located next to the implementation ([0027](0027-directory-structure.md)). The stem of the file name is **kebab-case + `.test.ts(x)`** (following the unified policy of [0028](0028-naming-convention.md); e.g. `format-date.test.ts`)
- `describe` is the export name, and `it` strings are Japanese ("Test structure: 1:1 export-to-describe mapping" above)
- **A set of inputs is a `<name>.fixture.ts`, placed directly under the range that uses it.** Both tests and stories read the same inputs; if one side assembles only its own share, the assumptions about container width and item counts split in two. It holds no decisions, so no 1:1 test is required, and its exclusion is held by the script's declaration

## Prohibitions

- ❌ Collecting tests into `__tests__/` (co-locate next to the implementation) (Enforcement: `scripts/one-to-one.gate.test.ts` (rejects a test with no subject next to it as `orphan-test-file`, and an export with no test next to it as `missing-test-file`))
- ❌ Enumerating cases with a hand-written `for` / `forEach`. Write them in a shape where each case gets a name (sequential sibling `it` blocks, or `it.each` / `it.for` with a name template) (Enforcement: Prose — **mechanizable** (`no-restricted-syntax` rejecting `it` / `test` calls inside `for` statements and `forEach` bodies in test files; no rule exists))
- ❌ Wiring integration tests for real past the inside of the HTTP boundary (the inside is mocked; assert types / shapes) (Enforcement: Prose — **not mechanizable**. Where the inside of the HTTP boundary begins is decided by the subject's meaning, not by the shape of whether mocks are present)
- ❌ Placing a top-level `describe` other than an export name (a grouping such as `正常系`). Viewpoint grouping is done with comment separators
- ❌ Mapping two or more top-level `describe` blocks to one export
- ❌ Placing `it.skip` with "already covered by another test" as the reason (Enforcement: Prose — **not mechanizable**. Whether an `it.skip` reason is a dependency on another test is decided by the meaning of the reason text)
- ❌ Escaping to `it.skip` without cutting out the side effect that blocks verification (Enforcement: Prose — **not mechanizable**. Whether cutting out the side effect would make it reachable is a judgment about the subject's structure, not determined by the shape of `it.skip`)
- ❌ An `it.todo` that cannot name the issue / phase that resolves it (instead, prefix `暫定テスト：` and write as far as possible) (Enforcement: Prose — **partly mechanizable**. That an `it.todo` string has no `#<number>` can be seen statically, but no rule exists. Naming by phase has no fixed spelling)
- ❌ Placing a nested `describe` named `正常系` / `異常系` (viewpoint grouping is with comment separators; nesting only for a context with shared setup) (Enforcement: Prose — **mechanizable** (`no-restricted-syntax` rejecting a nested `describe` whose first argument is `正常系` / `異常系`; no rule exists))
- ❌ Splitting the tests of a subject whose results appear only in rendering into `正常系` / `異常系` (the axis is state; upstream failure is one of the states; this includes mount functions that return no value) (Enforcement: Prose — **partly mechanizable**. Tests of subjects whose `test-requirement` is `component` / `feature` / `route` that have `正常系` / `異常系` separators could be rejected, but no rule exists. Whether a mount function that returns no value is on the rendering side is decided by where its failure appears)
- ❌ A default export without a name (`export default () => {}`, etc.). It cannot be a 1:1 subject (Enforcement: ESLint `project-rules/no-anonymous-default-export`)
- ❌ Writing coverage exclusions anywhere other than the declaration in `scripts/lib/untested-modules.ts`, or increasing them without a README record and approval
- ❌ Adding framework or test-related dependencies without an exact pin / `pnpm audit` ([0004](0004-library-management.md)) (Enforcement: `make audit` (CI's `dependency-audit`) rejects `high` / `critical` findings that have a fixed version. The exact pin is Prose — **mechanizable** (a gate rejecting `^` / `~` ranges in `package.json` dependencies; no rule exists))
- ❌ Adding markers (`data-*`, etc.) to production code for the sake of tests (the handles are role and accessible name; a marker is needed only **when a screen requirement demands it as a styling hook**, and then the marker exists for production code's own sake) (Enforcement: Prose — **not mechanizable**. Whether a marker is a styling hook for a screen requirement or for tests is decided by motive, not by the shape of the attribute)

## Related ADRs

- [0027-directory-structure.md](0027-directory-structure.md) — co-location of tests (next to the implementation / no `__tests__` collection)
- [0028-naming-convention.md](0028-naming-convention.md) — test file names (kebab-case + `.test.ts`)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — Server Components / route handlers (what the testing line is drawn for)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — env stubs + factory regeneration (this ADR settles the concrete API)
- [0004-library-management.md](0004-library-management.md) — exact pin / audit for test dependencies
- [0151-git-hooks.md](0151-git-hooks.md) — where two-tier execution (fast hook + authoritative CI) connects
- [0153](0153-ci-configuration.md) (CI configuration) — where the coverage PR report tool and CI integration are settled
