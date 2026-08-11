---
name: scaffold-test
description: >-
  Write the Vitest test file for an existing symbol in this repository — the counterpart to `test-review`, which only judges tests that already exist. Use it whenever a callable export has no test and the 1:1 gate is about to fail (`missing-test-file` / `missing-describe`), when a new function / component / hook / Server Action lands and its test still has to be written, when coverage falls below the 100 % gate and the uncovered branches need cases, or when someone asks 「テストを書いて」「このコンポーネントのテストを足して」「カバレッジが足りないので埋めて」. It hardcodes no viewpoints and no conventions: ADR 0090 (structure, naming, skip discipline, per-layer duties), ADR 0091 (async RSC placement, a11y automated checks), the nearest ancestor README's `test-requirement` frontmatter, `scripts/lib/untested-modules.ts` (what is deliberately out of scope), sibling tests in the same directory, and the subject source are all read at runtime, so the generated test tracks the conventions as they evolve rather than freezing a copy. Derives the case set from the subject's own branches — every conditional, thrown error kind, boundary pair and null/undefined guard — and asserts each branch's distinctive outcome rather than merely executing it, because a repository with a 100 % coverage gate gets no information from coverage alone. Emits Japanese `it` names, the export-name `describe` the 1:1 gate requires, and `// ----- 正常系 -----` / `// ----- 異常系 -----` separators. Strictly read-only on the subject: it never edits, renames, or "makes testable" the implementation — when a symbol cannot be verified without changing it, that is reported as a finding for the user to decide. Do NOT use it to review or critique existing tests (`test-review`), to write HTTP-boundary integration tests for an adapter client or Route Handler (`scaffold-integration-test`), to run the suite (`make test-full`), or to fix a failing test whose subject changed (that is ordinary work on the change that broke it).
argument-hint: '[path/to/subject.ts[:symbol]]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Scaffold Test

Write the test file for a symbol that does not have one, in the shape this repository's gates already
enforce.

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- The 1:1 gate reports `missing-test-file` or `missing-describe` for a callable export.
- A new function / component / hook / Server Action landed and its test still has to be written.
- `make test-full` fails the coverage threshold and the uncovered branches need cases.
- A subject's test exists but a newly added export in the same file has none — this skill adds the
  missing `describe` block without touching the ones already there.

## Do NOT use this skill for

- **Judging tests that already exist** — `test-review` owns that, with five adversarial lenses.
- **HTTP-boundary integration tests** — an `adapters` client or a Route Handler tested through MSW is
  `scaffold-integration-test`'s subject. This skill writes unit / component tests.
- **Running the suite** — `make test-full` / `make scripts-test`.
- **Repairing a test that its subject broke** — that belongs to the change that broke it, where the
  author knows whether the test or the behavior is wrong.

## What this skill reads and writes

Everything below is read **at runtime**. Nothing about the conventions is copied into this file,
because a copy drifts and the gates follow the sources, not this skill.

| Source | What it decides |
| --- | --- |
| [ADR 0090](../../../docs/adr/0090-testing-strategy.md) | `describe` = export name, `正常系` / `異常系` comment separators, per-case naming, skip / todo discipline, per-layer duties, mock boundaries |
| [ADR 0091](../../../docs/adr/0091-test-verification-methods.md) | Where async RSC tests live, how the a11y automated check is integrated |
| The nearest ancestor `README.md` frontmatter (`test-requirement`) | Which layer duty the subject is held to |
| `scripts/lib/untested-modules.ts` | What is deliberately excluded — a subject listed there does not get a test |
| Sibling tests in the same directory | The established local shape (fixture style, helper signatures, MSW wiring) |
| The subject source | The branch set the cases are derived from |
| `AGENTS.md` | `describe` / `it` strings are Japanese |

Writes exactly one file: `<subject>.test.ts` (or `.test.tsx`) next to the subject. Nothing else.

**The subject is read-only.** Never edit, rename, split, or export something extra to make a symbol
testable. When a symbol genuinely cannot be verified as written, say so and stop — see Step 5.

## Step 0. Resolve the subject

When the argument names a file (optionally `path:symbol`), take it. Otherwise ask with
`AskUserQuestion`, offering what the gate currently reports:

