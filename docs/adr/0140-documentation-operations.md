# Documentation Operations Policy

Defines the documentation's **canonical language model (EN canonical / JA mirror) / the four-category ADR taxonomy / the position of `rules.md` / ADR immutability and the numbering lifecycle / per-package README operation / operational skills / sole ownership of rationale**.

## Status

Accepted

## Interim Operation until v1.0.0

> **(Delete this section at v1.0.0)**

While the version is below v1.0.0, the living operation of "Decision 4" below is in effect.

- **ADR bodies may be overwritten directly** — the per-change approval of Protected Documentation is lifted (this pairs with the AGENTS.md section "Temporary Operating Rules until v1.0.0"; the current and final form of the edit permissions is owned by [0152](0152-agents-md-policy.md))
- **Do not leave history or drift in the body** — do not write revision history or deliberation history such as "it was X at first, then revised to Y". Write only the **present form** of the decision. The history is owned by git
- Delete this section on reaching v1.0.0. The condition and steps of the switch are owned by Decision 4 and do not depend on this section

## Context

This repository's documentation is read both by Japanese readers and by AI agents and tools that operate on English frontmatter and English tool output. Without a single canonical, there is no answer to which one to fix to make it correct, and the two versions go stale separately.

Design knowledge contains four kinds of a different nature (decision / exclusion / rule / inventory). When an immutable record, a constraint enforced daily, and a drifting inventory live in the same document, the inventory rots while still looking like a "basis", and the constraint is buried in an ADR body where it never becomes a target of mechanical enforcement. The classification judgment is owned by [`docs/README.md`](../README.md); this ADR defines where each kind lives and how it is operated.

## Decision

### 1. Canonical Language Model: English Canonical, Japanese Sibling Mirror

- **Three tiers**: the English canonical + the Japanese mirror + the generated portal ([0141](0141-portal-operations.md)). The canonical is the **suffix-less path** and is written in English — `docs/**`, layer READMEs, root documents, and `.claude/**` alike. The Japanese mirror is the sibling `<name>.ja.md` in the same directory: what excludes it is the suffix, not a location, so there is no parallel tree. AI agents read the English canonical and never read `*.ja.md`, except `canonicalize-doc` reading the single pair it was pointed at (AGENTS.md owns that exception)
- **Every tracked suffix-less `.md` has an English canonical and a sibling mirror, except this closed list**:

  | No mirror | Paths | Reason |
  | --- | --- | --- |
  | Loaded as a whole directory | `.claude/agents/*.md` | Claude Code loads every `.md` in that directory as an agent definition, so a sibling `.ja.md` would be read as a duplicate or malformed definition. An agent definition holds only how it takes its input ([0155](0155-claude-skills-development.md)); its criteria live in `prompts/`, which has mirrors |
  | A one-line include | `CLAUDE.md` | Its whole content is `@AGENTS.md` ([0152](0152-agents-md-policy.md)) |
  | Japanese output itself | `.github/release/**`, `.github/pull_request_template.md`, `.github/settings/baseline-store/readme-template.md` | They are Japanese output under the AGENTS.md Output Language (release notes, PR bodies, a README generated into another repository), not documentation with a canonical to follow |
  | Deleted at the v1.0.0 cut | `docs/plan/**`, `docs/adr/BACKLOG.md` | Decision 4, step 4 |
  | Generated | `docs/portal/**`, files marked `linguist-generated` | A generator writes them from the canonical ([0141](0141-portal-operations.md)) |

- **The canonical never links to its mirror** — naming the mirror as plain text is fine. Reading both is reading the same thing twice, and the existence of mirrors is stated once, as the suffix convention, here and in [`docs/README.md`](../README.md). The mirror links back to the canonical
- **The mirror opens with the sync note on line 1 and carries no frontmatter.** The frontmatter is read and written on the canonical only, so a copy in the mirror would claim to be generated while nothing updates it. The note reads:

  ```markdown
  > **このファイルは [`<name>.md`](<name>.md) の日本語訳です。**
  > 直接編集しないでください。変更は英語の canonical な `<name>.md` を先に更新し、そのうえでこの日本語訳を同期してください。
  > エージェントが読むのは `<name>.md` だけです。このファイルは人間が読むための翻訳です。
  ```

  `SKILL.ja.md` and `AGENTS.ja.md` keep their own three-line note, whose third line says what is loaded as a skill or as the rules
