# Claude Skills Operating Policy (Development)

This project places the **development flows** that accompany generating, editing and reviewing code / documentation as Claude Code **skills** under `.claude/skills/`. This ADR defines the placement, naming, structure, subagent pattern and coverage of development skills.

Operations skills (commit / PR / release / dependency audits, etc.) are handled separately in [0154-claude-skills-operations.md](0154-claude-skills-operations.md).

## Status

Accepted

## Rationale / Purpose

- Turn the **recurring work** of documentation sync / configuration editing / code review into skills, so that humans and AI agents can reproduce it with the same procedure
- Structure work that needs multi-layer review (adversarial review, etc.) with the **subagent pattern**, avoiding the bias of a single agent
- Name the repository structures skills rely on (the config kernel, etc.), and set the boundary at which a skill reads them at runtime rather than holding them as fixed values

## Scope (Definition of Development Skills)

"Development" = skills whose main purpose is **generating, editing and reviewing code / documentation / configuration**.

Concretely:

- Documentation sync (managing canonical EN / translated JA pairs / aligning READMEs with reality)
- Documentation evaluation (whether a README is portal-worthy, etc.)
- Configuration editing (adding an environment variable end to end, etc.)
- Code review (adversarial / multi-perspective)

Operations (Git operations / release / dependency audits) are handled in 0154.

## Placement, Naming and frontmatter

The conventions for placement, naming and frontmatter are **shared with 0154** (see [0154-claude-skills-operations.md](0154-claude-skills-operations.md)).

Summary:

- Placement: `.claude/skills/<slug>/SKILL.md` (canonical, English) + `SKILL.ja.md` (translation, for reference)
- Naming: kebab-case, verb-based
- frontmatter: `name` / `description` / `usage-class` / `argument-hint` (optional) / `allowed-tools` (optional)
- Body structure: When to Use / Do NOT use / numbered Step procedure / verification

## Coverage (Existing Skills)

