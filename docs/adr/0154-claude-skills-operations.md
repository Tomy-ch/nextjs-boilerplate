# Claude Skills Operating Policy (Operations)

This project places the **operational flows** that accompany the development process (commit splitting / PR creation / release note generation / dependency audits / meta inventory, etc.) as Claude Code **skills** under `.claude/skills/`. This ADR defines the placement, naming, structure and coverage of operations skills.

Development skills (scaffolding / review / documentation sync, etc.) are handled separately in [0155-claude-skills-development.md](0155-claude-skills-development.md).

## Status

Accepted

## Rationale / Purpose

- Fix recurring operational work (commit splitting / release procedure / dependency audits, etc.) in the shape of **procedure script + user confirmation**, so that humans and AI agents can reproduce the same procedure
- Make each skill's `SKILL.md` the **primary source**, so that "what to do in what order" for an operational flow is complete in one file
- Unify skills involving commercial actions (push / tag / release / rewriting `mise.toml`, etc.) on a shape that **always inserts user confirmation**, structurally preventing runaway behavior

## Scope (Definition of Operations Skills)

"Operations" = skills that handle **operations** that move the development process forward. It refers to those whose main purpose is not generating or editing code / documentation.

Concretely:

- Git / GitHub operations (commit / PR creation / update)
- The release process (release notes / tag)
- Dependency and tool audits (`mise.toml` updates / `pnpm audit`)
- Meta inventory under `.claude/`

Development skills (those whose main purpose is generating or editing code / documentation) are handled in 0155.

## Placement and Naming

### Placement

```text
.claude/
└── skills/
    └── <slug>/
        ├── SKILL.md         ← canonical (English), read by Claude Code
        └── SKILL.ja.md      ← Japanese translation (for reference, not read by Claude Code)
```

- `SKILL.md` is **the English canonical version**. Claude Code loads it and runs the skill
- `SKILL.ja.md` is **a translation for humans** and is not loaded as a skill

### Naming Convention

- The directory name `<slug>` is **kebab-case**, verb-based
- Users invoke it with `/<slug>`
- Examples: `commit` / `submit-pr` / `release-notes` / `tools-upgrade` / `tool-map` / `design-export`

## frontmatter

Place the following YAML frontmatter at the top of `SKILL.md`.

| Key | Required | Purpose |
| --- | --- | --- |
| `name` | ✓ | Skill name (matches the directory name) |
| `description` | ✓ | A one-paragraph explanation of what the skill does. Used by Claude Code's skill picker / trigger decision |
| `usage-class` | ✓ | The usage type. One of `frequent` / `situational` / `lifecycle` / `automatic` / `safety` |
| `argument-hint` | Optional | A format hint for invocation arguments (e.g. `[--dry-run]`) |
| `allowed-tools` | Optional | Explicit list of tools permitted (fine-grained Bash permissions, etc.) |

`usage-class` is set by [0160](0160-agent-environment-loop.md), which decided to judge skills against their usage type. **The judgment is made against the type, not the invocation count** — a skill without a type falls on the side that can be retired on the grounds of "never invoked". The declaration lives in the skill itself because, placed in a separate ledger file, **only the ledger goes stale on the day a skill is added**; machine enforcement is held by the enum check of `scripts/skill-lint` ([0144](0144-decision-enforcement-pairing.md)). It is an additional key the tool side does not interpret, and only this repository's mechanisms read it.

`description` must include **in what situations it should fire** ("when to use", not a description of the feature).

### `description` is capped at 800 characters

**Unlike the body, `description` is loaded every turn, including for skills that are not invoked.** The `description` of every skill and every agent definition always rides along as a preamble, so the verbosity of one becomes a fixed cost for the whole repository — paid until the last turn even for skills never invoked in the session. The body has no such property; it is read only when invoked.

What goes within the cap is three things: **when to call it / when not to call it / which words find it**; **procedures, criteria and design rationale are held by the body**. The first three help with selection, but the latter three are used only after selecting, so there is no point handing them to everyone before the choice.

Machine enforcement is held by `description-length` in `scripts/skill-lint` ([0144](0144-decision-enforcement-pairing.md)). The cap applies equally to definitions under `.claude/agents/**` — their `description` also rides along every turn by the same path.

## Body Structure

The body of `SKILL.md` has the following sections.