- **Translation follows the canonical**: update the canonical first and the mirror in the same change; the canonical is always the authority. Searching for knowledge, applying a judgment, and rewriting are all done against the canonical, and the mirror is never fixed inline. Pairs are created and synced with the **`canonicalize-doc` skill**
- **Mirrors write web and general development terms in katakana or English, not kanji calques** (`インデックス`, not `索引`; `canonical` stays English). `canonicalize-doc` owns the term table
- **Comments in workflow definitions (`.github/workflows/**` and `.github/actions/**`) are written in English** (an exception to the Japanese rule). Workflows are **the part of a public repository most read from outside** — they get pasted into upstream bug reports, they are the first place someone changes, and they carry the hardening rationale an outside reader uses to judge (SHA pins / minimal permissions / fail-closed; [0153](0153-ci-configuration.md)). They also sit directly beside the output of tools that emit only English (`actionlint` / `shellcheck`). The rest of `.github/` (issue / PR templates, `settings/`, tool configuration) follows the Japanese rule — what is not a definition does not sit beside tool output
- This model is why "Documentation" is not in the AGENTS.md Language Rules list of Japanese output: the canonical is English, and the Japanese mirror is the translation that follows it

Enforcement: the structure of every existing pair is checked by skill-lint — heading-level parity with the canonical, the sync note on the mirror's first line, no frontmatter in the mirror. doc-links rejects a link from a canonical to a mirror (reason `mirror`). The existence of a mirror is checked only for `SKILL.md` and `AGENTS.md` (skill-lint); for every other canonical it is Prose — **not mechanizable** — an existence check passes an empty mirror, and whether a mirror says what its canonical says is a judgment of meaning.

### 2. ADR Taxonomy (Four Categories)

The meaning and judgment of the categories are owned by [`docs/README.md`](../README.md). This ADR defines where each lives and how it is labelled.

| Category | Location |
| --- | --- |
| **decision** | `docs/adr/` |
| **exclusion** | `docs/adr/` (state `Accepted (exclusion)` in Status, or `Accepted (partial exclusion)` when mixed with decisions. Examples: `Accepted (exclusion)` = [0121](0121-i18n-strategy.md) / [0130](0130-pwa-strategy.md), `Accepted (partial exclusion)` = [0082](0082-client-observability.md) / [0110](0110-security-operations.md) / [0131](0131-cookie-consent.md)) |
| **rule** | **`docs/rules.md`** (3 below) |
| **inventory** | Not put in ADRs. Its home is [`docs/reference/`](../reference/README.md) — an inventory that changes following the code; the code side is the source of truth, and rewrites happen in the same change as the target code. An inventory holds no rationale and only links to the ADR for the reason of a choice |

- An **exclusion** may be edited directly at setup to lay down one's own baseline (the supersede-by-new-ADR model applies only to changes after setup)
- **Do not decide twice, in a separate ADR, what follows naturally from an ADR's decision.** Tooling and reference need no ADR; only what is promoted to a convention becomes an ADR

#### An exclusion carries its reversal conditions in its own body

**When you decide "we do not do this", write the conditions for reopening the question in that ADR's body.** If only the decision is left, why it is not done gets written but **when to reconsider it** does not, and nobody can notice that the premise has changed. The decision's ADR owns the conditions, and they are not moved out to a separate ledger — if they were, the decision and the conditions would go stale separately, and the conditions would vanish without anything pointing at them.

- **What you write is a change in the premise itself, not a state.** The tool gaining that capability / that property disappearing / a standard defining it are changes in the premise. "The number of detections reached 0", "the current measurement is fast", and "the measured score is low" are none of them conditions — adopting them moves the decision while the premise has not changed. **Green is evidence that a rule is being kept, not a reason the mechanism is unnecessary**
- **When a condition holds, the decision is not withdrawn automatically.** At that point, reread the ADR and judge again. A condition is the starting point of a reconsideration, not its conclusion
- **A "we do not do this" whose conditions cannot be written is deferral, not judgment**
- **Do not put `wontfix` on an issue that was settled and led to a change.** A later reader would read it as "left without consideration". What owns whether a decision is still alive is the ADR body, not an issue label

