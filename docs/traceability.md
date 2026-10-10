# Traceability

**A list of what each decision is protected by.** It is a tally, not a decision — the enforcement of each
item is held by each decision in the [ADRs](adr/README.md), each line of the [implementation rules](rules.md),
and the issues of implementation tasks. This is where they are lined up, to see **whether the ones that end
in "prose only" have been settled**.

**Do not write new rules here.** If you want to, it is a decision, so put it in the document that owns it
([0144](adr/0144-decision-enforcement-pairing.md): the tally holds no decisions).

## Why Tally

Whether a decision written in prose has been kept is unknown unless someone rereads it. Counting what
machines check together with what they do not makes **how well things are kept overall visible to no one**.

The point of counting them separately is not to reduce prose. It is to **separate what may stay prose from
what has been forgotten to mechanize**. The former carries a reason; the latter has work remaining.

## Rules (`docs/rules.md`)

A section header's `> Rationale: …; enforced via …` states which machine checks that section. Only a rule not
covered by its section header's means states for itself, on the spot, whether it can be mechanized
([0144](adr/0144-decision-enforcement-pairing.md)).

**The next part is generated. Do not edit it by hand.** `pnpm docs:tally` writes it out from `docs/rules.md`,
and `scripts/rules-tally.gate.test.ts` fails when it goes stale ([0146](adr/0146-rule-reference-stability.md)).
Hand-counted numbers are not placed here because **later readers cannot verify them**.

<!-- generated: rules-tally -->

**21 sections, 255 rules.**
Of these, 18 sections name a mechanical means in their header, and 32 rules state their own verdict.

| Verdict | Count |
| --- | --- |
| not mechanizable | 26 |
| partly mechanizable | 2 |
| mechanizable | 4 |

### 6 rules with work remaining

