# Inspection Declaration Discipline

This project defines three aspects common to every inspection the repository has — lint, gates, scanners, comparison against baselines — as **one discipline independent of the kind of inspection**: which way to fall when an inspection does not hold, how to declare what is excluded from an inspection, and how to make the exclusion visible.

What each inspection looks at is owned by its own ADR (dependency audits and scanners by [0110](0110-security-operations.md), coverage and the 1:1 mapping by [0090](0090-testing-strategy.md), baseline images by [0091](0091-test-verification-methods.md), a11y by [0100](0100-accessibility-target.md), CI wiring by [0153](0153-ci-configuration.md)). This ADR does not go into their content and holds only **the shape any inspection follows as long as it is an inspection**.

## Status

Accepted

## Rationale / Purpose

- **Give the general form an owner.** The same discipline is stated independently in the scanner suppression policy, the coverage exclusion declarations, the baseline-image exclusions and the disabling of a11y rules, each scoped only to its own inspection. When the next new inspection comes, there is no document answering which of them to copy
- **A broken inspection falls toward reporting "no violations".** If an inspection that did not run and one that ran and was clean show the same green, that inspection keeps passing forever from the moment it breaks. Writing the inspection's content correctly cannot prevent this; how it falls when it does not hold must be held as a discipline
- **Exclusions may exist, but must not exist silently.** A form that leaves no record of the exclusion anywhere silently permits new violations. Unless the place and content of declarations are decided, a different escape route grows for each inspection

## Do not fall to "no violations" when an inspection does not hold

Inspections default to **fail-closed**. A prerequisite that cannot be obtained, targets that cannot be enumerated, an extraction that comes back empty — each is reported as a **failure**, not as "no violations".

There are three ways an inspection fails to hold, and each falls differently.

