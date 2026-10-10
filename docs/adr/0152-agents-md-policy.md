# AGENTS.md Operating Policy

This project places a single `AGENTS.md` at the repository root as the **consolidated rules file** that AI coding agents (Claude Code / Codex / Copilot / Gemini, etc.) refer to. This ADR defines the position, structure, body language and update responsibilities of `AGENTS.md`.

## Status

Accepted

## Rationale / Purpose

- **Consolidate into one file** the surface of rules that multiple AI agents read in common, and set up each agent's configuration files (`.claude/` / `.cursor/` / `.gemini/` / `.github/copilot-instructions.md`, etc.) to refer to AGENTS.md
- Do not duplicate the bodies of settled ADRs in AGENTS.md (the primary source is under `docs/adr/`)
- Make explicit the interim operation for undecided areas (how far an agent may go on its own), so that work does not break down even where no ADR exists
- Keep an entry point from which "the agent rules to read first" can be traced

## File Placement and References

```text
.
├── AGENTS.md                          ← the rules body (subject of this ADR)
├── CLAUDE.md                          ← only the single line `@AGENTS.md` (read by Claude Code)
└── .github/copilot-instructions.md    ← auxiliary file that refers to AGENTS.md
```

- **Body**: `AGENTS.md` (one file at the repository root)
- **CLAUDE.md**: its content is the single line `@AGENTS.md`. It references the body symbolically through a Claude Code feature
- **Agent-specific configuration** (`.github/copilot-instructions.md` / `.cursor/` / `.gemini/`, etc.) is positioned as an auxiliary layer that refers to AGENTS.md, and holds no rules of its own

Copying rules into agent-specific configuration is not adopted. When the same rule is written in two places, only one of them goes stale, and the drifted side survives as "rules only that agent reads", becoming instructions that directly contradict the ADRs. In a shape that only refers, this kind of drift cannot occur structurally. A rule one is tempted to write into specific configuration goes into AGENTS.md or an ADR.

## Body Language

The body defaults to **English**.

The following, however, **stay in Japanese**:

- Commit-convention samples (to show that subjects are in Japanese)
- The PR confirmation message 「変更はローカルにコミット済みです。これらの変更をプルリクエストにプッシュしますか？」 (because the rule is that AI agents confirm with exactly this message)
- PR template section names (`概要` / `変更内容` / `動作確認方法`, to match the actual sections of `.github/pull_request_template.md`)

**A reference to another document's section name is quoted verbatim, the same as a file path.** The target heading is English, so the reference quotes the English heading as written — better, it is an anchored link (`docs/rules.md#<anchor>`), which the link check resolves. A reworded or translated section name makes the target impossible to look up.

The test is **whether the string is the requirement itself or an illustration of a requirement**. The requirement itself (the three above) stops being a requirement once translated, so it stays in Japanese. **Illustrations may be in English** — making visible output Japanese is already handled by `Language Rules`, and the language of an example does not decide it. Example triggers, examples of questions not to ask, and examples of acceptable answers all only show a shape, so they are written in English.

### Why the body is in English

The "AI-generated output is in Japanese" rule set in the `Language Rules` section applies to **artifacts the AI generates** (code / PRs / comments, etc.), not to **authoritative documents that humans edit**. AI agents' training data is predominantly English, and comprehension of the rules themselves is more stable in English.

### The Japanese mirror

As a consequence of writing it in English, **the humans who enforce these rules may be unable to read the original**. Rules that cannot be read cannot be
enforced, so a mirror is placed next to it at the repository root as `AGENTS.ja.md`. The canonical is `AGENTS.md`,
and that is the only one agents load.

- **It is placed as a sibling**, as every canonical's mirror is: all canonical documents are English, and each has its Japanese mirror beside it as `<name>.ja.md` ([0140](0140-documentation-operations.md))
- **The canonical leads.** Searching for knowledge, applying routing and rewriting are all done against `AGENTS.md`; the mirror is not fixed inline
- **`scripts/skill-lint` checks the heading structure of the pair 1:1**. A declaration alone cannot detect the mirror falling behind ([0144](0144-decision-enforcement-pairing.md)). Whether the translation says the same thing cannot be judged by a machine, so skill-lint itself names that as unchecked
- **`BEGIN-END` markers are not carried into the mirror**. They are the boundary of the range Next.js generates into `AGENTS.md` (see *BEGIN-END Markers* below), and nothing is generated into the mirror