| Slug | Role | Coverage |
| --- | --- | --- |
| `canonicalize-doc` | EN / JA pair sync | Syncing / newly creating a canonical English document and its Japanese translation |
| `sync-readme` | README ↔ disk sync | Updates the contents of a single README to match the actual directory state. Child directories' READMEs get only a digest + reference link |
| `readme-review` | Evaluating a README's portal value | Grades a single README against the registration criteria of `docs/portal/manifest.yaml` |
| `portal-manifest-sync` | Auditing the portal manifest | Checks `docs/portal/manifest.yaml` against both the READMEs that exist and the two generator scripts (`pnpm portal:guides` / `portal:docs`). Reads, without reimplementing, the stale entries and structural warnings the generators already decide, and handles the "registrations that fall to `Other`" the generators silently swallow, the exclusion of component-reference READMEs, and the classification of the remaining curation candidates. Holds no criteria of its own and reads `readme-review` at runtime. Writes only `manifest.yaml`, and does no automatic addition that treats unregistered READMEs as drift (the one exception is the unregistered mirror of a registered canonical) |
| `new-env` | Adding an environment variable end to end | Syncs the purpose-specific config modules / env files / the variable-table docs in one go (the target structure is [0030](0030-environment-variable-management.md); see below) |
| `impl-review` | adversarial code review | Multi-stage verification by a subagent fanout over 5 lenses (correctness / security / architecture / cohesion / runtime-gap) + verifier. `cohesion` is the within-unit lens that looks at "one unit having several reasons to change", and does not overlap with `architecture`, which holds cross-kernel placement. When the diff touches `src/model/**` or a type declaration, `type-design-reviewer` is added as a finder separate from the lenses, and only its `懸念` go to the verifier (its grading is reported as returned). Exhaustive auditing of layer rules is held by `arch-check`. The subject is only the change itself; it does not write to source and posts findings inline to the PR |
| `scaffold-test` | Creating new tests (unit / component) | For a **set** of subjects without tests, derives cases from each subject's own branches and writes `<subject>.test.ts(x)`. Its unit is placing one screen's worth at once, and it takes confirmation per directory that declares `test-requirement`. Bakes in no rules and reads [0090](0090-testing-strategy.md) / [0091](0091-test-verification-methods.md) / the nearest README's `test-requirement` / the 1:1 gate itself at runtime. Responsibility follows the symbol, not the directory, and anything crossing the HTTP boundary is left to `scaffold-integration-test`. Subjects are read-only, and branches that cannot be verified are reported as findings rather than skipped. **Before writing**, the enumeration of perspectives is sent per group to the read-only `test-perspective-enumerator`. The model writing tests decides "what to check" at the same time as "how to assert it", so **the cases that line up are the ones whose assertions are easy to write**. Splitting does not make the list complete, but it means **the perspectives that did not become cases are passed over out loud**, so what was dropped is visible. The `## テスト観点` of the nearest `test-requirement` README are perspectives a human wrote, and even if they look unimplemented they are handed to a human rather than dropped (whether the README or the code is wrong is not this skill's judgment) |
| `scaffold-integration-test` | Writing integration tests at the HTTP boundary | Writes tests that drive `adapters` clients and Route Handlers with MSW handlers generated from the contract. Keeps [0090](0090-testing-strategy.md)'s "integration = HTTP boundary only / the inside is mocked / assert shape and type", and forbids hand-written handlers and `fetch` stubs |
| `settle-comments` | Settling the comments a change earned | The implementation writes no comments, so the comments of the declarations it touched are decided with 7 verdicts: 維持 / 削除 / **不要** / 書換 / **移設** / 集約 / **著述**. 移設 moves the rationale to an ADR or a layer README, leaving in the code the residue that still takes effect and a one-line reference. 著述 writes the required TSDoc frame (the summary and the required tags; the scope is held by `docs/rules.md`) that a named function lacks, even under `--bulk`. These are verdicts a read-only reviewer cannot give (the destination document has to be written), and the object of judgment is the existing contents, not the diff. In addition, a per-file pass picks up **集約** (duplication / dispersion / excess volume). Judging jurisdiction one by one lets each copy pass on its own, so this is the only verdict whose subject is a set of comments. Application has 3 modes — confirm then apply / auto-apply (`--apply`) / report only (`--report-only`) — and auto-apply does not apply a 移設 that involves writing a document, and applies 集約 only at high confidence |
| `test-review` | Quality review of tests | Fanout over 5 lenses (structural conformance / perspective coverage / semantic quality / branch × meaning / symbol coverage) + verifier. Bakes in no rules and reads [0090](0090-testing-strategy.md) / [0091](0091-test-verification-methods.md) and the kernel README's `test-requirement` at runtime. Reporting is read-only, but holes in semantic coverage alone are filled after one confirmation (Step 5) |
| `full-verify` | Verifying the whole repository | Verifies the soundness of the architecture (Pass 1) + all implementation (Pass 2), and generates findings as Markdown in `tmp/reviews/` (architecture.md / mod_*.md /_index.md). Read-only (no code changes) |
| `full-apply` | Applying full-verify findings | Applies fixes for the findings in `tmp/reviews/` in severity order (Critical → Low). Findings that need a design decision are deferred with a reason, and it verifies with `pnpm fix` / lint / build before committing. The counterpart of `full-verify` |
| `scaffold-model` | Placing into the model kernel | Places one display type into `model`, which has no kind in `pnpm gen`. First decides whether it belongs there by the acceptance criteria of `src/model/README.md` (a type used by only one feature, a copy of the contract, or decision logic stops it), and writes only after confirming a plan answering each row of `## 監査の観点`. Reads the type discipline of [0029](0029-type-design-discipline.md) at runtime. The type written is graded by the read-only `type-design-reviewer`, and only what is approved is applied. Run alone, it runs `scaffold-test` and `settle-comments`; from `scaffold-slice`, it leaves them to it |
| `scaffold-adapter` | Scaffolding a fetch endpoint | Given a fetched contract and matching generated artifacts, places it with `pnpm gen adapter` and then fills in the stubs. Derives the classification, connection point, `allowAnonymous`, lifetime and taint, with sources, from `src/adapters/README.md` and the contract's `security`, and stops and hands off what cannot be derived. Does not edit the contract or the generated artifacts ([0072](0072-api-type-generation.md)). Always chains `scaffold-integration-test` |
| `scaffold-route` | Scaffolding an `app` entry point | Places one non-screen `app` element — a thin-proxy Route Handler, or an `app`-side Server Action asserting the actor. First decides whether it is needed and where it lives from [0025](0025-app-layer-elements.md) and `src/app/README.md` / `src/app/api/README.md`, and stops if not needed. Route segments are left to `new-feature`, and actions needing no assertion stay in the feature. Chains `scaffold-integration-test` for a Route Handler |
| `scaffold-slice` | The contract-first slice flow | Chains contract → `scaffold-model` → `scaffold-adapter` → `pnpm gen feature` → `scaffold-route` → `scaffold-test` → `settle-comments` in dependency order, and makes `arch-check`'s changed-file shape the report-only exit check. Writes no source itself, halts at the first stage that stops, and does not roll back. The rules are read at runtime by each child from the kernel README's `## 監査の観点`. A screen's look, stories, specification and screen tests are left to `new-feature`, and the two meet at `pnpm gen feature`. The specification is not an input ([0143](0143-spec-driven-development.md)). Does not call the two reviews |
| `new-feature` | The end-to-end flow for one screen | Takes a screen through "direction → story → review → separation → specification → tests" in order. Bakes in no rules, including the order itself, and reads [`docs/playbook.md`](../playbook.md) / [`docs/templates/feature-readme.md`](../templates/feature-readme.md) / [`docs/spec/README.md`](../spec/README.md) / the kernel READMEs at runtime. Placement, naming and boundaries are left to `pnpm gen`, and `docs/spec/**` is **an input to read, not an input to generate from**. Writes no tests until the story review comes back. The two reviews (`impl-review` / `test-review`) follow the Review Phase Protocol of `AGENTS.md` and are **handed to the user without being called**. `settle-comments` is not a review accompanied by an estimate but a stage that runs unconditionally at the end of implementation, so it is not treated the same. Does not commit / push |
| `impl-issue` | The backbone from issue → merged PR | Takes an issue number and goes through securing the environment → plan → implementation → reconciliation → review → PR → harvesting → merge → handover → close. **It holds no implementation judgment at all** — commits go to `commit`, push and PR to `submit-pr`, taking in the base and conflicts to `resolve-merge`, one screen to `new-feature`; the two reviews are asked of the user with estimates per the Review Phase Protocol of `AGENTS.md`, and `settle-comments` runs without asking. What it holds is progress, reconciling the approved plan with the actual result, and the **mechanical detection** of moments that need human judgment. **Its stopping points are closed at 5**, and every other judgment is appended, on the spot, to an untracked run record, so that Step 9's handover is not missing anything even if the context is summarized. There are 6 modes (scope / review / issue / flow / derive / plan). **scope is asked first** — where it ends (merge / up to the PR / up to a local commit) bounds every other mode, and a run that ends early does not reach the stages other modes govern; what that ending leaves undone (especially harvesting and runtime verification) is named in the report. `derive` is a delegation allowing the questions that remain after reading the ADRs, `docs/rules.md` and the layer READMEs to be decided **from de-facto standards**; preferences are not delegated. Gates are not pre-run but left to the hooks and CI, and that they were left is written in the PR. Runtime verification is run only when a request-time seam moved, and it states when it did not run it |
| `back-prop` | Detecting drift between declaration and reality | Detects drift between what READMEs / skills / the glossary state and what the tree actually does, in 4 kinds (A README→code / B code→README undocumented pattern (3 or more occurrences) / C skill↔README duplication / E business vocabulary leaving home). Launches the integrator + read-only `drift-detector` per kernel in parallel in one message, and approval and writing are done by the integrator in a single thread. The detection criteria have `skills/back-prop/prompts/detect-drift.md` as their SSOT, which both the skill body and the agent definition read without rewriting. It writes only layer READMEs. Changes to skill bodies go to `manage-skill`, and E2 (leakage into ADRs / `docs/rules.md`) is report-only. It does not intersect with `sync-readme` (structural drift) |
| `arch-check` | Exhaustive audit of layer rules | Checks the `## 監査の観点` table of each kernel's README against the code, reporting as `violation` / `suggestion`. The table holds one row per `forbidden` tag plus principles that the import set cannot express, and neither the skill body nor the agent definition copies the rules; they read them at runtime (the criteria have `skills/arch-check/prompts/audit-layer.md` as their SSOT). Launches the integrator + read-only `arch-auditor` per kernel in parallel in one message. The static verdict (the PR's Lint result, or one narrowed local run) is decided once by the integrator and passed to every auditor, and rows a machine checks are not re-judged. Gaps in a table are counted as findings against the README, separately from violations in the code. For `src/model`, `type-design-reviewer` rides along only in full scope (in a diff, it arrives from `impl-review`). Fully report-only, and writes only `tmp/arch-check/`. It separates its question from `full-verify` Pass 1 (soundness of the design) and from `impl-review`'s architecture lens (the meaning of the diff) |
| `glossary` | Maintaining the glossary | Maintains `docs/spec/glossary.md`. Extracts the inventory deterministically and presents, kept apart, the 4 kinds a machine settles (new term / orphan / unresolved reference / double definition). **It does not choose the canonical name and does not declare two words synonymous** — the former is a judgment about how the team speaks, and the latter leaves no mechanical trace. It does not offer "rewrite the row to match usage" as an option (the table would turn into an index of the prose, and the document could no longer be said to be wrong). It writes only the glossary and does not touch the documents it points to |
| `context-map` | Maintaining the map of touchpoints | Maintains `docs/design/context-map.md`. Enumerates edges from `src/config/` / `src/adapters/` / `src/app/api/**` / metadata / `src/proxy.ts`, and records 2 axes per edge. **Whether there is translation is decided mechanically by `architecture.ts`; ownership of the boundary does not come out of the code** (whether one can negotiate with the counterpart is an organizational fact). Ownership is presented as candidates with evidence for a human to choose, and it does not write the label on its own authority. Mechanisms are held by the design document for each subject, and the map only points |
| `context-map-audit` | Reconciling the map with reality | **Fully read-only.** Reports 3 kinds of divergence (a touchpoint with no edge / an edge whose counterpart is gone / a recorded translation that disagrees with the dependency table) and does not edit — a divergence can be read either as "the map is stale" or as "the code departed from the decision", and an audit cannot tell the two apart. It does not audit ownership (there is nothing in the code to check it against). **It always states the number of edges checked and not checkable** — a "no divergence" without counts is indistinguishable from a run that scanned nothing |
| `verify-spec` | Reading the specification against the implementation | Owns the **content reconciliation** of [0143](0143-spec-driven-development.md). Launches a read-only `spec-validator` per route in parallel and raises 4 kinds (promise and implementation disagree / misfiling / rewriting a higher layout / what should not be written is written). **It does not redo the existence reconciliation** (a gate settles it, and reproducing it in prose would create a second implementation of the mapping). **It does not decide which side should move** — 0143 decides the direction, but whether the promise changed or the implementation drifted cannot be seen from the reading. A promise that could not be confirmed is reported as one that could not be confirmed. It writes nothing at all |
| `interpretation-audit` | Reconciling sources and interpretations | Judges, in 3 values (No difference / Undeclared difference / **Declared deviation**), whether a decision derived from an external source matches what the source says now, and rewrites [`docs/reference/upstream-interpretations.md`](../reference/upstream-interpretations.md). **It does not rule** — departing is not itself a defect ([0010](0010-standards-and-non-lockin.md)); the defect is departing without anyone knowing, so the purpose is to separate the latter two values. It makes the premises be written before the verdict because **the yardstick easily becomes the reader's memory** — a verdict written first later conscripts the premises that support it. It rewrites only the inventory and does not touch the ADRs / settings a row points to (if auditing and fixing arrive in the same breath, nobody has chosen the fix) |
| `manage-skill` | The single entry point for creating and updating skills | Wraps the methodology of the official `skill-creator` and layers on the placement, naming, frontmatter and body structure of this ADR / [0154](0154-claude-skills-operations.md) and the mirror pair of [0140](0140-documentation-operations.md). Changes to `.claude/skills/**` enter through this skill, which is passed through before any direct hand edit of `SKILL.md` / `SKILL.ja.md`. Preparing the official plugins is handled by `scripts/bootstrap-plugins` |
| `sync-ai` | Porting skills between Claude ↔ Codex | Moves one skill between `.claude/skills/<name>/` and `.agents/skills/<name>/` as a one-way semantic port. It does no raw copy: the sending side writes a transfer contract in `tmp/`, and the receiving side writes in its own idiom (Claude via `manage-skill`, Codex via `codex exec` launched non-interactively by `scripts/sync-ai`). Chain depth is limited not by a preamble but by a lease on the working tree, and a reverse bounce is confirmed with a human at the top of the chain. It does not install `codex`, and reports its absence as a finding. There is no means of starting a sync from the Codex side |