Enforcement: Prose — **not mechanizable** — whether a written condition is a change in the premise or a state is decided only by the meaning of that decision.

### 3. `rules.md` = Where Rules Are Collected (Not Piled into AGENTS.md)

- The rule category (constraints enforced daily) is collected in **`docs/rules.md`**. AGENTS.md is the file that collects operating rules ([0152](0152-agents-md-policy.md)), not the place for rules, and piling rules into it is sure to bloat it
- Each rule carries a **`> Rationale: [ADR-NNNN](...)` back-reference link**, embodying the division of roles "ADR = why (the decision) / `rules.md` = the constraints enforced daily"

### 4. ADR Immutability and Numbering Lifecycle

- **Below v1.0.0 (pre-v1) = living document**: ADR bodies are overwritten directly and no revision history is kept (since it is pre-v1, discarding past text is allowed). This ADR declares this operation, and the Status of each ADR holds no copy of it
- **Immutable from v1.0.0**: after acceptance only the Status line is edited / supersede = add a new ADR and mark the old one superseded, not edit the body / **numbers are never reused**
- **Numbering uses topic-ordered block bands** (each decade = a subject block; `docs/adr/README.md`). Free numbers between bands are reserved for future insertion

**The condition of the switch is the v1.0.0 release itself**. It is done in the change that cuts `release/v1.0.0`, without staggering the timing per ADR — making only some immutable would mean holding, outside Status, which ADRs may be overwritten.

What to do at the switch:

1. Remove history, comparative deliberation, and reversals from every ADR body, leaving only the present form of the decision (applying the prohibition "do not write history" retroactively, including what crept in during the living period)
2. Delete this ADR's "Interim Operation until v1.0.0" section and the AGENTS.md section "Temporary Operating Rules until v1.0.0"
3. Add the Accepted ADR bodies (`Edit(docs/adr/*-*.md)` / `Write(docs/adr/*-*.md)`) to `permissions.deny` in `.claude/settings.json`. The final form of the edit permissions and the restoration steps are owned by [0152](0152-agents-md-policy.md), and are done in the same change
4. Delete `docs/plan/**` and `docs/adr/BACKLOG.md`, and in the same change remove the machine declarations that assume they exist (strip targets, check exclusions, the marker line-count baseline) — both are documents of the process that produced this state, not the state itself. What was decided is already in an ADR at that point, open tracking has moved to the issue tracker, and what remains is history git already holds <!-- boilerplate-only:line -->

From then on, the only change is supersede — file a new ADR and rewrite the old ADR's Status line to `Superseded by NNNN`.

Enforcement: 3 is Claude Code's `deny` (for what it does not reach, see [0152](0152-agents-md-policy.md)). That an immutable body does not move except on the Status line can be written as a CI check that limits the diff of `docs/adr/*-*.md` to the Status line — mechanizable but not implemented. Whether something in 1 is "history" is a judgment of a sentence's meaning and cannot be moved to a machine (review checks it)

### 5. Per-Package README Operation

- The **README (canonical) of each package / layer is the source of truth**, and is what audits and implementation read at run time (connects to [0021](0021-frontend-responsibility.md)'s rule that each layer's README is the operated source)
- READMEs also follow the canonical language model (1 above): the README is the English canonical, and its Japanese mirror is the sibling `README.ja.md`
- **READMEs hold a parent-child boundary.** When a child directory has its own README, the parent keeps that child to a one-line digest and a reference link, and does not expand its contents recursively. Expanding makes the same content live in two places, and one falls behind
- **Do not gate on a README's listing of actual files.** A check that parses the file names a README lists and reconciles them against what exists only constrains how READMEs are written and does not prevent rot. Structural drift is left to the judgment of `sync-readme` (6 below)

### 6. Operational Skills