## Structure (Section Layout)

It is composed in the following section order. Each section's responsibility is fixed.

| # | Section | Responsibility |
| --- | --- | --- |
| 1 | Preamble (no heading) | States the repository's role in a few lines and declares that **the rules are not restated here** and that #3's table says which document holds what. The details of the role are held by [`README.md`](../../README.md), with no copy here. It then places **the three constraints that apply to every task** (a deterministic check outranks judgment / architecture and policy keep a human gate / the application does not depend on AI) — each a premise that works across sections and cannot be stated inside any single one |
| 1.5 | Temporary Operating Rules until v1.0.0 | **A section limited to the period below v1.0.0**. Declares the temporary lifting of Protected Documentation / AI Modification Scope. The whole section is deleted when v1.0.0 is reached; the shape to return to and the steps are held by *Machine enforcement of Protected Documentation* below (paired with the part of [0140](0140-documentation-operations.md) that moves ADRs to immutable at v1.0.0. The switch happens in the same `release/v1.0.0` change in which 0140 moves ADRs to immutable) |
| 2 | Instruction Priority | Instruction priority (see below) |
| 3 | Canonical Documentation | The routing table "what you need → where to read". **It holds no list of ADRs** — the full set is held by [`docs/adr/README.md`](README.md) with a one-line summary each, and managing it in two places lets one of them go stale in silence. The same section also states that canonical documents are the suffix-less paths (`*.ja.md` is not read) |
| 4 | Task Execution Protocol | The steps taken before starting. **Read first the `README.md` that owns what you are about to touch**, look decisions up from the indexes, check existing implementations, move the contract before the generated artifacts, and **do not hand-rebuild an operation a skill owns** |
| 5 | Review Phase Protocol | The two subjects "review it" refers to (`impl-review` / `test-review`), and the responsibility to ask whether to run each with an estimate. Comments are not a subject, because `settle-comments` settles them at the end of the implementation. **Placed right after #4** — it is the "procedure after finishing" paired with the procedure before starting, and separating them cuts it off from the flow of work |
| 6 | Forbidden Shortcuts | The section declaring that it **does not enumerate prohibitions**. It states that what a machine decides is held by the gates and the rest by layer READMEs and `rules.md`, closing off the inference "what is not written here is not a rule" |
| 7 | Where You May Stop | The **closed list** of places where a decision may be handed back to the user, and the trip wires that stop work without requiring judgment. **The body of each stopping point is not placed inside AGENTS.md** — every row of the table points to a document outside AGENTS.md, and a row pointing inside would break how the list is closed |
| 8 | AI Modification Scope | Allowed / forbidden / agent configuration protection / the skill-execution Exception |
| 9 | Installing Things | The discipline that applies to every `install` surface (do not install on your own initiative / only when asked / check the existing setup first). Adding a dependency is a separate question held by [0004](0004-library-management.md) |
| 10 | Recommended Commands | Only the pnpm / make points that cannot be derived from `package.json` and `.makefiles/README.md`. **The discipline for using tools that only change context volume (`rtk` / `graphify`)** is held by the same section — costs and exclusions are in [`.claude/README.md`](../../.claude/README.md), but a discipline that applies every turn binds only if it is on the always-loaded side |
| 11 | Git Rules | Key points excerpted from 0150. **What a machine already blocks (force push / rebase / amend under `deny`) and procedures other documents hold are not restated** — what remains is only what prose alone can stop (the base-resolution trap, the confirmation message after amending) |
| 12 | Language Rules (+ `### Output Language` / `### Response Discipline` subsections) | **One section holds the rules about language.** Internal processing may be in English, visible output is in Japanese, and English when the user directs it — these three are three faces of the same rule, and splitting them into sections means writing the same thing three times. The response discipline (answer first / do not write facts you did not read / do not report deterministic checks through a filter) is held by the same section — both concern "what is written back", and in separate sections a state where only one was read becomes possible |
| 12.5 | Purity Sweep | **A boilerplate-only section**. States the rules of the purity pass that walks every file once (purity / distillation of design judgments / routing back to the owning document) and where the ledger and the lookup hook live. Its body is wrapped in `boilerplate-only:begin` / `end`. Its deletion is triggered by completion of the ledger, and what is removed together with that condition is held by [`.agents/README.md`](../../.agents/README.md) <!-- boilerplate-only:line --> |
| 13 | Protected Documentation | Declaration of files that must not be edited directly |