| Section | Rule | Verdict |
| --- | --- | --- |
| [Rendering and Caching](rules.md#rendering) | Invalidate only the routes that actually render the data that mutation changed. | partly mechanizable |
| [Layout and Bands](rules.md#layout) | Do not branch a component's contents on the band (viewport). | mechanizable |
| [Layout and Bands](rules.md#layout) | Do not branch a screen's skeleton on the container's width (container query). | mechanizable |
| [Comments and Documentation](rules.md#comments) | Named functions get TSDoc, with tags aligned by the following rules. | partly mechanizable |
| [Comments and Documentation](rules.md#comments) | The side that survives the sample purge carries the subject's vocabulary neither in names nor in contents. | mechanizable |
| [Workflow and Agents](rules.md#workflow) | Do not use git operations that discard uncommitted work irrecoverably. | mechanizable |

<!-- /generated: rules-tally -->

**Do not mix "not mechanizable" with "mechanizable".** The former has no road; the latter has a road that
no one has walked. Mixing them buries what would be done by doing it under "cannot be done".

**Where to mechanize, and why it is not being started now, are held by the rule side.** Copying them here
makes double bookkeeping ([0144](adr/0144-decision-enforcement-pairing.md): the tally holds no decisions).

**The mechanizing work itself is not done here.** Holding a verdict and writing the rule are separate PRs
(excluding the 2 awaiting a design judgment, the rest is #634).

## ADR

**Unlike the rules, this chapter is not generated.** Where enforcement is stated is scattered differently per
document and cannot be counted by exact match (see *Locations are scattered four ways* below). The
following are **values counted at the point of 82 ADRs**, and do not include those added since.

**The unit of decision is one bullet line in each ADR's `## Prohibitions`.** An ADR without prohibitions
([0121](adr/0121-i18n-strategy.md) / [0130](adr/0130-pwa-strategy.md); both exclusions) counts the
first bullet of `## Decision` as one. Picking decisions out of the body prose is not adopted as a way of
counting — how much to read as one decision varies by who counts, and no one can reproduce the same number.
Counting lines, anyone who counts the bullets of `## Prohibitions` arrives at the same population.
**Decisions that exist only in the body and are not carried into the prohibitions are not in this
population.**

**82 ADRs, 557 decisions.** Split by where enforcement is stated, they are as follows, and **there is no
decision without a declaration anywhere.**

| | Count | ADR | Actual state |
| --- | --- | --- | --- |
| Stated by the ADR itself | 518 | 82 | `Enforcement:` attached to a line, enforcement attached to a decision in the body, an `Enforcement` section, a table of where machines reach |
| Placement deviation | 39 | 22 | A `rules.md` section holds the same rule and its section header's means covers it. **Covered** |
| No declaration anywhere | 0 | — | — |

### Verdicts Attached to Lines

Of the 518 stated by the ADR itself, 432 carry a verdict at the end of the prohibition line in the form
`(Enforcement: …)`. This is their breakdown.

| Verdict | Count |
| --- | --- |
| none — a decision not to adopt | 47 |
| a machine catches it | 25 |
| a machine catches part; the rest is prose | 93 |
| Prose — not mechanizable | 134 |
| Prose — partly mechanizable | 64 |
| Prose — mechanizable | 69 |

**A decision not to adopt has no enforcement.** As with "do not bundle Docker" and "do not bundle an i18n
library", not having adopted it is itself the state; a change that overturns it appears in the diff as an added
dependency or file and comes with a revision of the ADR. Growing a machine to guard it leaves nothing for it to
catch. **A prohibition on behaviour inside an adopted mechanism** (do not use npm, do not import across
layers) is not a decision not to adopt, even though it is written in the negative.

### 172 decisions with work remaining

Lines that write the shape of a detection and state "there is no rule" (68 ADRs). This covers the
mechanizable side of "mechanizable" and "partly mechanizable" among the prose verdicts, and those remainders
of lines where a machine catches part whose shape can be written. It is the state of a road that no one has
walked, and searching the prohibitions in `docs/adr/` for "there is no rule" lists them. **Where to mechanize
and the shape are held by the line.** Copying them here makes double bookkeeping
([0144](adr/0144-decision-enforcement-pairing.md): the tally holds no decisions).

### 39 Placement Deviations

What the ADR does not state itself and a `rules.md` section header takes on. This departs from
[0144](adr/0144-decision-enforcement-pairing.md)'s requirement that enforcement be written in the same place
as the decision, but **writing it back would create double bookkeeping**, so it is not simply a matter of
fixing it either.

### Locations are scattered four ways

[0144](adr/0144-decision-enforcement-pairing.md) leaves the format to each document. As a result,
enforcement appears in one of the following forms.

| Form | Example |
| --- | --- |
| `Enforcement:` written directly in the body | [0074](adr/0074-runtime-communication-seam.md) (all 9 decisions; the only complete example that also writes, for prose, whether it can be mechanized), [0060](adr/0060-state-management.md), [0150](adr/0150-git-workflow.md) |
| An `## Enforcement` section | [0021](adr/0021-frontend-responsibility.md) |
| A table of how far machines reach | [0025](adr/0025-app-layer-elements.md) |
| "Machine enforcement is held by ~" in running text | [0154](adr/0154-claude-skills-operations.md), [0101](adr/0101-performance-budget.md) |

**They cannot be counted by matching spelling.** When recounting, read the body.

## Implementation Tasks (Issues)

50 issues. **13 have the enforcement field**, of which 3 include prose (#483 / #447 / #317).

### 37 lack the field

The field is a required item of the issue template, but the template's `required: true` binds only GitHub's
web form, and `gh issue create --body-file` passes straight through — **and that is the path by which AI
files issues.**

Whether the field is present does not correlate with when the issue was filed (#116 of 2026-07-30 has it, #521 of
2026-09-02 does not). It is missing not because the issue is old but **because of the path**.

It is closed in two ways.

- `.github/workflows/issue-field-lint.yaml` — when an issue is created / edited, it reads the body and
  comments on the issue about missing fields. It is not a PR gate because **a PR does not create issues**
- `make issue-field-lint` — checks the open implementation tasks in bulk. The entry point for sweeping those
  left open from the past

**Do not fill in the field on closed issues.** No one reads from them any more, and filling them in does not
change the implementation that already landed. Only open ones will be read from now on.

## Where machines are known not to reach

The element split of `app` differs, row by row, in how enforcement reaches it. The table is held by
[0025](adr/0025-app-layer-elements.md), and `APP_ELEMENTS` in `architecture.ts` enforces **the part that can be
written as a set of `import` targets**. Two things that cannot be written remain.

- `server config` and the public `NEXT_PUBLIC` constants live in the same `config` kernel
- The restriction on `observability` / `config` for `route-segment` is not "what may be imported" but
  "**how it may be used**"

Neither is a shortfall of implementation; they cannot be expressed by whether an import is allowed. **They are
covered by the per-layer architecture audit `arch-check`, and the shape of the judgment is held as rows in the
*Audit Criteria* of [`src/app/README.md`](../src/app/README.md) and
[`src/config/README.md`](../src/config/README.md).** The audit is not a deterministic check and does not
become a gate that returns green.

## What this list does not answer

- **Whether the stated enforcement is sound.** Only the presence of the field is checked. That "tests" is
  written but no test exists cannot be told here (on the [implementation rules](rules.md) side, the accuracy
  lens of `doc-reviewer` checks it)
- **Whether the judgment that something may stay prose is right.** It checks only as far as whether a reason is
  written
- **Whether a single rule can be named.** What can be pointed at goes only down to the section; a rule's
  summary is a quotation recopied on every generation, not an identifier
  ([0146](adr/0146-rule-reference-stability.md)). Only the section anchors keep their target, and their
  existence is checked by `scripts/doc-links.gate.test.ts`
- **Whether the ADR tally is current.** Unlike the rules, it is not generated. Where enforcement is stated is
  scattered four ways across documents and cannot be counted by exact match. **The counts in the ADR chapter
  above are values counted by hand at the point of 82 ADRs and do not include ADRs and lines added since.**
  The population (the number of prohibition lines) can be recounted, but the classification by location cannot
  be recounted without reading the bodies