1. **Title** (`# <Skill Name>`) and a one-paragraph overview at the top
2. **(Optional) A mention of `SKILL.ja.md`** — when a translation exists, state so
3. **When to Use** — an enumeration of the situations in which to use it
4. **(Optional) Contract** — see below
5. **Do NOT use this skill for** — an enumeration of situations not to use it in, and alternatives
6. **Step <number>. <title>** — numbered steps (start from Step 0 when there is preprocessing)
7. **Verification / wrap-up** — final checks such as `pnpm fix` / `pnpm lint` / tests

### Contract table — only skills with a neighboring door carry one

**A skill that is a receiving point for questions** places a two-column `## Contract` table right after When to Use. There are areas where the same
nouns appear in the descriptions of several skills and **the signal that distinguishes them is intent, not vocabulary**; there, unless
"what it owns and what it never does" is declared in four rows, the boundary with the neighboring door dissolves into the prose of the body.

| Row | What to write |
| --- | --- |
| **Owns** | The subject only this skill answers |
| **Never** | What is adjacent to the subject but this skill never does |
| **Starts when** | Situations in which it may start |
| **Stops when** | Conditions for stopping even midway |

**Only doors carry it.** It is not made mandatory for every skill — in a skill without a door (generation, sync, release operations) the
four rows become a copy of the Do NOT section of `description`, which runs into [0140](0140-documentation-operations.md)'s
principle of not holding the same judgment in two places. **Whether a skill is a door is decided by "could the same question go to another skill?"**

## Coverage (Existing Skills)