| How it fails to hold | How it falls |
| --- | --- |
| **A prerequisite cannot be obtained** (the tool's output cannot be read, the delivery root is unknown, there is no manifest) | Raise and fail. Do not continue with an empty result |
| **Extraction drops to 0** (the output format changed, the way scan targets are read broke) | Reconcile the count against a separate path — fail on a mismatch with the expected count, or on finding nothing this time where the baseline side found something, before any volume judgment |
| **Out-of-scope items arise** (a dialect that cannot be checked, a rule that does not run) | Report them individually with location and reason, not just a count. Do not count them as "checked" |

Count reconciliation is done **per unit**. Compared in total, one target's extraction failure hides behind other targets' success.

**Do not shorten time by narrowing the scan range.** The unchecked range grows by exactly the amount narrowed, and the inspection reports "no violations". The population is taken as all targets, not a directory listing, and only the declarations below exclude anything.

**Do not make a mechanism that decides from path declarations whether an inspection is needed into a gate or a required check.** A declaration that looks at the paths in a diff and decides "this inspection is needed / not needed" drifts from reality the moment its targets move. Even when it drifts, the declaration itself still holds, so **the inspection not running comes back green as "no violations"**. Kept as advice (a comment recommending a run), the cost of a dead rule is only that omission, but as a gate the cost becomes "merged without the inspection running". To make it a gate, first have something that detects the declaration drifting from reality.

**Where the condition for holding lies on the tool's side, pin it with an inspection.** A tool that declares its scope with tags or defaults silently does not evaluate anything outside the declared scope. Confirm, by reconciling against the tool itself, that what you believe you enabled is actually running.

## Do not report inspection results through a lossy filter

There are paths where the inspection holds and the report is what goes missing. **Tools that compress output are built to discard passes and keep only failures**. Counts, coverage rates and the fact that "it was 0" are on the side of passes, so they vanish the moment output goes through compression. The reader is left with neither what the inspection looked at nor how far it looked.

So **the results of gates, tests and lint are read and reported in the form the tool produced**. Being faster or shorter is no reason. In particular, for the following two, nothing in the output shows that something is missing.

- **Summarizers** (picking up only failure lines / keeping only headings) — classification depends on vocabulary, so **the reason for the failure itself can be classified as a "pass line" and disappear**. Measured, when a summarizer was applied to the full text of a failed CI run, what remained was a column of pass lines whose file names contained `error`, and the actual reason for the failure was not in the output
- **Partial reads** (head / tail / line limit) — whether a verdict lies on the cut-off side cannot be known from the output after cutting

The way to avoid this is not banning compression but **using lossless narrowing first**. Outputs the runner itself separates (returning only failed steps, only failed files) do not depend on vocabulary because the runner does the selection. Fall back to the full text only when that is not enough, and write in the report what you narrowed with.

What a machine can close is closed ([0144](0144-decision-enforcement-pairing.md)). Summarizers on paths an agent calls are rejected on the side of execution permissions, not by a prose prohibition.

## Declare exclusions and suppressions, with a reason and a removal condition

What is excluded from inspection — modules excluded from coverage and the 1:1 mapping, stories excluded from comparison, rules disabled, references that are correct not to resolve, findings a scanner tolerates — is all written as declarations holding the following three.

1. **Target.** Narrow the unit excluded to the minimum. When excluding a rule, name down to which story and which screen it is excluded on, and keep the same rule alive outside what is named
2. **Reason.** "It cannot be fixed right now" is not a reason. The default is to fix the implementation so the violation disappears, and exclusion is allowed only where the inspection itself does not hold (a side effect of isolated rendering; an upstream implementation that cannot be removed and is not actually reached; a 404 that is itself the subject)
3. **Removal condition.** Write what has to happen for the declaration to be dropped. A declaration whose condition cannot be written is not placed; remove the value or fix the implementation

**A machine judges whether** the reason and removal condition are present. An empty declaration fails the inspection. Validity itself remains a human judgment in review, but a machine enforces as far as being in the required form.

### Gather declarations in one place

Declarations for the same inspection are held by one place. **Forms that put a disabling marker on the writer's side are not adopted** — letting a story or a screen's spec write `rules: { ... }` lets whoever added something silence it on the spot, and the marker travels along to wherever it is copied, silently permitting new violations.

A declaration with two readers is also put in one place. Inspections that exclude the same thing for the same reason, such as the coverage population and the 1:1 gate, read the same array. Written in two places, fixing only one makes them silently diverge, and divergence in the direction of "excluded from the gate yet still required by the inspection" proceeds unnoticed.

**Suppression on the writer's side is allowed only when the tool has no declaration file and it can be narrowed to 1 rule × 1 line** (the scanners of [0110](0110-security-operations.md)). It is allowed by granularity, not by location. Bulk disabling of rules or scanners is not adopted, wherever it would live.

### When declarations increase, suspect the rule

If one place grows beyond a few entries, that signals the rule itself is too broad. Rather than adding more places to escape to, narrow what is treated as a target. The list of declarations is not a deliverable; the goal is for it to be empty.

## Make adding a suppression show up in the diff

The fact that a declaration was added is made to show up **in the diff, not only in the declaration file**.

- **Pin the count.** Pin the number of declarations in a test, and update the number too when adding one. That an update is required itself puts the fact of adding an exclusion into the diff. Editing the prose inside does not move the number, and where the number moves becomes the place for judgment
- **Reconcile date-based conditions periodically.** The only removal condition a machine can decide is a date, and without a mechanism that looks at declarations past their deadline, they keep remaining, and the next person using the same slot takes deadlines themselves lightly
- **Conditions that cannot be decided accompany the list.** Silently dropping a condition such as "once upstream supports it" erases the point of having written the condition

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Disabling markers on the writer's side** (silencing through spec or story options) | No record of the exclusion remains anywhere, and it travels to wherever it is copied. See "Gather declarations in one place" above |
| **Avoiding by narrowing the scan range** | No record of the exclusion remains. Exclude by declaration rather than narrowing the range |
| **Continuing with an unobtainable result as an empty result** | An inspection that did not run and one that was clean show the same green, and it passes forever from the moment it breaks |
| **Bulk disabling of rules or scanners** | New targets that trip the same detection pass straight through too |
| **Permanent allowlists** (declarations without a removal condition) | No one drops them even when conditions change. What cannot have a condition written is not suppressed; fix the implementation |
| **Reading inspection results through a summarizer** | Classification depends on vocabulary, so the reason for the failure itself can be discarded as a pass line. Use lossless narrowing first |
| **Making a README's listing of actual files a gate** | It only constrains how a README is written and does not prevent rot. Declarations are held in a format the inspection reads |

## Prohibitions

- ❌ Returning green as "no violations" when an inspection's prerequisite could not be obtained or extraction dropped to 0 (Enforcement: Prose — **not mechanizable**. How it falls when a prerequisite cannot be obtained is decided by branches in each inspection's implementation, and has no static shape across inspections)
- ❌ Reporting the results of gates, tests or lint through a summarizer that discards passes or through truncation
- ❌ Placing an exclusion or suppression declaration lacking a reason or removal condition
- ❌ Excluding something from inspection on the grounds that "it cannot be fixed right now"
- ❌ Silencing an inspection outside the place for declarations (spec, story, writer-side markers). Line-level suppression is limited to the form of [0110](0110-security-operations.md) (Enforcement: Prose — **partly mechanizable**. The spellings of writer-side markers (`parameters.a11y` in stories, `rules:` in specs, line-level suppression comments) can be rejected by scanning the diff, but no rule exists. Whether a suppression fits the form of 0110 is decided by each surface's form)
- ❌ Holding exclusion declarations for the same inspection in two places (Enforcement: `scripts/markdown-exclusions.gate.test.ts` rejects divergence between the two exclusion places for Markdown scanning. Exclusions for other inspections being split across two places is Prose — **not mechanizable**. Which declarations are exclusions for the same inspection is decided by their meaning)
- ❌ Excluding violations from inspection by narrowing the scan range (Enforcement: Prose — **not mechanizable**. Whether narrowing the scan range is meant to exclude violations is decided by the intent of the change)
- ❌ Making a mechanism that decides from path declarations whether an inspection is needed into a gate or required check without detection of drift (Enforcement: `make actions-required-check-lint` rejects putting a workflow narrowed by `paths:` on the required checks. Whether a mechanism inside a job that decides necessity from paths has drift detection is Prose — **not mechanizable**. Whether detection exists is decided by the meaning of the mechanism)

## Related ADRs

- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — inspection of the catalog's asset references
- [0090-testing-strategy.md](0090-testing-strategy.md) — declarations of coverage exclusions and the 1:1 mapping
- [0091-test-verification-methods.md](0091-test-verification-methods.md) — stories excluded from baseline-image comparison
- [0100-accessibility-target.md](0100-accessibility-target.md) — the conformance target of a11y inspection, and the cap on disabling rules
- [0110-security-operations.md](0110-security-operations.md) — the scanner suppression policy (this ADR's form applied to scanners)
- [0153-ci-configuration.md](0153-ci-configuration.md) — the side that wires inspections into CI
- [0159-script-structure.md](0159-script-structure.md) — the structure of the helper scripts that implement gates
