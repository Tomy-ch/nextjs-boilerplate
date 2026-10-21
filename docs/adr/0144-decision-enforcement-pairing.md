# Pairing Decisions with Enforcement

In this project, when a decision is written, **what keeps it** is written in the same place. This applies equally to ADR decisions, the rules in [`docs/rules.md`](../rules.md), implementation-task issues, and **code comments**; no kind of document is exempt.

How enforcement is written (a table column, the head of a section, a field in an issue) is decided by each document's format. What this ADR defines is not the format but the discipline of **not separating a decision from its enforcement**, and what to write when it remains prose.

## Status

Accepted

## Rationale / Purpose

- **Make it visible whether a decision was kept.** A decision written in prose cannot be known to have been kept unless someone rereads it. Mixing what a machine watches with what it does not leaves nobody able to see how well the whole is kept
- **Make machine enforcement be considered before falling back to prose.** Requiring enforcement to be written together with the decision makes "prose only" visible on the spot, so the room to move it into types, lint, or gates can be considered at review time. Lint and CI are after-the-fact breakwaters; the judgment of whether to mechanize exists only at the time the decision is written
- **Separate what may stay prose from what was forgotten.** The point of the distinction is not to reduce prose. The former has a reason; the latter has work remaining

## Write it where the decision is

- An **ADR** holds enforcement per decision. A decision kept by a machine names what fails it (types / biome / ESLint rule names / a CI job / tests), and a decision kept by people says so. [0021](0021-frontend-responsibility.md)'s per-decision enforcement statements and the `Enforcement:` attached to [0090](0090-testing-strategy.md)'s prohibitions are this form
- **`rules.md`** holds enforcement per rule, and an implementation PR that changes a rule updates its enforcement at the same time
- An **implementation-task issue** holds enforcement when it is filed. Building a ledger in bulk afterwards is not adopted — by then prose has piled up, and a forgotten entry cannot be told apart from "there is only prose"
- For a **code comment**, ask about enforcement before writing it. The constraint a comment states has the same shape as a decision, and whether it was kept should be visible. The discipline of where and how to write is owned by [`docs/rules.md`](../rules.md#comments)

Enforcement is written in the following vocabulary, and several may be listed together. Which one to move it into follows [0002](0002-formatter-linter.md)'s capability-based division — do not write in ESLint a check biome can express, and do not leave in prose a check only ESLint has (a boundary that takes the importing layer as context).

| Means | When it fails | What it does not reach |
| --- | --- | --- |
| types | At writing time (`tsc`) | Properties that do not appear in types |
| Biome / ESLint | commit (`lint:ci`) | Judgments not decidable statically |
| CI gate | push / PR | What the gate does not count |
| tests | Within the range tests are written | Branches not written |
| scaffold generation | Only at generation time | Hand edits after generation |
| prose | When read in review | Changes nobody read |

**Comments sit on the "prose" row of this table.** Writing a comment is therefore a statement that it could not be moved to an upper row. Types and tests work even when unread; prose works only once read — this difference appears only when a comment goes unread, and then prose loses.

## Give prose a reason

Writing "prose" alone does not count as writing enforcement. **The decision itself states whether it can be moved to a machine.**

- **not mechanizable** — it has a reason not decided by the shape of the code. The threshold is not in the code ("a large number of links"), it is a judgment of a layer's responsibility itself, it is a measurement procedure that does not appear in code, and so on. It may stay prose, and no work remains
- **partly mechanizable** — write the statically decidable part (spelling, call site) and the undecidable part (consistency with the contract) separately
- **mechanizable** — the shape of the detection can be written, but the rule does not exist yet. **It is "not implemented", not "cannot be mechanized".** It is visible as a state with work remaining

"Not implemented" and "cannot in principle be mechanized" are different states, and folding them into the single word "prose" leaves later readers unable to tell them apart.

**The work of mechanizing itself is done in a change separate from the verdict.** Holding a verdict and writing a rule are separate; being able to write only the verdict first is why enforcement can be required at the time a decision is written.

## A declaration alone guarantees nothing

Filling in enforcement itself also needs a mechanism that keeps it.

**A declarative requirement chooses its path.** `required: true` in an issue template binds only the web form, and `gh issue create --body-file` passes straight through — and that is the path agents file by. Whether a field is present is decided by the path, not by when the issue was filed. Therefore, when an issue is created / edited, its body is checked and missing fields are pointed out on the issue (`issue-field-lint`). It is not a PR gate because a PR does not create issues. Fields on closed issues are not filled — nobody reads from them anymore, and filling them does not change the implementation that has already landed.

The same holds for other declarations. Prefix matching in agent execution permissions, template requirements, rules written in a README — **distinguish "it is written" from "it is kept", and when writing enforcement, say by which path that means itself is bypassed.** [0156](0156-browser-observation-tooling.md)'s treatment of declarations that do not by themselves secure anything is one application of this discipline.

## The tally holds no decisions

The list of what keeps each decision ([`docs/traceability.md`](../traceability.md)) is a tally, not a decision. Each item's enforcement is owned by the decision's side (ADR / `rules.md` / issue), and the list is the place to line them up and see whether "prose only" has been settled. Counts drift with the code, so they are not written in an ADR ([0140](0140-documentation-operations.md)'s inventory).

## What this discipline does not answer

- **Whether the written enforcement is valid.** A pairing that names "tests" when no test exists looks the same as a correct one. Whether the description matches reality is checked by review (`doc-reviewer`'s accuracy)
- **Whether the judgment that it may stay prose is correct.** It checks only that a reason is written

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Not writing enforcement** | Nobody can see whether a decision was kept. Prose and machine cannot be told apart, and forgotten mechanization does not remain as work |
| **Building a ledger in bulk afterwards** | By the time it is built prose has piled up, and a forgotten entry cannot be told apart from "there is only prose" |
| **Accepting "prose" without a reason** | Not-implemented and not-mechanizable become the same single word |
| **Securing the entry with only the web form's required declaration** | It passes straight through the path agents file by |
| **Checking the enforcement field with a PR gate** | A PR does not create issues. It cannot see the moment a field goes missing |

## Prohibitions

- ❌ Writing a decision without writing its enforcement
- ❌ Writing "prose" without adding the reason it cannot be moved to a machine (or that it can but has not been started)
- ❌ Writing "not implemented" as "cannot be mechanized", and the reverse (Enforcement: Prose — **not mechanizable**. Whether the shape of a detection can be written is judged from the meaning of the decision, not decided by the shape of the written words)
- ❌ Treating a declaration of enforcement (a requirement, a permission, a rule) as secured by the declaration alone (Enforcement: Prose — **not mechanizable**. By which path a declaration is bypassed is a judgment that investigates the path per declaration, and is not decided by the shape of the code)
- ❌ Writing a decision in a tally document. Writing counts in an ADR (Enforcement: `scripts/rules-tally.gate.test.ts` makes the generated block of `docs/traceability.md` match the tally from the implementation rules. Writing a decision outside the generated block, and counts in an ADR body, are Prose — **not mechanizable**. Whether a sentence is a decision, or a number is a count, is decided by meaning)
- ❌ Changing a rule while leaving its enforcement as it was

## Related ADRs

- [0002-formatter-linter.md](0002-formatter-linter.md) — biome / ESLint capability-based division (which machine to move it into)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — not keeping the layers' dependency direction by documents alone (an example of pairing)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — Enforcement section (the form that holds enforcement per decision)
- [0090-testing-strategy.md](0090-testing-strategy.md) — the test gate, and enforcement attached to prohibitions
- [0140-documentation-operations.md](0140-documentation-operations.md) — the four categories (where rule and inventory live), sole ownership of rationale
- [0150-git-workflow.md](0150-git-workflow.md) — PR operations
- [0153-ci-configuration.md](0153-ci-configuration.md) — the CI job split (what is named as a CI gate)
- [0156-browser-observation-tooling.md](0156-browser-observation-tooling.md) — a declaration alone guarantees nothing
