# Inventory of Sources and Their Interpretations

Of this repository's decisions, those **derived by reading an external source** are listed paired with the source.
[0010](../adr/0010-standards-and-non-lockin.md) decides "follow standards and do not get bound to a particular implementation",
but **there was no place that answered which decisions to reread when what was followed moves.** This is
that index.

## What this inventory does not answer

**It does not rule.** Even when a difference appears, whether to align with the source or whether this side's decision stays right is
not decided here. What it holds is only the observation that "they disagree"; **which side moves is decided by a person**
(*Where You May Stop* in [`AGENTS.md`](../../AGENTS.md)).

**Not being listed is not "No difference".** What is in this inventory is **only the pairs that were checked**. Other decisions
were derived by reading sources, and those are **unjudged**, not confirmed to match
([0157](../adr/0157-inspection-declaration-discipline.md)).

## The Three Verdict Values

| Value | Meaning |
| --- | --- |
| **No difference** | What the source says now and this side's interpretation agree |
| **Undeclared difference** | They disagree, and **this side has no decision that states the disagreement** |
| **Declared deviation** | They disagree, but **either a decision or an enforcement means states why it departs** |

Separating "Undeclared difference" from "Declared deviation" is the point of this inventory. **Departing is not itself the problem**
— the problem is departing without anyone knowing it departs.

**The declaration may sit where the reader runs into the constraint.** It need not be an ADR. If what rejects a shape that differs from the standard
is a lint, and the relationship is written in that configuration's comment, the person who would misunderstand reads it there — the person
who was rejected opens the configuration, not the ADR. **A decision is needed only when the way of departing itself has alternatives**
(route 1 in [`docs/README.md`](../README.md)).

## Always write the premise used for the verdict

The measure of a verdict easily becomes **the reader's memory**. Judging by "React should be saying this" means no one can refute it
even when it is wrong. So each row carries, in a traceable form, **the basis on which the source was read as saying so**.
A pair whose premise cannot be written is not put in this inventory.

## Inventory

| Source | This side's interpretation | Verdict | Source-side premise used for the verdict | Date checked |
| --- | --- | --- | --- | --- |
| Next.js's `"use client"` directive (bundled document `node_modules/next/dist/docs/01-app/04-glossary.md`) | "`"use client"` is not 'an instruction to do CSR'" in [`docs/design/rendering.md`](../design/rendering.md) | **No difference** | The document defines `"use client"` as "marks the boundary between server and client code ... should be included in the client bundle", and says a Client Component "can also be rendered on the server during initial page generation". The reading **a bundle boundary, not the place of rendering** takes the source's words as they are | 2026-09-09 |
| Core Web Vitals' "good" threshold (LCP 2.5 s) | The LCP ceiling in [0101](../adr/0101-performance-budget.md) | **Declared deviation** | 2.5 s is **the field (real-user measurement) definition**. 0101 states in its body that it does not put this as is onto the lab estimate, but derives it from "floor + run-to-run variance + the share allotted to the application". Field LCP is held separately by the RUM of [0082](../adr/0082-client-observability.md) | 2026-09-09 |
| TBT, which Lighthouse places as the lab substitute for INP | The TBT ceiling in [0101](../adr/0101-performance-budget.md) | **Declared deviation** | That TBT's 200 ms coincides with INP's "good" threshold is **a matter of Lighthouse's scoring conventions**; no standard set that value. 0101 states this explicitly and its body even carries a removal condition: re-place this row if the measurement means changes | 2026-09-09 |
| Conventional Commits 1.0.0 | The commit convention of [0150](../adr/0150-git-workflow.md) and [`commitlint.config.ts`](../../commitlint.config.ts) | **Declared deviation** | Conventional Commits defines types in lowercase and prescribes the form `type(scope)!: description`. This side adopts 11 capitalized types (`Feat` / `CI`, etc.) and Japanese subjects. **The declaration sits on the enforcement side** — a comment in `commitlint.config.ts` states the relationship, "the type names are the same as Conventional Commits but are not lowercased", and puts there the reason for not imposing `type-case`. The person who is rejected opens the configuration, so as a place it is the closer one. **It is not used to compute versions** — 0150 decides that a person chooses the version, and does not require the standard's machine readability | 2026-09-09 |

## Conditions Under Which the Inventory Moves

- **When the source moves.** A major dependency update (`tools-upgrade` / a Dependabot major) requires rereading the rows derived by
  reading that source
- **When this side's decision moves.** If an ADR revision changed the interpretation, one side of the pair has changed
- **When pairs increase.** If something new was decided by reading a source, add that pair

Re-entering verdicts is done by [`interpretation-audit`](../../.claude/skills/interpretation-audit/SKILL.md).
The shape of the rows (whether the interpretation's target exists, whether it carries a premise, whether the verdict is one of the three values) is
checked by `scripts/interpretations.gate.test.ts`.