| Slug | Role | Coverage |
| --- | --- | --- |
| `commit` | Commit splitting and execution | Splits working-tree changes by the prefix convention (Feat/Fix/...) and stacks them one by one with `git commit --no-verify`. At the end, runs the lefthook-equivalent verification once for all of them |
| `submit-pr` | PR creation / update | Automatically chooses update if the current branch already has a PR, create otherwise. Merges in the base branch before pushing (never checks out or pushes a protected branch). The PR body is generated from `.github/pull_request_template.md` |
| `release-notes` | Release note generation | Confirms the FROM tag and NEXT_VERSION with `AskUserQuestion` and generates `.github/release/<NEXT>.md` |
| `tools-upgrade` | Dependency audit of `mise.toml` | Compares against upstream latest and applies a supply-chain quarantine with a per-backend window ([0110](0110-security-operations.md)). Updates `mise.toml` after approval |
| `node-upgrade` | Node.js version update | Updates the SSOT, `mise.toml` `[tools] node` ([ADR 0003](0003-version-manager.md)), to the target version, and verifies with a lockfile rebuild + `pnpm install` / `pnpm lint` / `pnpm build`. Following `@types/node` to a new major is a separate PR ([0004](0004-library-management.md)) |
| `actions-pin` | SHA-pin audit of GitHub Actions | Updates the versions in `uses:` with quarantine, using `.github/actions-pin.toml` as the SSOT. Does not take releases newer than the exclusion window, and steps back to a version that has passed the window. The substance is `make actions-pin-{resolve,apply,check}` ([0153](0153-ci-configuration.md)) |
| `dep-vuln-upgrade` | Dependency update named by a vulnerability | Moves only the npm dependencies a CVE / GHSA names to the smallest fixed version within the same major. A direct dependency moves by its exact pin in `package.json`, a transitive one by `overrides` in `pnpm-workspace.yaml` (vulnerable range → a fixed range inside the upstream's declared range), and the lockfile is rebuilt with `pnpm install --lockfile-only`. Versions caught by the window (`minimumReleaseAge`) are handed to `supply-chain-triage`, and the window is not lowered. Crossing a major, an override outside the upstream range, exempting from quarantine, and an entry in a suppression file are each confirmed one by one. Adding a new dependency is out of scope ([0004](0004-library-management.md)) |
| `repo-truth` | Factual answers about the current state | Answers "how does this repository work right now" from primary sources, separating evidence from inference. Reads indexes by concern first and makes keyword search the last net (documents are named for the concern they own, so the governing file does not contain the words of the question). Gives **undefined** (read the owning index through and it is not there) and **could not confirm** (did not read it through) as separate conclusions, with the frontier covered. Read-only, and does not fix drift it finds |
| `how-to` | Goal → canonical procedure | For an operation one wants to perform, returns prerequisites / commands / success check / recovery / destructiveness together. First routes to the owning skill and stops; if none, reads both the make targets and the `package.json` scripts through the index. If there is no procedure, gives **UNDEFINED** and the frontier, and **does not invent commands**. Whereas `repo-ops`, being symptom-driven, cannot conclude "there is no procedure", this one, being goal-driven, can. Does not run gates even with `--mode=run` |
| `question` | Resolving the reading of a question and routing it | Resolves the reading of a question on three axes (world / intent / target), confirms **only the axes that genuinely split** with `AskUserQuestion`, and hands it to the owning skill. Does not answer by itself. Destinations are resolved by reading the frontmatter of `.claude/skills/*/SKILL.md` at runtime; no table is hardcoded. **When the world axis resolves to "the diff in this window", it hands off to the Review Phase Protocol of `AGENTS.md`** — routing straight to one review bypasses the discipline of asking about all three as peers |
| `research` | Comparing undecided choices | Fixes the evaluation axes **before enumerating the options**, compares by option / pros and cons / risk / fit with the existing structure / cost, and gives a recommendation with reversal conditions. Does not pad the number of options. First tries to dissolve the question — current ADRs and the **reversal conditions** their bodies hold / `docs/project/out-of-scope.md` / an isomorphic precedent found by enumerating the kernels. States cost but does not weigh it into the verdict. Does not adopt, write ADRs or file issues |
| `resolve-merge` | Landing a merge | Splits conflicted paths into classes and applies the mechanical resolution of each class — generated artifacts are rebuilt from their source rather than picking a side, pin lockfiles run their resolvers, and append-only registries take the union. **Runs even with no conflicts** (derived artifacts go stale even in a conflict-free merge). Taking in the base is held by `make base-merge`. There are only two endings: if even one thing that cannot be solved mechanically remains, it leaves the markers and stops without committing; if everything is solved, it asks whether to commit and push. Does not run gates |
| `new-issue` | Filing an issue | Verifies premises against the implementation before filing. **Five blockers** (asserting behavior not observed / quoting without checking freshness / comparisons not measured / impact scope from a partial search / not searching existing issues) stop the draft. The body's fields are filled by reading `.github/ISSUE_TEMPLATE/` at runtime (`scripts/issue-field-lint` checks them by exact match on `###`), and 前提 / 論点 / やらないこと are added to them. Finally it passes the gate "is this an issue at all" |
| `supply-chain-triage` | Evidence scoring of a quarantined version | For one version caught by the window, scores the four questions of [0110](0110-security-operations.md) on 4 axes, 0–12. **report-only** — touches neither the lockfile, the pin, nor the window. Reads artifacts but never executes them. **Evidence that could not be obtained is reported as `?` and not counted as `0`** (with two or more `?`, no band is given: INSUFFICIENT-EVIDENCE). Exposure is reported on a separate line from the score. The chained destination of `actions-pin` / `images-pin` / `tools-upgrade` / `dep-vuln-upgrade` / Dependabot |
| `repo-ops` | Runbook of operational gotchas | A set of remedies for recurring stumbles such as the mise toolchain / pnpm lockfile / make `DRY_RUN` / `tmp/reviews`. A read-only knowledge skill that changes no state. **Symptom-driven**, and answers only what is in its own index — symptoms not listed are routed to `how-to` (goals; can conclude a procedure is absent) or `repo-truth` (current state). **This runbook deliberately cannot conclude absence** (if it could, silence would become indistinguishable from an answer) |
| `tool-map` | Inventory under `.claude/` | Generates a table of commands / skills / agents + a Mermaid dependency map |
| `design-export` | Exporting the design system | Carries `tmp/design-bundle` built by `pnpm design:bundle` (shadcn registry / inventory / tokens) with a procedure per destination. Dependency runs one way, repo → design, with no path for importing artifacts from the export destination. Under the non-lock-in of [0010](0010-standards-and-non-lockin.md), procedures for a specific SaaS are confined to this skill |

New additions only when they fit the intent of this ADR (the definition of operations). Adding to the list is a minor edit and requires no ADR revision.

## External Skills (Upstream Distributions)

The table above lists skills this repository **authors and maintains**. Skills distributed by upstream are treated separately. The line is drawn at **"authored work or distributed artifact"**.

| | Own skills (`.claude/skills/`) | External skills |
| --- | --- | --- |
| Where the substance lives | In the repository (project scope) | `~/.claude/skills/` (user scope) |
| Distribution | Arrives with a trusted clone | Needs installing per machine |
| Mirror pair | Required ([0140](0140-documentation-operations.md)) | Not created |
| `manage-skill` / `skill-lint` | Covered | Not covered |
| Update path | Direct edit | Pin bump in `mise.toml` (quarantine of [0110](0110-security-operations.md)) |

Therefore **the `SKILL.md` of an external skill is not brought into the repository**. Vendoring a 40KB-class third-party body creates the mirror-pair requirement and a duplicated SSOT at the same time, and both rot with every upstream update.

The repository holds only the following four things.

1. The pin in `mise.toml` (the SSOT for the version)
2. The install script `scripts/bootstrap-external-skills`
3. The permission boundary in `.claude/settings.json`
4. Exclusion settings — in both directions: the side that keeps the output out of other tools' scans (`.gitignore` and the three md lints) and the side that narrows what the tool analyzes (`.graphifyignore`)

### Write the permission boundary as patterns

A tool that distributes external skills may have, apart from the command that places skills, **commands that rewrite files inside the repository**. For graphify, the rewrite targets are `CLAUDE.md` / `AGENTS.md` / `.cursor/` / `.gemini/` / git hooks — all files AGENTS.md defines as protected.

**Do not draw the line at "which subcommands are user scope".** graphify has a `<name> install` family and an `install --platform <name>` family, and only the latter appears to be user scope. In fact it is not: the `--project` flag tips the latter into project scope, and `--platform cursor` / `--platform gemini` write to the current directory even without the flag. Trying to sort out the safe side by family name opens a hole every time one such exception is missed. **Installation goes through the script only, and agents are forbidden the whole `install` family.**

This is put in `deny` because a prohibition in prose alone is not enough. An agent can reach it on its own by reading `--help`, and what it consults then is the CLI help, not the ADR.

**Write patterns, not enumerations.** Upstream keeps adding platform support, and a deny listing names silently opens a hole at the next pin bump. What must be blocked is not "the names that existed at the time" but "the shape install".

The deny, however, blocks only the front path. As *Where to govern outward actions* below explains, the patterns are prefix-match globs, and the same execution can be triggered from a general-purpose interpreter or by absolute path. The deny is the first stage that stops mix-ups and runaway behavior, not the whole of the governance.

### Do not depend on them

External skills are **not connected to any gate: lint / CI / git hook / build**. Nothing breaks without installing them. This setup is why they can be adopted even while upstream is pre-1.0; conversely, the basis is lost the moment they are connected to a gate ([0110](0110-security-operations.md)).

There is one more reason not to connect them. An external skill's output (the graph, for graphify) is a snapshot as of its last run and does not reflect uncommitted changes. Put on a gate, "green on stale output" becomes possible, tipping something unchecked into a pass ([0157](0157-inspection-declaration-discipline.md)). A decision to connect could arise only when its value in this repository has been confirmed by measurement and a mechanism guaranteeing freshness inside the gate has been introduced; neither being installed nor upstream leaving pre-1.0 is a reason — maturity rising does not make the freshness problem go away.

The current external skill is one: graphify (a codebase knowledge graph). Installation steps and operational notes are held by [`.claude/README.md`](../../.claude/README.md).

**Installation targets Claude Code only. The reversal condition is when another platform's container lands in this repository** — installing for a platform with no container leaves nowhere to verify whether it landed. **"Upstream supports it" and "the import source installs it" are not conditions.**

**`pipx:graphifyy` does not get the `[sql]` extra. The reversal condition is when SQL sources become tracked** — this does not normally happen under the current role definition, where the presentation layer has no DB ([0070](0070-backend-role-separation.md)). **"The import source adds it" is not a condition** — an extra is dependency surface, that is, supply-chain exposure itself.

## User Confirmation Before Commercial Actions

Skills containing the following operations **must obtain user confirmation before execution**:

- `git push` / `gh pr create` / `gh pr edit` (`submit-pr`)
- `git tag` / `gh release create` (following `release-notes`)
- Rewriting `mise.toml` (`tools-upgrade`)
- Destructive operations of the `git reset --hard` kind

Confirmation uses `AskUserQuestion` or the confirmation message defined in AGENTS.md `Git Rules > Critical Rules` (`変更はローカルにコミット済みです。これらの変更をプルリクエストにプッシュしますか？`).

### Where to govern outward actions

**Governance lives in the confirmations in skill bodies, not in pattern rules in `permissions`.**

`permissions` are evaluated in the order `deny` → `ask` → `allow`, and [deny cannot have allowlist exceptions](https://code.claude.com/docs/en/permissions). So a shape like "`gh api` is forbidden in principle, only posting reviews is allowed" cannot be expressed, and as long as the line is drawn by command name, it is a binary choice between "block everything and kill the feature" and "open it".

In addition, patterns are prefix-match globs, and the same HTTP call can be sent from `python3` or `pnpm exec tsx`. Blocking a specific command while allowing a general-purpose interpreter prevents only the straightforward path and does not hold up as governance.

So what remains in `permissions.deny` is limited to **operations that lose committed work with no means of recovery**. For `gh api`, concretely, calls containing `DELETE` and ref operations (`git/refs`; a `force` update there is a force push on the API side, a path that slips past the force-push prohibition of [0150](0150-git-workflow.md)). Every other outward write is guaranteed by one confirmation before execution.

As a consequence, **a skill must not skip confirmation on the grounds that "the command is allowed"**. Being allowed means only "the machine does not stop it"; what stops it is human judgment.

## Using `AskUserQuestion`

**Inputs that need confirmation** within a skill (FROM tag / version number / quarantine days / output format, etc.) are confirmed explicitly with the `AskUserQuestion` tool.

- Do **not implicitly adopt** values from arguments / the latest message
- Confirm right before execution to avoid drift

## Shared References

All operations skills share the following references:

- **Git conventions**: [0150](0150-git-workflow.md) — conventions for branches, commits and PRs
- **Hook policy**: [0151](0151-git-hooks.md) — exception handling and final verification when using `--no-verify`
- **The SSOT of mise.toml**: [ADR 0003](0003-version-manager.md) — what `tools-upgrade` audits
- **Library operations**: [0004](0004-library-management.md) — the principles of exact pins / separating major updates when updating dependencies
- **AGENTS.md's Instruction Priority and Language Rules**: [0152](0152-agents-md-policy.md)

## Prohibitions

- ❌ Editing business logic directly from an operations skill (code editing is the domain of development = 0155) (Enforcement: Prose — **not mechanizable**. What a skill's procedure edits is decided by runtime judgment, not by the shape of `SKILL.md`)
- ❌ Writing the frontmatter `description` of `SKILL.md` as a "feature description" only (include the firing conditions) (Enforcement: Prose — **not mechanizable**. Whether `description` includes firing conditions is decided by the meaning of the sentence (`description-length` in `skill-lint` looks only at length))
- ❌ Executing commercial actions (push / tag / release) without confirmation
- ❌ Overwriting `SKILL.md` with the translation file (`SKILL.ja.md`) (the canonical is English) (Enforcement: `scripts/skill-lint` fails a `SKILL.md` overwritten by the mirror (missing frontmatter). Whether the body is written in English is Prose — **not mechanizable**. Including Japanese trigger phrases is legitimate, and there is no threshold in code for whether the canonical is English)
- ❌ Including spaces, uppercase or Japanese in a skill name / directory name (Enforcement: Prose — **mechanizable** (match the directory names under `.claude/skills/` against a kebab-case regular expression in `scripts/skill-lint`. Matching `name` against the placement name is already checked. No rule exists))

## Notes

- Skills are Claude Code only. They are not deployed to other agents such as Codex / Cursor
- A skill's granularity is, in principle, "one invocation = one operation". To bundle several operations, split them into separate skills or have a meta-skill call the individual skills
- There is no cap on the number of skills, but duplicates with similar roles are avoided

## Related ADRs

- [0003-version-manager.md](0003-version-manager.md) — `mise.toml`, which `tools-upgrade` audits
- [0004-library-management.md](0004-library-management.md) — Conventions for updating dependencies
- [0150-git-workflow.md](0150-git-workflow.md) — The Git conventions for `commit` / `submit-pr`
- [0151-git-hooks.md](0151-git-hooks.md) — Handling of the lefthook that `commit` bypasses
- [0152-agents-md-policy.md](0152-agents-md-policy.md) — The relationship between AGENTS.md and this ADR
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — Development-skill policy (the counterpart of this ADR)