```sh
pnpm exec vitest run --config vitest.scripts.config.ts scripts/one-to-one.gate.test.ts
```

Its failure output names every `missing-test-file` / `missing-describe` subject with `file:line`.
Offer those as options rather than making the user type a path.

The gate only surfaces **callable** exports, though — a module that exports nothing but constants
requires no `describe` and therefore never appears here, even with no test at all. When the user names
such a subject directly, take it: a constant's contract (its exact members, its ordering) is worth
pinning even though the gate does not demand it.

Then decide the file to write:

- Subject `src/foo/bar.ts` → `src/foo/bar.test.ts`
- A subject that renders JSX → `.test.tsx`
- The test sits **next to** the subject. A `__tests__/` directory is a violation of ADR 0090.

If the subject appears in `scripts/lib/untested-modules.ts`, stop and say so: it is excluded from
both the coverage denominator and the 1:1 gate by an explicit declaration, and writing a test for it
would contradict that declaration. Removing the exclusion is a separate decision with its own
removal condition recorded in the declaration.

## Step 1. Read the layer context

1. Walk up from the subject to the nearest ancestor `README.md` carrying `test-requirement` in its
   frontmatter, and read both the frontmatter and the body.
2. Read ADR 0090 and ADR 0091.
3. Read the subject source in full.
4. Read the sibling tests in the same directory.

`test-requirement` selects the duty the test owes:

| Value | Duty |
| --- | --- |
| `unit` | Pure logic. Assert returned values and thrown error kinds |
| `component` | Rendering and behavior through Testing Library, **plus the `axe` assertion ADR 0091 requires** |
| `integration` | HTTP boundary only — inside is mocked, shape and type are asserted. Consider `scaffold-integration-test` instead |
| `route` / `feature` | Per ADR 0090's table — read it rather than assuming |

**When no ancestor declares `test-requirement`, or the nearest declaration's premises do not hold for
this subject** (an `integration` declaration written for an HTTP client does not govern a sibling of
pure formatting helpers), treat it as a documentation gap: say so in the closing report and derive
the duty from sibling tests plus ADR 0090. Do not invent a duty silently — the gap is the finding.

## Step 2. Derive the case set from the subject

Build the case list from the **subject's own branches**, not from a template. For each exported
symbol in scope:

- Every conditional, every early return, every thrown error kind.
- Every boundary pair — both sides, so the differing outcome is what the case pins.
- Every guard against `null` / `undefined` / empty input.
- For a component: each variant / state it owns, per the `components/README.md` state table. A
  component that does not own loading / empty / error / success must not have those states invented
  for it.
- For a hook: the states it transitions through, asserted through the rendered result rather than by
  reaching into its internals.

**A branch with no distinctive assertion is not covered.** The repository gates coverage at 100 %, so
"the line ran" carries no information — what carries information is that the case asserts the outcome
that distinguishes *this* branch from its neighbours: which error, which rendered state, which value.

**A symbol with no branches still gets a test.** A component that only forwards props still has a
contract — where it forwards them and what its defaults are.

Assign each case to `正常系` or `異常系` by **whether the subject itself fails**, not by whether the
input looks like a failure. A hook that swallows a fetch error and returns an error state never
throws, so all of its cases are `正常系`.

## Step 3. Plan and confirm

Show the user the planned file path and the case list, grouped by subject and separator, before
writing:

```txt
書き出し先: src/model/format-amount.test.ts

describe("formatAmount")
  ----- 正常系 -----
  - 整数の金額を通貨記号つきで整形する
  - 小数点以下がある金額を最小単位へ丸める
  ----- 異常系 -----
  - 通貨コードが未知のとき InvalidArgumentError を投げる
  - 金額が負のとき RangeError を投げる
```

Confirm with `AskUserQuestion`: 「この構成でテストを書きますか？」 / 「ケースを追加・修正したい」 /
「キャンセル」. The plan is cheap to change; a written file is not.

## Step 4. Write the file

Apply what Step 1 read. As the conventions stand today that means:

- **The outermost `describe` is the exported symbol's own name**, one per subject. Multiple exports in
  one file get multiple top-level `describe`s, in source order.