New additions only when they fit the intent of this ADR (the definition of development). Adding to the list is a minor edit and requires no ADR revision.

## Subagent Pattern

`impl-review` / `full-verify` / `back-prop` / `arch-check` / `verify-spec` have **a structure that combines several subagents**.

```text
impl-review (orchestrator)
 ├─ adversarial-reviewer (per lens)   ← .claude/agents/adversarial-reviewer.md
 │   ├─ correctness lens
 │   ├─ security lens
 │   ├─ architecture lens
 │   ├─ cohesion lens
 │   └─ runtime-gap lens
 ├─ type-design-reviewer (when the diff touches src/model/** or a type declaration) ← .claude/agents/type-design-reviewer.md
 │   (scores how strongly a type states its guarantees; criteria SSOT: skills/impl-review/prompts/type-design.md)
 └─ review-verifier                   ← .claude/agents/review-verifier.md
     (classifies each finding CONFIRMED / PLAUSIBLE / REFUTED)

full-verify (orchestrator / in-session fast-path)
 ├─ arch-verifier (Pass 1)            ← .claude/agents/arch-verifier.md
 │   (design soundness of the structure; criteria SSOT: skills/full-verify/prompts/verify-arch.md)
 └─ impl-verifier (Pass 2 / parallel fanout per unit) ← .claude/agents/impl-verifier.md
     (implementation quality per unit; criteria SSOT: skills/full-verify/prompts/verify-impl.md)

back-prop (integrator)
 └─ drift-detector (parallel fanout per kernel)   ← .claude/agents/drift-detector.md
     (drift between declaration and reality; criteria SSOT: skills/back-prop/prompts/detect-drift.md)

arch-check (integrator)
 ├─ arch-auditor (parallel fanout per kernel)     ← .claude/agents/arch-auditor.md
 │   (matches the README's audit perspectives against the code; criteria SSOT: skills/arch-check/prompts/audit-layer.md)
 └─ type-design-reviewer (only when src/model is in a full-scope run) ← .claude/agents/type-design-reviewer.md
     (criteria SSOT: skills/impl-review/prompts/type-design.md)

verify-spec (integrator)
 └─ spec-validator (parallel fanout per route)     ← .claude/agents/spec-validator.md
     (reads promises against the implementation; criteria SSOT: skills/verify-spec/prompts/validate-spec.md)

scaffold-test (orchestrator)
 └─ test-perspective-enumerator (parallel fanout per group) ← .claude/agents/test-perspective-enumerator.md
     (enumerates perspectives before writing; reads the subject, the nearest test-requirement README, and 0090 / 0091)

scaffold-model (orchestrator)
 └─ type-design-reviewer (once per model file written) ← .claude/agents/type-design-reviewer.md
     (criteria SSOT: skills/impl-review/prompts/type-design.md)

impl-issue (orchestrator)
 ├─ code-explorer (parallel fanout per perspective)   ← bundled with the feature-dev plugin (see the adoption table below)
 │   (how it works now; traces the call chain and returns the files to read)
 └─ 3b investigation and drafting (a general-purpose subagent with no definition)
     (what to change; the model is resolved at runtime — no roster is baked into the skill)
```