**A section is created on the test "would a reader who skipped this section perform a different operation?"** Different faces of the same rule are not made into sections; they sit inside one section. #12 is an example that failed this test: internal processing, output language and English direction had been split into separate sections.

**That a tool exists is no reason to write about that tool.** The former `Code Style` section listed the usage and prohibitions of **working mechanisms**, biome and ESLint, but the prohibitions were a verbatim copy of [0002](0002-formatter-linter.md), the run steps lived in `package.json` and [`README.md`](../../README.md), and "run it before committing" directly contradicted "Do not pre-run the gates" in `Recommended Commands`. **AGENTS.md not repeating what a machine fails** is also what #6 declares. Only one point was kept — the fact that "`lint:ci` can fail even when `pnpm lint` is green", which leads a reader who skips it to a different operation; its place is the pnpm item of #10.

Adding or reordering sections requires an ADR revision. Adding a row to #3's table (when a new index appears) is a minor edit and needs no ADR revision. **Adding an ADR does not move #3** — it is added to the list in [`docs/adr/README.md`](README.md).

**A decimal number is the marker of "a section that will eventually be deleted"**. It guarantees that deleting it does not shift the numbers of the permanent sections 1–13. The trigger for deletion differs per section, so it is written in the table above; on deletion, the whole section is removed along with its row in the table. Only sections explicitly listed in this table are allowed to be deleted.

<!-- boilerplate-only:begin -->
### Boilerplate-only statements

**Statements that mean something only to the distributing side of this template are collected into one document and removed whole.** The location is
[`docs/get-started/boilerplate-only-conventions.md`](../get-started/boilerplate-only-conventions.md),
and the strip (`make setup-remove-boilerplate-only`) deletes the whole file.

**They are collected because, when wrapping is scattered, what breaks is outside the wrapping.** In a shape that cuts out the middle of a section, what disappears is
a range and what breaks is the sentences on either side. Every touch near a marker adds a chance to
break something unnoticed. Collected into one file, **the documents that remain contain no such premise in the first place**, so there is nothing to fix after the cut.

**Only a pointer may be placed on the side that remains**, as a self-contained single line carrying `boilerplate-only:line`. Since the
whole line disappears, the surrounding sentences are not touched. **A shape that wraps a section's body and leaves it is not adopted.**

**In a document with a mirror, both sides hold the pointer line at the same position.** If only one side is stripped, in the copied
repository English and Japanese say different things.

The marker shape is identical to the `sample` family and has `boilerplate-only:begin` / `:end` / `:line` /
`:replace-begin` / `:replace-with` / `:replace-end`. The mechanism is shared by `scripts/setup/lib/markers.ts`.

**The families are separate because what triggers removal differs.** The sample is an optional purge chosen by whether one uses its subject matter, but
boilerplate-only statements lose their premise at the moment a repository is created from the template, so there is no choice — keeping them
means following rules that do not apply to oneself. In a single family, the side keeping the sample would keep both. The strip tool
itself also self-destructs, for this reason, independently of the purge tool.

**CI continuously verifies that the strip is not broken.** The strip is a one-time tool that removes itself,
so an unpaired marker or a stale ledger entry stays invisible to everyone until someone actually strips. The unit
tests next to the ledger do not execute the strip, so they cannot see the tree after stripping. CI therefore runs the strip in a throwaway checkout
and confirms on every PR that the remaining tree passes every gate (the job split is in
[0153](0153-ci-configuration.md)).
<!-- boilerplate-only:end -->

## Instruction Priority

AI agents follow instructions in the following priority. On conflict, the higher one wins.

1. **AGENTS.md** — this file
2. **`docs/adr/*.md`** — settled ADRs
3. **`.github/copilot-instructions.md`** and other agent-specific configuration
4. User instructions

**The tracker of undecided areas (the issue tracker) is not made a tier.** An issue is a unit that closes the moment it lands, and putting something that closes into a standing priority order leaves that tier always either empty or stale. What takes priority in an undecided area is the behavior "do not decide", which *Handling Undecided Areas* below places in `docs/rules.md`.

