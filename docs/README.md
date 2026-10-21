# Documentation

Holds **the routing that decides where design knowledge goes**. What each document holds is stated by
its own opening, so it is not restated here — an inventory of locations written here would go stale in
silence on the day a location is added.

## Classify before choosing a location

| Class | What it is | Destination |
| --- | --- | --- |
| **decision** | A judgment chosen from among options, whose outcome persists | [`adr/`](adr/) |
| **exclusion** | Something decided **not to do, on purpose** | [`adr/`](adr/) |
| **rule** | A constraint enforced day to day as a consequence of a decision | [`rules.md`](rules.md) (links to the ADR) |
| **inventory** | A list that drifts as it follows the code | A living reference. **Never put it in an ADR** |

**Keeping inventory out of ADRs** is why these four classes exist. When an immutable record and a
drifting inventory share one document, the inventory quietly rots while still wearing the face of a
"rationale". The **selection policy** for dependencies is a decision, but the **list** of dependencies is
an inventory, and the two cannot live in the same place.

## Routing — apply from the top; the first YES is the destination

1. **Would overturning this mean someone saying "we chose a different option"?**
   → [`adr/`](adr/). If you can write down the rejected options, it certainly belongs here. "Not doing
   it on purpose" is also an ADR — but it **carries, in the same body, the condition for reopening the
   question**. The condition is a change in premise (a tool gained the capability, a standard settled
   it), not a state (the count is 0, it is fast right now); a "won't do" whose condition cannot be
   written is a postponement ([0140](adr/0140-documentation-operations.md))
2. **Is it a criterion that answers which way to lean the next time something of the same kind comes
   along? Does it span several layers or components?**
   → [`design/`](design/README.md)
3. **Can it be stated mechanically as "doing this is a violation"?**
   → [`rules.md`](rules.md). Link to the governing ADR and write **what enforces it** (types / lint /
   gate / tests / prose) in the same place ([0144](adr/0144-decision-enforcement-pairing.md)). The
   rules for writing and reviewing tests are split into
   [`testing-conventions.md`](testing-conventions.md) for volume's sake, and the routing is the
   same
4. **Is it about responsibilities, prohibitions or owned state that close within one layer or
   feature?**
   → that layer's / feature's `README.md`
5. **Is it about what the business means? Can it be written in that domain's vocabulary?**
   → [`spec/`](spec/README.md)
6. **Is it a list that drifts as it follows the code?**
   → A living reference. Never into an ADR
7. **None of the above.**
   → **Leave it where it was (in the code)**