**One agent definition, many launches.** Placing an agent file per kernel would mean maintaining the same logic once per layer, and the copies are what rot. The basis for running in parallel is "running independent perspectives side by side", not multiplying definitions.

Besides these, `doc-reviewer` (the quality of documentation prose) and `comment-reviewer` (the quality standard for comment content; `settle-comments` reads it at runtime as the source of the standard) exist in `.claude/agents/` as **standalone read-only review subagents** with no fixed wiring to a particular skill. They follow the subagent conventions below (read-only / sonnet by default / model diversity).

The convention that subagents themselves are read-only has no exceptions. Skills that write (`settle-comments` / Step 5 of `test-review`) can change source because **the orchestrator side applies the changes**, not because subagents are given edit permissions.

### Subagent Conventions

- Subagents are placed at `.claude/agents/<slug>.md`
- A skill's `SKILL.md` states the subagent's responsibilities and launch model (sonnet by default / Opus in limited cases)
- Subagents default to **read-only on source**, returning only review results (no code edits)
- When model diversity across subagents (reviewer ≠ implementer) is intended, `SKILL.md` states that intent explicitly
- A subagent that holds judgment criteria places them in one file under the skill's `prompts/`, and the agent definition and `SKILL.md` only reference it without restating it. When the same verification runs on two paths, in-session and background, both reading the same file keeps the quality and format of findings from drifting between paths. What the agent definition holds is only how it takes its input

