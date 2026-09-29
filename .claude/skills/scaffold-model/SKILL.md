---
name: scaffold-model
usage-class: situational
description: >-
  Place one display type or pure display function in the `model` kernel so that it passes that kernel's
  audit on the first read: acceptance, `forbidden`, `test-requirement` and the `## 監査の観点` table are read
  from `src/model/README.md` at runtime, the type discipline from ADR 0029, and the written types are
  scored by the read-only `type-design-reviewer` before hand-off. `pnpm gen` has no model kind, so this skill
  is the placement rail. Use it when a display type is about to be shared by several features or returned by
  an adapter, when `scaffold-slice` reaches its model step, or on 「表示用の型を model に足したい」「この型は model
  に置くべき？」. Do NOT use it for a type only one feature uses, a copy of a contract type, or an existing
  model (edit it).
argument-hint: '[kebab-case-name]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Agent, Skill
---

# Scaffold Model

Place one module in the `model` kernel — a display type, the brand constructor for an identifier, or a
minimal pure function over them — shaped so that the kernel's own audit has nothing to report.

The skill carries no rule of its own. What `model` accepts, what it refuses and how each refusal is
judged are read from the kernel README each run; the type discipline is read from ADR 0029. What this
file owns is the **order** — decide whether the module belongs here at all, plan against the audit
rows, write, and have a different model score the types before anyone builds on them.

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- A display type is about to be referenced from more than one place — two features, or an adapter and
  the features it serves.
- An identifier that arrives from the backend needs a branded type and its constructor before an adapter
  can return it.
- `scaffold-slice` reached its model step and passed the type's name and shape in context.

## Do NOT use this skill for

- **A type only one feature uses** — it lives inside that feature. Step 1 settles this and stops.
- **A copy of a contract type** — the wire shape stays in `src/adapters/gen/`, and the mapping from it to <!-- skill-lint-ignore -->
  the display type is the adapter's. Mirroring the contract by hand is refused by
  [ADR 0072](../../../docs/adr/0072-api-type-generation.md).
- **Changing an existing model module** — edit it directly.
- **Writing its tests** — `scaffold-test`, which this skill chains when it runs standalone.

## What this skill reads and writes

Read **at runtime**. Where these and this file disagree, the sources win and the disagreement is
reported.

| Source | What it decides |
| --- | --- |
| `src/model/README.md` — frontmatter | `forbidden` tags, `test-requirement`, `imports-allowed` |
| `src/model/README.md` — `## 受け入れるもの` / `## 受け入れないもの` / `## 運用` | Whether the module belongs here, and file / type / function naming |
| `src/model/README.md` — `## 監査の観点` | The rows the written module must satisfy; the plan answers each one |
| [ADR 0029](../../../docs/adr/0029-type-design-discipline.md) | Discriminated unions, branded identifiers, parse-once-at-the-boundary, `satisfies` |
| [ADR 0027](../../../docs/adr/0027-directory-structure.md) / [ADR 0028](../../../docs/adr/0028-naming-convention.md) | Flat file or subdirectory, and the spelling |
| Sibling modules in `src/model/` | The local shape — how a brand and its constructor are written, how a union is discriminated |
| [`type-design-reviewer`](../../agents/type-design-reviewer.md) | Scores the written types; its criteria are `.claude/skills/impl-review/prompts/type-design.md` |

Writes one module under `src/model/` and, when the kernel README keeps a module table, that table's row.
Nothing else.

## Step 0. Resolve the subject

Take the name from the argument, or from `scaffold-slice`'s context. Otherwise ask with
`AskUserQuestion`:

1. **Name** (kebab-case) and a one-line statement of what the value means on screen.
2. **Who references it** — which features, and whether an adapter returns it.
3. **The shape** — fields, the states it can be in, and which fields are identifiers that come from
   the backend.

Do not invent the shape. Where the user has only an intent, ask; the display type is what the screens
promise to show, and the promise is theirs.

## Step 1. Decide whether it belongs in `model`

Read `src/model/README.md` in full and apply its acceptance sections to the answers from Step 0.

- **Referenced by one feature only** → it belongs inside that feature. Say so and stop.
- **An adapter returns it** → an adapter can only return what it can import; read `imports-allowed` of
  `src/adapters/README.md`. A type the adapter returns cannot live in a feature, so the choice is between
  this kernel and the adapter module itself. When the README does not settle which, ask.