**There are two named misroutings** (forbidden by [`rules.md`](rules.md#comments), which points at this
routing). **Do not lift the concrete behavior of a library or API into an ADR** — that is a property
of the thing being called, not a choice, and it changes when the dependency is upgraded. Its home is
the call site, and it falls to route 7. **Do not put business knowledge into an ADR** — it can be
written in business vocabulary, so it falls to route 5, and its home is `spec/`.

### Vocabulary and touchpoints — routes 5 and 6 in detail

Only two things are not hit squarely by the routing above. Both are **indexes that hold no rationale**,
so they **only point**, without copying the routing.

- **[`spec/glossary.md`](spec/glossary.md)** — route 5 asks "can it be written in business vocabulary",
  but spec prose also uses **words from the screen side that are neither business nor implementation**
  (layout shell, outer frame, band, sidebar, loading UI). Those words already have homes scattered
  across documents, so the glossary holds only **which document defines each** and **the definitions
  of words that had no home anywhere**. Business words do not go in — the contract and the generated
  types are authoritative
- **[`design/context-map.md`](design/context-map.md)** — an inventory under route 6, but for each edge
  it holds **"who owns the boundary", a fact that cannot be read from the code**. Since it records what
  cannot be read, it is not an inventory that follows the code; it sits closer to route 2's "criterion
  spanning several subjects". The mechanism of each edge is held by the design document for that
  subject, and this file only points

## Two Tests

When the routing is unclear, these two tests usually settle it.

- **The jurisdiction test** — **if this were overturned, who would be obliged to update which
  document?** That is its home. Not "is this Why non-obvious" — non-obviousness only leads to an
  argument about quantity
- **The premise-location test** — **can this statement be made false without editing this
  declaration?** If not, it cannot rot unnoticed, so it stays in the code. If it can (upstream
  behavior, operating policy, business rules), nobody can verify it, and nothing goes off when it
  becomes false

Whether a procedural document (a layer README / `SKILL.md` /
[`.makefiles/README.md`](../.makefiles/README.md)) keeps a reason is settled by one more question —
**would a reader who skipped it perform a different operation?** If not, it is a reason, and the ADR
holds it alone. The procedural side holds only behavior and usage, and covers the reason with a back
reference `> Rationale: [NNNN](...)` ([0140](adr/0140-documentation-operations.md)).

## The default is "do not move it"

**Do not create a provisional location for something whose destination is not settled.** If it fits
no destination, that is evidence the code was the right place for it.

A wrong move is **harder to undo** than not moving. The destination document gets rewritten and only a
residue stays at the original place, so going back later because "it was fine where it was" means
fixing both.

## Point, do not copy

**Each statement has one home, and other documents point to it.** A stale index still surfaces as a
broken link, but a copy diverges in silence — the divergence is visible only to someone who read both,
and the writer cannot tell generalizing something apart from folding away the original place.

- **Once generalized, fold the original place into a one-line reference.** Keep only what is specific
  to that layer (the spelling format, constraints that apply only to that layer)
  ([`rules.md`](rules.md#comments))
- **Parent and child READMEs keep a boundary.** If a child has its own README, the parent limits that
  child to a one-line digest and a reference link and does not expand its contents recursively
  ([0140](adr/0140-documentation-operations.md))
- **Specifications only point to contracts, tokens, component vocabulary, rules and ADRs; they do not
  copy them** ([0143](adr/0143-spec-driven-development.md))
- **Reverse-lookup and procedure tables hold only "where to open".** The moment a criterion is copied
  into them, an old version survives twice ([`playbook.md`](playbook.md) and
  [`tutorial/`](tutorial/README.md) take this shape)

## Questions per Node

For the same subject, each node answers a different question.

| Node | Question | Temporal nature |
| --- | --- | --- |
| [`adr/`](adr/) | **What was decided, and what was rejected** | A record. Whether the body may be overwritten is held by [0140](adr/0140-documentation-operations.md) |
| [`design/`](design/README.md) | **How to judge the case in front of you** | **Grows.** Extended each time a criterion sharpens |
| [`rules.md`](rules.md) | **What counts as a violation** | Enforceable prohibitions only. Holds no rationale for judgments; links to the two above |
| [`tutorial/`](tutorial/README.md) | **How to actually write it** | One screen end to end. **Starts from the state after the sample is removed** |
| [`project/`](project/README.md) | **What this project is and is not** | Scope, non-goals, policy, versions, direction. Replaced first |
| [`reference/`](reference/README.md) | **What is in it right now** | **An inventory that follows the code.** Unlike an ADR, a reference expected to change |
| [`templates/`](templates/feature-readme.md) | **Which sections a repeatedly created document starts from** | Templates. `pnpm gen` places them; the template declares the required sections and the grading side reads them at runtime — the list of required sections exists only here |

**`design/` grows only when there is a judgment procedure that does not fit in one README.** A subject
that must rule every time on "where does this fetch go" needs a criterion, but a subject that ends with
"always go through this endpoint" leaves nothing to rule on and nothing to write. The latter is covered
by the decision (ADR) and the README of the layer that implements it.

## `spec/` and Layer / Feature `README.md`

| | [`spec/`](spec/README.md) | Layer / feature `README.md` |
| --- | --- | --- |
| **Vocabulary it is written in** | **Business and domain vocabulary** | **Vocabulary of implementation structure** |
| What it answers | What this business rule means. Which values fall in which range. Which transitions are allowed | What it owns, what it forbids, what state it holds, how it is tested |

**The entry condition is whether it can be written in that vocabulary, not granularity.** Something
that cannot be written in business vocabulary does not go into spec, however detailed. Conversely, when
business words start to grow inside a README, they are words that have left home, and the same word
gets redefined somewhere else.

## Places that are never a destination

**Do not move design knowledge into these.** Each, for its own reason, would not keep it even if it
received it.

**But "never a destination" and "need not be read" are different things.** Decisions are written in
the places listed here too, and precisely because they sit there without a destination they are
**targets for lifting out**. `get-started/` in particular is **where decisions not yet made into ADRs
live**. Do not confuse not choosing a place as a destination with not going to look there.

| Location | Why it does not receive knowledge |
| --- | --- |
| [`playbook.md`](playbook.md) | A reverse-lookup index and the work order for building a screen. Both hold only "where to open"; the criteria are held by what they point to. When a destination is added, only the index is updated |
| [`traceability.md`](traceability.md) | Aggregation. It declares so itself. The rule tally is generated from `rules.md`, and no hand-counted figures are placed there ([0146](adr/0146-rule-reference-stability.md)) |
| [`adr/BACKLOG.md`](adr/BACKLOG.md) | A progress board. Holds neither decisions nor reversal conditions; points to the bodies of the ADRs that hold them <!-- boilerplate-only:line --> |
| [`portal/`](portal/) | A generated view. The generator rewrites it. `*.md` directly under `docs/<dir>/` is discovered automatically by a scan, and where it appears is decided by `meta` in [`manifest.yaml`](portal/manifest.yaml) ([0141](adr/0141-portal-operations.md)) |
| `plan/` | Artifacts of the process. Not part of what is distributed <!-- boilerplate-only:line --> |
| `get-started/` | Procedures. Holds only ordering and the steps needing a human, and falls out of use once the premise of creating from the template is gone |
| [`screens.md`](spec/screens.md) | The sample's screen table. Not a document on the side that remains <!-- sample:line --> |

**The canonical is the English document on the suffix-less path; its Japanese mirror is the sibling
`<name>.ja.md`, a translation that follows it, not a separate location.** The suffix is the namespace:
agents never read a `*.ja.md`. Searching for knowledge, applying the routing and rewriting are all done
against the canonical, and the mirror follows it in the same change
([0140](adr/0140-documentation-operations.md)). Reading both means reading the same thing twice, and
writing both means one of them falls behind.

**Development history, migration history and "why we switched from X" go to `.github/release/`.**
Permanent documents do not carry history. What a permanent document answers is "what is true now", not
"how it came to be".

## Do not write general forms in disposable documents

A statement whose premise will eventually expire is **not marked in place; it is collected into one
document that is thrown away when the premise expires.** Cutting out the middle of prose leaves both
sides of the cut to be patched up, and every edit nearby adds another chance to break it.

**Put the general form in the document that remains, and link to it with a single self-contained
line.** Unless it is removable line by line, throwing it away breaks the side that remains.

Mark the side that disappears with a removal marker. **Default to `:line`, which drops the whole line,
and do not wrap table rows in block `begin` / `end` / `replace-*`** — a table ends at the first line
that is not a table row, and every line after it becomes a paragraph of raw pipes. Keep tables at one
row per entity, and give each disappearing entity its own row
([`rules.md`](rules.md#comments)).
After adding or removing a marker, re-take the line-count baseline ([`scripts/README.md`](../scripts/README.md) *Recount after adding a removal marker*). <!-- boilerplate-only:line -->

## Document shape — opening, ending, and how to point

This README can avoid restating each document's contents because every document has the same shape.

- **The opening states what it holds, what it does not hold, and the neighboring documents.** A single
  paragraph of the form "`adr/` holds X and `design/` holds Y, whereas this answers Z" lets a reader
  decide within the first few lines whether the open document is the home of their question. Documents
  derived from ADRs (`design/` / `project/` / `rules.md` / `testing-conventions.md`) state in their
  opening that **the ADR wins when they disagree** (*Instruction Priority* in
  [`AGENTS.md`](../AGENTS.md))
- **Collect references in a closing "Related" section.** Scattered through the prose, neither a reader
  nor a machine can tell that a spot is where references are received. On each line write **the target
  and what it holds** — a bare list of numbers does not show which one to open
- **Point to an ADR only by its number `[NNNN](path)`, without a section number.** When sections are
  added or reordered, a number points to a different section without changing its spelling. To say
  which section, do not copy the target's section name; **write a summary of the content you are
  using** ([0146](adr/0146-rule-reference-stability.md))
- **Point to a `rules.md` section by the `<a id>` anchor just before its heading.** A slug derived from
  the heading disappears when the heading is translated or reworded (same 0146)
- **Route issues / PRs in other repositories through `redirect.github.com`.** A plain link leaves a
  trace upstream that cannot be withdrawn
  ([0159-1](adr/0159-1-cross-repository-references.md))
- **Do not bake in section numbers of private documents (an issue's requirement `§30`, a plan's step
  number).** Readers cannot resolve them. Section references to public standards are fine
  ([`rules.md`](rules.md#comments))

That link targets exist (anchors included) is failed by
[`scripts/doc-links.gate.test.ts`](../scripts/doc-links.gate.test.ts), and a section number placed
right after an ADR link is failed by
[`scripts/adr-reference.gate.test.ts`](../scripts/adr-reference.gate.test.ts). **A section number away
from a link, and a copied section name, pass** — those are for the reader to catch.