### Assets taken from official plugins, and assets not taken

An official plugin is **a bundle of assets**, and enabling it is not a declaration that the whole bundle is adopted. For what `scripts/bootstrap-plugins`
declares in project scope, **what is taken and what is deliberately not taken** is stated here.
Without stating it, things get used merely because they are in the bundle, silently bypassing decisions this repo has already made.

| Plugin | Taken | Not taken |
| --- | --- | --- |
| `skill-creator` | The whole methodology (draft → test → review → improve, description optimization) | —— |
| `feature-dev` | `code-explorer` (read-only / sonnet. Follows call chains and returns the files to read) | The `/feature-dev` command, `code-architect`, `code-reviewer` |

**`code-explorer` is taken because it answers a question this repo has no answer for.** Every existing review
subagent asks "is this change correct", whereas this one traces **how it works right now**.
It is sent out in parallel with varied perspectives, as the stage before 3b (investigation and drafting) of `impl-issue`. Read-only / sonnet by default, it
satisfies the subagent conventions above as is.

**`code-architect` is not taken because this repository's structure is already decided.** It
lays out three options, "minimal change / clean structure / compromise", for selection, but the layers and the direction of dependencies are
already decided by [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md),
and 0020 rejects by name the classifications that cut by granularity (Atomic Design / FSD). **Laying out options where things are already decided
is not presenting choices but reopening the decision** ([0010](0010-standards-and-non-lockin.md)).