- **It computes a value the contract does not return, or judges a business rule** → the README refuses
  it. Stop and name the row that refuses it; the rule belongs to the backend.

A stop here is a result, not a failure. Report which section decided it.

## Step 2. Read the audit rows and plan against them

Read the frontmatter and the `## 監査の観点` table of `src/model/README.md`, then ADR 0029, then one or two
sibling modules as the concrete reference (on any conflict, the README and the ADR win).

Build the plan as a table with **one line per audit row**:

| Row (観点) | How the planned module stays inside it |
| --- | --- |

- A row whose 根拠 starts with `機械:` is enforced by a gate. Plan so it would not trip; do not re-judge
  it here.
- Every other row gets a concrete answer — which field is branded, which states form the union, why a
  function is minimal display logic rather than a judgment.
- A `forbidden` tag with no row is a gap in the README. Plan against the tag itself and report the gap.

Add the file path, the exported symbols with their kinds, and the test file `scaffold-test` will be asked
to write. Confirm with `AskUserQuestion`: 「この計画で model を置きますか？」 / 「修正したい」 / 「キャンセル」.
From `scaffold-slice`, confirm the same way — each layer is confirmed on its own.

## Step 3. Write the module

Write exactly what the plan names, and nothing the plan does not:

- **No comments.** The implementation writes none; Step 6 decides which ones the module earned.
- **No `as`, no `unknown` in the public surface, no bare `string` for an identifier from outside** —
  these are the rows ADR 0029 and the README audit; the plan already answered them.
- **No import beyond `imports-allowed`.** A value the module seems to need from `config` arrives as an
  argument.
- **No new dependency.** If the module cannot be written without one, stop: adding a dependency is a
  stopping point owned by [ADR 0004](../../../docs/adr/0004-library-management.md).

Add the module's row to the README's module table when the README keeps one, in the table's own
phrasing.

## Step 4. Score the types with `type-design-reviewer`

Spawn [`type-design-reviewer`](../../agents/type-design-reviewer.md) with the **Agent tool** (model
`sonnet`, so the scorer is not the model that wrote the types) and pass:

- `scope` — `changed`
- `files` — the module written in Step 3
- `staticVerdict` — `未取得`

Show its findings as returned. For each one, ask the user whether to apply it now; apply the approved
ones and leave the rest in the report. The reviewer is read-only — every edit is this skill's, after
approval.

Record that this pass ran and on which files. When `/impl-review` is later estimated for the change, its
type-design pass on the same module is already covered — the estimate says so.

## Step 5. Tests

`test-requirement` for this kernel is read from the frontmatter (Step 2). Standalone, chain
`scaffold-test` on the new module. From `scaffold-slice`, leave it: the orchestrator runs `scaffold-test`
once over every unit the slice placed.

## Step 6. Settle comments and hand off

Standalone, run `/settle-comments` over the declarations written here — it is the unconditional last
step of implementing, and it confirms before it writes. From `scaffold-slice`, the orchestrator runs it
once at the end.

Report in Japanese: the file written, the audit-row table from the plan, the `type-design-reviewer`
findings with what was applied and what was left, and the README gaps found. Do not commit.

## Constraints

- ✅ Read `src/model/README.md`, ADR 0029 and sibling modules this run
- ✅ Answer every `## 監査の観点` row in the plan, and confirm the plan before writing
- ✅ Stop when Step 1 says the module does not belong in `model`
- ✅ Score the written types with `type-design-reviewer` on `sonnet`
- ❌ Place a type only one feature uses
- ❌ Copy a contract type, or import from `src/adapters/gen/` <!-- skill-lint-ignore -->
- ❌ Write comments while writing the code
- ❌ Add a dependency, or route around one
- ❌ Restate a README row or an ADR 0029 rule in this file

## Checklist

- [ ] Name, referrers and shape resolved; none of them invented
- [ ] Acceptance decided from the README; stopped when it refused
- [ ] Plan answers every audit row; README gaps reported; plan confirmed
- [ ] Module written without comments, within `imports-allowed`; module table row added when one exists
- [ ] `type-design-reviewer` ran on the written files; findings applied only on approval
- [ ] `scaffold-test` chained (standalone) or left to `scaffold-slice`
- [ ] `/settle-comments` run (standalone) or left to `scaffold-slice`; nothing committed
