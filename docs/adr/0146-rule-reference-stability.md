# Rule References and Generated Tallies

Defines the discipline by which **the referring side** does not lose what it points at. It covers the rules in [`docs/rules.md`](../rules.md) and ADR decisions, and every document that points at them — design documents, screen specs, ADRs referring to one another, and [`docs/traceability.md`](../traceability.md), which is a tally.

[0144](0144-decision-enforcement-pairing.md) defines not separating a decision from its enforcement, and **left the format of writing to each document**. What this ADR defines is a separate problem next to it, namely **how to point at a decision**. It is not a revision of 0144.

## Status

Accepted

## Rationale / Purpose

- **A reference dies silently when its target is rewritten.** When the rules table was reorganized into a section structure, the 10 items pointing at it lost their targets at once. If it breaks as a link, a machine notices, but when it points by "section name + a quote of the wording", **only the shape survives and it points at something else**
- **A hand-counted number cannot be verified later.** The "63 rules" the tally stated cannot be reproduced as to what granularity made it 63. Recounting drifted to 8 and 13 because of spelling variations. **A hand-counted number has no basis for the next reader**
- **A tally that cannot be re-pointed makes the same work be done twice.** Without a way to reconcile the previous tally against the current documents, the next person counts from scratch

## Point to rules by section anchor

**Each section of `rules.md` has an explicit anchor, and the referring side links to that anchor.** Place `<a id="…"></a>` just before the heading.

- **The anchor's spelling is a fixed English word and is not derived from the heading's wording.** A fixed anchor keeps a reference stable across rewording and translation: the English canonical and its Japanese mirror ([0140](0140-documentation-operations.md)) carry the same `<a id>` under headings in different languages, and a heading can be reworded without moving it. A spelling derived from the heading vanishes in both cases — the slug GitHub generates automatically from a heading has exactly that shape
- **Once an anchor is set it does not change.** When splitting a section, keep the disappearing side's anchor on one of them; if it cannot be kept, re-point the referring side in the same change
- **The granularity of pointing is the section.** No identifier naming a single rule is given (see *What this discipline does not answer*)

## Point to ADRs by number only

**The only form for pointing at an ADR is `[NNNN](path)`, with no section number added.** Both `§2` and `Decision 4` move when sections are added, reordered, or folded. If it breaks as a link, the check notices, but **a number keeps its shape, so nothing notices** — it points at a different section without its spelling changing.

- **Which section is meant, the referring side shows by writing a summary.** Do not copy the other side's section name; write **the content you are using**. It points at the same thing whether translated or reworded because the summary is your own sentence
- **No anchors are set because the role differs from `rules.md`.** There, every rule gathers into one document, so without being able to name a section the granularity is lost. An ADR is one decision per file, and pointing at the file gives enough granularity
- **Section references to public standards are out of scope** ([`docs/rules.md`](../rules.md#comments)). The section numbers of an RFC or a specification cannot be moved by us, but in exchange the other side does not move them

## Generate the tally

**The rules tally in `traceability.md` is written out by a machine from `rules.md`.** No hand-counted numbers and no hand-written tables are placed there.

- **It is a consequence of 0144's point that a tally holds no decisions.** What holds no decisions can be derived from the decisions' side, so derive it
- **A generated table does not go stale.** Nor does a person need to notice it going stale — the gate fails as soon as regeneration produces a diff
- **The generation's scope is confined to `rules.md`.** The ADR tally cannot take the same form (see *What this discipline does not answer*)

### Generation works because verdicts use a closed vocabulary

The verdict each rule in `rules.md` holds on "can it be moved to a machine" is fixed by [0144](0144-decision-enforcement-pairing.md), in what it requires a prose enforcement to state, as the three words **not mechanizable / partly mechanizable / mechanizable**. **Do not create anything outside these three words.**

Adding spellings makes them uncountable by matching, reading the body becomes necessary to count, and that is where misses come in. In practice they scattered into six forms and the tally missed 5. **The vocabulary being closed is the only reason the tally can be a machine.**

## Enforcement

| What | What fails it |
| --- | --- |
| Anchor existence (does the target exist) | `scripts/doc-links.gate.test.ts` — the existing gate that resolves `#anchor` |
| Anchor coverage (does every section have an anchor) | `pnpm docs:tally` — fails without emitting counts if any section lacks an anchor |
| Verdict vocabulary (nothing outside the three words) | Same as above — an unknown spelling fails without being counted |
| Unreadable rules (the summary does not close / the verdict is outside a rule / an anchor does not correspond to a section) | Same as above — **do not silently degrade to 0** ([0157](0157-inspection-declaration-discipline.md)) |
| The tally going stale | `scripts/rules-tally.gate.test.ts` — red if regeneration produces a diff |

## What this discipline does not answer

- **A means of naming a single rule.** Pointing reaches only the section. To point at one rule from prose, link to the section anchor and quote the rule's summary. **A quote is not an identifier**, so rewording breaks the match — this is adopted knowing that (see *Rejected Alternatives*)
- **A tally of ADR decisions.** Where enforcement lives is scattered four ways across documents (a result of 0144 leaving the format to them), and the spelling is not closed. It cannot be counted by a machine, so the ADR chapter of `traceability.md` stays hand-written
- **A section number written away from the link.** The check sees only the shape adjacent to a link, and a spelling with words in between, such as "section 8 of 0079", passes. What is closed is the position **right after the link**, not the word "number" itself
- **Whether the target an anchor points at is appropriate.** Only the anchor's existence is checked. Pointing at the wrong section does not fail

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Pointing by a heading slug** | It vanishes on both translation and rewording. The slug of an English heading does not exist in the Japanese mirror, and rewording the heading breaks every reference to it at once |
| **Assigning permanent ids to every rule** | There are 250 rules, and 21 are pointed at. Numbering and maintaining 229 becomes work for identifiers nobody uses. Splitting a section and adding anchors once the need to point at one rule recurs is cheaper |
| **Keeping the tally hand-written** | The counts cannot be verified. An unverifiable number makes the next person redo the same tally |
| **Placing anchors as HTML comments** | A person cannot follow them as links. An identifier only a machine can read means holding a separate path for people to follow, which is double management |
| **Revising 0144 to fold this in** | What 0144 defines is the relation between a decision and its enforcement; what this ADR defines is how to point at a decision. 0144's judgment to leave the format to documents is still correct, and there is no reason to overturn it |

## Prohibitions

- ❌ Pointing at a section of `rules.md` by a slug derived from a heading (Enforcement: Prose — **mechanizable** (check that the fragment of a link pointing at `docs/rules.md#…` is in the set of explicit `<a id>`s, not a heading slug. There is no rule))
- ❌ Writing the `rules.md` tally by hand. Placing hand-counted numbers in a document
- ❌ Creating a verdict spelling outside 0144's three words
- ❌ Changing an anchor's spelling. If you change it, re-point every referring side in the same change
- ❌ Adding a section without giving it an anchor

## Related ADRs

- [0140-documentation-operations.md](0140-documentation-operations.md) — the four document categories and the canonical language model (an English canonical and a Japanese mirror carry headings in different languages, which is why anchors are independent of language)
- [0144-decision-enforcement-pairing.md](0144-decision-enforcement-pairing.md) — pairing decisions with enforcement, the three verdict words, and that a tally holds no decisions
- [0157-inspection-declaration-discipline.md](0157-inspection-declaration-discipline.md) — not collapsing a check that cannot hold into "no violations" (why generation has conditions under which it fails)
- [0159-script-structure.md](0159-script-structure.md) — helper script structure (how `rules-tally` is placed)