**`code-reviewer` is not taken because it divides the subjects of review differently.** This repository
splits the subjects into two (the change / the tests) in the Review Phase Protocol of `AGENTS.md`, each
owned by one skill and asked about individually with an estimate. That one splits by three axes (conciseness / defects / conventions), so,
**while looking like the same "two reviews", it does not cover the subject of `test-review`** (comments are settled by `settle-comments` during implementation and are not a subject of review). In addition,
it has no two-stage finder → verifier, so the filtering of "plausible but
wrong" that `impl-review` is placed precisely to provide does not work.

**Even without name collisions, cross-wiring happens.** Plugin agents line up as types, so the orchestrating side
may choose one of them instead of `adversarial-reviewer`. **This table is the basis for that choice** —
what it says is not taken is not used, even if it is in the bundle.

### When to Use Subagents

- **When you want to avoid the bias of a single agent** (adversarial review / multi-perspective judgment)
- **When you want to run independent perspectives in parallel** (per-lens review)
- **When you want a two-stage setup that aggregates and verifies individual reviews** (the finder → verifier pattern)

Simple procedure execution (`canonicalize-doc`, etc.) does not use subagents and is completed by a single orchestrator.

## Division of Responsibilities Among Documentation Skills

The following skills separate input and output and do not overlap responsibilities:

| Skill | Input | Output | Purpose |
| --- | --- | --- | --- |
| `portal-manifest-sync` | manifest + existing READMEs + output of the generator scripts | Edits to the manifest (only removing stale entries, registering the missing mirror of a registered canonical, and adding named ones; a README with a mirror is written as a pair, `README.ja.md` → `<name>.ja.md` as the second entry) | Curating what goes on the portal |
| `settle-comments` | The comments of the declarations a change touched (under `--bulk`, the contents of one directory) | Applying the 7 verdicts (writes both the code and the relocation destination; 3 application modes) | Removing misplacement and dispersion of the same content, and writing the residue the implementation did not write and the required TSDoc frame missing from named functions |
| `scaffold-test` | A set of subjects without tests | `<subject>.test.ts(x)` per subject | Creating new tests that satisfy the 1:1 gate and the coverage gate |
| `scaffold-integration-test` | A seam with an HTTP boundary | One `<subject>.contract.test.ts` file | Pinning the boundary with contract-driven handlers |
| `canonicalize-doc` | An EN or JA document | Generates the missing side / syncs drift on both sides | Managing the two-language pair of one document |
| `sync-readme` | README + its directory | Rewrites the README to match reality | Resolving README ↔ disk drift |
| `readme-review` | README | Grading report (manual-worthy / borderline / etc.) | Deciding portal registration |