Enforcement: Prose. **not mechanizable** — conflicts between instructions are decided by meaning, and which instruction took effect does not show in the spelling.

## Handling Undecided Areas

AGENTS.md holds no list of decision areas not yet made into ADRs. The tracker is the issue tracker — **a unit that can be closed**. Copying the list into AGENTS.md or an ADR would create double management that goes stale the moment one item lands (the same reason [`docs/project/roadmap.md`](../project/roadmap.md) holds no work items). **AGENTS.md does not hold the behavior to follow when stepping into such an area.** "Do not bring in rules, patterns or libraries in an area that cannot be derived / declare an interim implementation before starting" is a rule enforced day to day, and its place is [`docs/rules.md`](../rules.md#workflow) ([0140](0140-documentation-operations.md)). AGENTS.md only points to it with one line from the stopping-point table of `Where You May Stop` — creating a section would make the list of stopping points point inside itself, and the meaning of a closed list would be lost.

Once an ADR is written, add it to the list in [`docs/adr/README.md`](README.md). AGENTS.md is not touched.

## BEGIN-END Markers

The body is wrapped in the following markers:

```markdown
<!-- BEGIN:nextjs-agent-rules -->
... AGENTS.md body ...
<!-- END:nextjs-agent-rules -->
```

This is the boundary of the range in which Next.js itself generates `AGENTS.md`, and also room to insert an externally generated block here in the future. Currently the whole body sits inside the markers, and generation is stopped by `agentRules: false` in [`next.config.ts`](../../next.config.ts) — if it ran, the wrapped contents would be replaced wholesale.

## Update Responsibilities

- AGENTS.md is listed in `Protected Documentation`, and AI agents do not edit it directly. They present a proposed change and edit only after user approval (**below v1.0.0 this per-change approval is lifted** — *Current form (below v1.0.0) and why* under *Machine enforcement of Protected Documentation* below / [0140](0140-documentation-operations.md))
- This ADR (0152) and AGENTS.md have a **structural correspondence**. When this ADR is revised, AGENTS.md is aligned in the same PR
- Adding an index to the `Canonical Documentation` table is treated as a minor edit

## Machine enforcement of Protected Documentation — the final form of edit permissions

The `Protected Documentation` declaration is prose, and a declaration alone is no guarantee ([0144](0144-decision-enforcement-pairing.md)). Machine enforcement is carried by `permissions` in Claude Code's `.claude/settings.json`. **`settings.json` is JSON and cannot carry annotations**, so what shape the values there are meant to have, and how the current shape differs from the final one, is held by this ADR.

### Final form (from v1.0.0)

`permissions.deny` holds the following 8 entries, and `permissions.ask` holds none of them.

| Entry | What it protects |
| --- | --- |
| `Edit(AGENTS.md)` / `Write(AGENTS.md)` | The rules body |
| `Edit(LICENSE)` / `Write(LICENSE)` | The license ([0142](0142-license.md)) |
| `Edit(.claude/settings.json)` / `Write(.claude/settings.json)` | The permission boundary itself. Do not leave a shape in which an agent can remove its own deny |
| `Edit(docs/adr/*-*.md)` / `Write(docs/adr/*-*.md)` | Accepted ADR bodies (immutable — [0140](0140-documentation-operations.md)). `*-*` applies only to numbered ADRs, not to `docs/adr/README.md` |

**Why `deny` rather than `ask`.** `ask` requests approval for every edit, and the protection is breached by the one time the approver lets it through without reading the content. What Protected Documentation protects is "a human reads the proposed change and judges it", so the path is limited to agent proposal → human edit, and the agent's edit itself is blocked. `deny` has no path that slips through on approval fatigue.

### Current form (below v1.0.0) and why

- The 6 entries for `AGENTS.md` / `LICENSE` / `.claude/settings.json` are placed in `permissions.ask`. Approval remains; there is no hard block
- Accepted ADR bodies carry no entry

Below v1.0.0, ADRs are living documents whose bodies are overwritten directly ([0140](0140-documentation-operations.md)). Most of the work in this period is rewriting ADR bodies itself, so putting ADRs under `ask` would make approval prompts constant and build the habit of approving without reading — the exact opposite of the reason for choosing `deny`. Not prompting is more correct as protection than prompting endlessly and being ignored. AGENTS.md / LICENSE / settings.json are edited rarely, and `ask` works as a chance to "read and judge", so they are kept.

### Restoration steps at v1.0.0

1. In `.claude/settings.json`, move the 6 entries above from `permissions.ask` to `permissions.deny`, and add `Edit(docs/adr/*-*.md)` / `Write(docs/adr/*-*.md)` to `permissions.deny`
2. Delete the `Temporary Operating Rules until v1.0.0` section of `AGENTS.md`, and remove the "lifted below v1.0.0" provisos attached to `AI Modification Scope` / `Protected Documentation`
3. From this ADR, remove the #1.5 row of the section-layout table, the below-v1.0.0 proviso in *Update Responsibilities*, and the *Current form* subsection above

This is done in the same change as the immutable switch of [0140](0140-documentation-operations.md). Switching only one side either blocks with `deny` documents that may be overwritten, or leaves immutable documents open to agents.

### Enforcement and what it does not reach

- **`permissions.deny` works only for Claude Code.** Codex / Copilot / Gemini have no equivalent declaration format, and there the prose of AGENTS.md is the only protection. Not mechanizable
- **A `deny` on `Edit` / `Write` does not reach rewrites through `Bash` (`sed` / heredoc).** Blocking them needs a `deny` that looks for the path inside Bash's arguments, but where the path appears in the arguments is not fixed, and it cannot be written as a prefix-match declaration. Not mechanizable
- **That `settings.json` matches this ADR's final form** can be written as a check that compares the table above with the JSON. Not implemented

## Prohibitions

- ❌ Adding a rules file equivalent to and parallel with AGENTS.md (CLAUDE-RULES.md / GENERAL-RULES.md, etc.) (the rules are the single AGENTS.md) (Enforcement: none — a decision not to adopt. That the rules file is the single AGENTS.md is itself a state, and placing a parallel file shows up in the diff as an addition)
- ❌ Transcribing / duplicating the body of a settled ADR into AGENTS.md (keep it to a summary table) (Enforcement: Prose — **not mechanizable**. A transcription can be reworded or condensed and need not match character for character, so the line between summary and transcription is decided by meaning)
- ❌ Changing the section order of AGENTS.md on one's own judgment (Enforcement: Prose — **mechanizable** (compare the order of AGENTS.md's `##` headings with the order of this ADR's section-layout table. No rule exists))
- ❌ Deleting the BEGIN-END markers (Enforcement: Prose — **mechanizable** (check that the pair `BEGIN:nextjs-agent-rules` / `END:nextjs-agent-rules` sits at the start and end of AGENTS.md. No rule exists))
- ❌ Writing rules that contradict AGENTS.md in agent-specific configuration (`.github/copilot-instructions.md`, etc.) (Enforcement: Prose — **not mechanizable**. Whether two rules contradict is decided by the meaning of the sentences)

## Notes

- The `@AGENTS.md` form of `CLAUDE.md` is a feature provided by Claude Code. Other agents read AGENTS.md directly
- When agent-specific configuration and AGENTS.md drift apart, AGENTS.md is the SSOT, and the specific configuration is reduced to a reference to AGENTS.md

## Related ADRs

- [0002-formatter-linter.md](0002-formatter-linter.md) — The split of duties between biome / ESLint and its prohibitions. **AGENTS.md holds no copy** (#10 holds only "the difference between `pnpm lint` and `lint:ci`")
- [0004-library-management.md](0004-library-management.md) — The pnpm exact-pin rule referred to by the `Recommended Commands` section
- [0140-documentation-operations.md](0140-documentation-operations.md) — The living / immutable switch for ADRs (done in the same change as restoring the edit permissions)
- [0142-license.md](0142-license.md) — `LICENSE` (one of the Protected Documentation)
- [0144-decision-enforcement-pairing.md](0144-decision-enforcement-pairing.md) — A declaration alone is no guarantee (why edit permissions are held with `deny`)
- [0150-git-workflow.md](0150-git-workflow.md) — The Git operating policy referred to by the `Git Rules` section
- [0151-git-hooks.md](0151-git-hooks.md) — The hook policy referred to by the `Recommended Commands` section
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) — The operations-skill policy referred to by the skill-execution Exception
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — The development-skill policy referred to by the skill-execution Exception