- **Viewpoints are divided by `// ----- 正常系 -----` / `// ----- 異常系 -----` comments**, with the
  `it` calls directly under the subject's `describe`. Nested `describe` is for a shared-setup context
  only, named for that context.
- **`it` strings are Japanese**, stating the behavior *and* the branch condition.
- **One case per `it`.** `it.each` / `it.for` is fine when it carries a name template that identifies
  each case; a hand-rolled `for` / `forEach` around a bare `it` is not.
- **Mock at the boundary the layer owns**: MSW for HTTP (the shared handlers under `mocks/`, already
  wired in `vitest.setup.ts` — do not hand-roll a `fetch` stub), `vi.mock` for a module boundary,
  `vi.stubEnv` for configuration.
- **Components need `// @vitest-environment jsdom`** at the top of the file, and the `axe` assertion
  ADR 0091 requires.
- **Query the way a user reaches the element**: `getByRole` with an accessible name first, then
  label / placeholder / text. `data-*` is a last resort for something with no accessible handle.
  Use `user-event` over `fireEvent`, and `await waitFor` / `findBy*` rather than a timer.
- **Never write a skip to make the file pass.** If a branch cannot be reached, that is Step 5.

Keep fixtures local and obvious. A fixture component or builder at the top of the file is fine when
several cases share it; a shared fixture module is not this skill's to create.

## Step 5. When the subject cannot be verified as written

Sometimes a branch is unreachable without changing the subject — a side effect at module load, a
`process.exit`, a value that only a real network can produce. **Do not skip it, and do not edit the
subject.** Report it as a finding:

- Name the branch and why it cannot be reached with `vi.mock` / `vi.stubGlobal`.
- Propose the extraction that would make it reachable: move the blocking side effect into its own
  module so the subject merely calls it, then the test mocks that boundary and asserts the arguments
  and branches up to it.
- Let the user decide. The extraction is a change to production code, which is outside this skill.

This is the same bar ADR 0090 sets for `it.skip`: a skip is allowed only for what survives the
extraction, and "covered by another test" is never a reason.

## Step 6. Verify

Run these and report the results honestly, including anything that did not run:

```sh
pnpm fix                                     # formatting + autofixable lint
pnpm exec vitest run <the written test file> # the new cases pass
pnpm exec vitest run --config vitest.scripts.config.ts scripts/one-to-one.gate.test.ts
```

The gate run is what proves the `describe` names satisfy the 1:1 mapping. For a subject inside the
coverage denominator, also confirm the branches are actually covered:

```sh
pnpm exec vitest run <the written test file> \
  --coverage.enabled --coverage.include='<subject path>' --coverage.reporter=text
```

All four metrics must read 100 % for the subject. If they do not, the case set missed a branch —
return to Step 2 rather than lowering the bar.

## Step 7. Hand off to review

Say plainly what was written, what was verified, and what was left as a finding. Then offer
`test-review` on the new file: this skill writes from the subject's branches, and `test-review` asks
the questions a writer cannot ask about their own output — whether the assertions mean anything, and
whether the layer's duty is actually exercised.

## Constraints

- ✅ Read ADR 0090 / 0091, the `test-requirement` frontmatter, and sibling tests at runtime
- ✅ Japanese `it` strings; export-name `describe`; comment separators
- ✅ Confirm the case plan before writing
- ✅ Verify with the 1:1 gate and per-subject coverage
- ❌ Edit, rename, or restructure the subject — read-only, always
- ❌ Write `it.skip` / `it.todo` to make the file pass
- ❌ Write a test for a subject declared in `scripts/lib/untested-modules.ts`
- ❌ Hand-roll a `fetch` stub where MSW owns the boundary
- ❌ Copy the conventions into this file instead of reading them

## Checklist

- [ ] Subject resolved; exclusion declaration checked
- [ ] ADR 0090 / 0091 and the nearest `test-requirement` read this run
- [ ] Case set derived from the subject's branches, each with a distinctive assertion
- [ ] Case plan confirmed with the user
- [ ] File written next to the subject, with the export-name `describe` and separators
- [ ] `pnpm fix`, the new test, and the 1:1 gate all run
- [ ] Per-subject coverage confirmed at 100 % on all four metrics
- [ ] Unreachable branches reported as findings, not skipped