`sync-readme` is designed to chain `canonicalize-doc` internally after running.

## Target Structure of `new-env`

`new-env` targets **the config kernel of [0030](0030-environment-variable-management.md)**. That is, it syncs four things: the purpose-specific config modules under `src/config/` (the schema entries + `#` private fields + getters of `<purpose>.server.ts` / `<purpose>.client.ts`), the fixture holding the full set of variables that passes validation, `env/.env.{local,ci,dev,stg,prd}`, and the variable-table document. **The fixture is included because the set of variables is tied together by types** — forgetting to add to it fails type checking not where you wrote but in another file.

The skill **detects the purpose inventory, the schema library and the set of env files from the actual tree at runtime**, and does not hold them as fixed values. The schema library is decided by the implementation of [0030](0030-environment-variable-management.md), and the skill side does not presume a library name.

**In a tree without a config kernel, the skill guards itself and stops.** Building the kernel (schema / validation call / creating `env/`) is not the skill's job, and the skill never newly creates a kernel on the grounds of a request to add a variable.

## Shared References

All development skills share the following references:

- **AGENTS.md's Instruction Priority and Language Rules**: [0152](0152-agents-md-policy.md)
- **Documentation operations policy**: [0140](0140-documentation-operations.md) — the sync policy for canonical EN / translated JA
- **Domain split among `canonicalize-doc` / `sync-readme` / `readme-review` / `portal-manifest-sync`**: the *Division of Responsibilities Among Documentation Skills* table in this ADR

## Prohibitions

- ❌ Performing commercial actions (push / tag / release) from a development skill (the domain of operations = 0154) (Enforcement: Prose — **not mechanizable**. Whether a skill is development or operations has no declaration in frontmatter and is decided by judging its main purpose)
- ❌ Adding subagents "just in case" without model diversity (reviewer ≠ implementer) (not worth the cost) (Enforcement: Prose — **not mechanizable**. Whether adding a subagent is worth the cost is the judgment itself)
- ❌ Giving subagents code-edit permissions (the read-only principle) (Enforcement: Prose — **partly mechanizable**. Whether Edit / Write / NotebookEdit appear in the frontmatter `tools` of `.claude/agents/*.md` could be failed by `skill-lint`, but no rule exists. Whether a definition holding `Bash` writes with it is decided by runtime behavior)
- ❌ Having `new-env` newly create a config kernel (`src/config/` / schema / validation call / `env/`)
- ❌ Overlapping the responsibilities of the four documentation skills (`canonicalize-doc` / `sync-readme` / `readme-review` / `portal-manifest-sync`). In particular, **do not give `portal-manifest-sync` judgment criteria** — the single source of the criteria is `readme-review`, and the moment it is duplicated only one side gets updated (Enforcement: Prose — **not mechanizable**. Whether the responsibilities of two skills overlap, or whether one holds judgment criteria, is decided by the meaning of the body)

## Notes

- Subagent configuration (`.claude/agents/`) pairs with this ADR. When adding a new subagent, also update the references on the `SKILL.md` side
- Combinations of skills (`sync-readme` → `canonicalize-doc`) are stated explicitly as a chain in `SKILL.md`
- The lenses of `impl-review` (correctness / security / architecture / cohesion / runtime-gap) and the lenses of `test-review` may be added or removed, but must not depart from the intent of this ADR (adversarial / multi-perspective). **The two review skills are peers and do not call each other** — tests are the jurisdiction of `test-review`, and `impl-review` holds no such lens. Comments are the jurisdiction of `settle-comments`, but that is not a review stage; it is a stage that runs unconditionally at the end of implementation ([AGENTS.md](../../AGENTS.md) Review Phase Protocol)

## Related ADRs

- [0030-environment-variable-management.md](0030-environment-variable-management.md) — The structure of the config kernel `new-env` targets
- [0140-documentation-operations.md](0140-documentation-operations.md) — The documentation operations policy for canonical EN / translated JA
- [0150-git-workflow.md](0150-git-workflow.md) — The "before commit / PR" timing `impl-review` assumes
- [0152-agents-md-policy.md](0152-agents-md-policy.md) — AGENTS.md's Instruction Priority and Modification Scope
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) — The counterpart for operations skills (placement, naming and frontmatter are shared)