- **canonicalize-doc** (EN/JA pair generation and sync) / **sync-readme** (structural drift detection and alignment) / **readme-review** (manual-worthiness judgment of content) are assigned to the operation of translation, structural drift, and content review respectively (development skills sanctioned by [0155](0155-claude-skills-development.md); the placement, naming, and frontmatter conventions are shared with [0154](0154-claude-skills-operations.md))

### 7. Sole Ownership of Rationale — Procedural Documents Only Back-Reference

- **The ADR alone owns the reason for a judgment.** `.makefiles/README.md` / `.claude/skills/*/SKILL.md` / layer READMEs write only **what happens (behavior) and how to use it (procedure)**, and settle why it was chosen with a `> Rationale: [NNNN](...)` back-reference (the same form as `rules.md` in 3 above)
- **A SKILL is assumed to be read on its own, but what it makes self-contained is the procedure, not the reasoning.** The facts an agent needs to change its operation (it fails closed / it does not write the lockfile / an approval covers one run) go in the SKILL, and **the argument for choosing that behavior does not**. Reading a reason does not change the operation, and it stays behind, not followed, when the ADR is fixed
- The judgment rests on one question: "**would a reader who did not read it operate differently?**" If not, it is a reason, and its place is the ADR

## Prohibitions

- ❌ Writing a decision / exclusion in `rules.md`, or a rule in an ADR body (confusing the taxonomy)
- ❌ Piling a revision history table onto a pre-v1 ADR (living document; overwrite directly)
- ❌ Treating ADRs as immutable before v1 and forcing supersede-by-new-ADR (pre-v1 is living) (Enforcement: Prose — **not mechanizable**. Whether ADRs are treated as immutable is an operational judgment and does not show in the shape of the files)
- ❌ Writing the history of a revision, comparative deliberation, or the dates of reversals in a document body (write only the present form of the decision; the history is owned by git)
- ❌ Making `*.ja.md` (the Japanese mirror) the canonical source an AI agent reads (agents read the English canonical) (Enforcement: Prose — **partly mechanizable**. Claude Code's reading could be blocked by putting `Read(**/*.ja.md)` in `permissions.deny` of `.claude/settings.json`, but there is no rule. Reconciling it with the reading done by the skill that syncs translations, and the sources other agents read, cannot be constrained by a machine)
- ❌ Piling rules into AGENTS.md (rules go to `rules.md`)
- ❌ Writing the same reasoning in both an ADR and a procedural document (README / SKILL) (7 above; the procedural side holds only the back-reference)
- ❌ Placing a gate that reconciles a README's file listing against what exists (5 above) (Enforcement: none — a decision not to adopt. No gate reconciling README file listings is in place, and a change adding one would show in the diff as a new gate)

## Notes

- This ADR is the parent decision of [0141](0141-portal-operations.md) (portal operations), and stands upstream of the three-tier strategy of canonical → generated portal

## Related ADRs

- [0152-agents-md-policy.md](0152-agents-md-policy.md) — AGENTS.md composition policy (the file that collects operating rules; the place for rules is split off into `rules.md`)
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — Claude skill operations, development skills (sanctions canonicalize-doc / readme-review / sync-readme / portal-manifest-sync; placement, naming, and frontmatter shared with [0154-claude-skills-operations.md](0154-claude-skills-operations.md))
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — per-layer README operation (per-package README = source of truth)
- [0141-portal-operations.md](0141-portal-operations.md) — the generated portal (the third tier of this ADR's three-tier strategy)
- [0121-i18n-strategy.md](0121-i18n-strategy.md) / [0130-pwa-strategy.md](0130-pwa-strategy.md) — examples of exclusion ADRs (`Accepted (exclusion)`)
- [0082-client-observability.md](0082-client-observability.md) / [0110-security-operations.md](0110-security-operations.md) — examples of partial-exclusion ADRs (`Accepted (partial exclusion)`)
- [`docs/README.md`](../README.md) — the judgment and destinations of the four categories
- [`docs/reference/README.md`](../reference/README.md) — the home of inventory (the contract of an inventory that follows the code)
