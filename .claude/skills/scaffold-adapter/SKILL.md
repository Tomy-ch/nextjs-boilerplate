---
name: scaffold-adapter
usage-class: situational
description: >-
  Scaffold one server-side fetch seam in the `adapters` kernel from a contract that is already fetched and
  generated: wraps `pnpm gen adapter` for placement, then fills the stub so the seam passes the kernel's audit
  — value classification, connection port, lifetime and taint are derived from `src/adapters/README.md` and
  the contract's `security` at runtime, and the skill halts with a hand-off when one cannot be derived. Chains
  `scaffold-integration-test`. Use it when a screen or Route Handler needs an operation no adapter calls yet,
  when `scaffold-slice` reaches its adapter step, or on 「この API を叩く adapter を作って」「取得の口を足したい」.
  Do NOT use it to change the contract or generated files, to extend an existing adapter module (edit it), or
  for a browser-side seam.
argument-hint: '[kebab-case-name] [operationId...]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Skill
---

# Scaffold Adapter

Build one fetch seam under `adapters` — the function that calls the backend through the right connection
port, validates the response against the generated schema, and returns a display type — so that the
kernel's audit has nothing to report and the seam is pinned by a contract test before anything is built
on it.

**Placement is the generator's.** `pnpm gen adapter <name>` decides the path, the file names and the
skeleton; this skill never hand-places what it would have written. What this skill adds is the part the
generator cannot know: which contract operation the seam calls, which classification and port that
implies, and whether it has a lifetime.

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- A feature or a Route Handler needs an operation that no adapter calls yet, and the operation is already
  in the fetched contract.
- `scaffold-slice` reached its adapter step and passed the name and the operations in context.

## Do NOT use this skill for

- **Changing the contract.** The contract is the backend's; `openapi/` only fetches and pins it, and the
  generated files are never hand-edited ([ADR 0072](../../../docs/adr/0072-api-type-generation.md)).
  Step 0 checks that the operation is there and hands off when it is not.
- **Adding a function to an existing adapter module** — edit that module. The generator refuses a path
  that already exists, and this skill does not route around it.
- **A browser-side seam** (`client/`) — `pnpm gen adapter` places server-side only.
- **Pure transforms with no request** — they are units; write them and run `scaffold-test`.
- **Writing the contract test by hand** — `scaffold-integration-test`, which Step 6 chains.

## What this skill reads and writes

Read **at runtime**. Where these and this file disagree, the sources win and the disagreement is
reported.

| Source | What it decides |
| --- | --- |
| `src/adapters/README.md` — frontmatter | `forbidden` tags, `test-requirement`, `imports-allowed` |
| `src/adapters/README.md` — `## Audit Criteria` | The rows the seam must satisfy; the plan answers each one |
| `src/adapters/README.md` — classification, lifetime, credential, URL-budget and taint sections | Which connection port, whether `allowAnonymous`, whether and how the seam keeps a lifetime, whether it taints its result |
| `src/adapters/server/http/README.md` | The connection ports and the request boundary the seam goes through |
| `openapi/<name>.gen.yaml` and `src/adapters/gen/` | The operation, its `security`, parameters, declared responses and the generated schema <!-- skill-lint-ignore --> |
| `scripts/gen/` | What `pnpm gen adapter` places, and the next steps it prints |
| A sibling module that calls the same kind of operation | The concrete shape of a request, a mapping and a taint; on conflict the README wins |

Writes: what `pnpm gen adapter` places, then edits to those files only. Nothing under `src/adapters/gen/` <!-- skill-lint-ignore -->
or `openapi/`.

## Step 0. Preconditions

Resolve the name and the operations (`operationId`s) from the argument, from `scaffold-slice`'s context,
or with `AskUserQuestion`. Then check, and **stop at the first that fails**:

1. **The operation is in the fetched contract.** Search `openapi/*.gen.yaml` for each `operationId`. <!-- skill-lint-ignore -->
   When one is missing, stop with the hand-off: the contract changes on the backend side; then the `ref`
   in `openapi/sources.yaml` moves, and `make ai-api-fetch` and `make ai-api-gen` regenerate
   (`openapi/README.md` owns the procedure). `scaffold-slice` performs that move with confirmation; this
   skill does not.
2. **The generated files match the contract.** `make ai-api-gen-check`. A drift means someone fetched
   without generating; the fix is `make ai-api-gen`, never an edit under `src/adapters/gen/` — that path <!-- skill-lint-ignore -->
   is generated (`git check-attr linguist-generated -- <path>` says so), and editing it is a trip wire in
   `AGENTS.md`.
3. **The target path does not exist.** `pnpm gen adapter` refuses an existing path; so does this skill.
4. **The display type the seam returns exists**, or is part of this run. An adapter returns only what it
   can import — read `imports-allowed`. If the type is not there yet, run `scaffold-model` first (or let
   `scaffold-slice` order it).

## Step 1. Read the kernel and derive the seam

Read `src/adapters/README.md` in full, `src/adapters/server/http/README.md`, the operation in the
contract and its generated schema, and one sibling module that calls the same kind of operation.

Derive, **from those sources only**, one answer per question below, each with the sentence or field it
came from:

| Question | Derived from |
| --- | --- |
| Classification and connection port | The README's classification section, applied to the operation's `security` and to whether its response varies by principal |
| `allowAnonymous` on the request | The README's credential section, applied to the operation's `security` |
| Lifetime (`use cache`, profile name, tags) or none | The README's lifetime section and the profiles `next.config.ts` declares |
| Taint of the result | The README's taint section and ADR 0112's classification of the fields the display type carries |
| Display type and mapping | The display type from Step 0, and the generated response type |
| URL budget | The README's URL-budget section, when the operation carries conditions in the query |

**When a question cannot be answered from the sources, stop and hand it off** — name the question, the
sources read, and what would settle it. A lifetime chosen by taste, a classification guessed from the
path, an `allowAnonymous` set without reading `security`, or a taint skipped because PII status is
unclear can each ship a defect that no type and no lint rejects — the README says so of
`allowAnonymous` in its own words.

## Step 2. Plan against the audit rows

Read the frontmatter and the `## Audit Criteria` table. Build the plan as a table with **one line per row**:

| Row (観点) | How the seam stays inside it |
| --- | --- |

- A row whose 根拠 starts with `機械:` is enforced by a gate. Plan so it would not trip; do not re-judge it.
- Every other row gets a concrete answer from Step 1 — which port, why the public surface names no
  generated type, where the taint happens.
- A `forbidden` tag with no row is a gap in the README; plan against the tag and report the gap.

Add the command (`pnpm gen adapter <name>`), the files it will place, the exported symbols, the Step 1
table, and the tests Step 6 will produce. Confirm with `AskUserQuestion`:
「この計画で adapter を置きますか？」 / 「修正したい」 / 「キャンセル」.

## Step 3. Place with the generator

```sh
pnpm gen adapter <name>
```

If it stops, surface its message and stop; do not create the files by hand. It prints its own next
steps — follow the parts this skill does not already cover.

## Step 4. Fill the skeleton

Replace the generated stub with the planned seam:

- The request goes through the connection port Step 1 derived, with the generated schema, and returns the
  display type. Nothing from `src/adapters/gen/` appears in the exported signatures. <!-- skill-lint-ignore -->
- Lifetime and taint exactly as Step 1 derived — or not at all when it derived none.
- **Remove the generated `TODO:` text** the skeleton carries; the plan has answered it. **Write no new
  comments** — Step 7 decides which ones the seam earned.
- **Replace the skeleton's test.** It pins the stub's body, which no longer exists. Delete the test file
  the generator placed; the 1:1 gate then reports the subject as `missing-test-file`, and Step 6 writes
  it from the seam's real branches.
- **No new dependency.** If the seam cannot be written without one, stop: adding a dependency is a
  stopping point owned by [ADR 0004](../../../docs/adr/0004-library-management.md).

## Step 5. Check the written seam against the plan

Read the files back against the Step 2 table, row by row, and fix any line that drifted from its
answer before any test is written. This is the author's check, not the audit — `arch-check` is the
audit, and `scaffold-slice` runs it at its end.

## Step 6. Tests

- **Always**: chain `scaffold-integration-test` on the new module. The seam performs a request, which is
  exactly what the README's `integration` declaration covers.
- **Standalone**: chain `scaffold-test` for the unit side (the mapping and anything else the 1:1 gate
  reports for this module). From `scaffold-slice`, leave it — the orchestrator runs `scaffold-test` once
  over the whole slice.

## Step 7. Settle comments and hand off

Standalone, run `/settle-comments` over the declarations written here; it is the unconditional last step
of implementing and confirms before it writes. From `scaffold-slice`, the orchestrator runs it once.

Report in Japanese: the files placed and edited, the Step 1 derivations with their sources, the audit-row
table, the tests produced, what was handed off and why, and any README gap. Do not commit.

## AI Modification Scope

Writes only under `src/adapters/`, through `pnpm gen adapter` and then edits to the files it placed.
`openapi/` and `src/adapters/gen/` are read-only here. <!-- skill-lint-ignore -->

## Constraints

- ✅ Check the contract and the generated files before anything is placed
- ✅ Place with `pnpm gen adapter`; stop when it stops
- ✅ Derive classification, port, `allowAnonymous`, lifetime and taint from the README and the contract,
  each with its source
- ✅ Stop and hand off when a derivation has no source
- ✅ Answer every `## Audit Criteria` row in the plan, and confirm the plan before writing
- ✅ Chain `scaffold-integration-test`
- ❌ Edit `openapi/**`, `src/adapters/gen/**`, or anything else generated
- ❌ Hand-place a file the generator would have written
- ❌ Choose a lifetime, a classification or a taint by taste
- ❌ Leave the skeleton's test pinning the stub
- ❌ Add a dependency, or route around one
- ❌ Restate a README rule in this file

## Checklist

- [ ] Operation found in the fetched contract; `make ai-api-gen-check` green; target path free; display type available
- [ ] README, http README, contract and a sibling read this run
- [ ] Every derivation traced to a source, or handed off
- [ ] Plan answers every audit row; README gaps reported; plan confirmed
- [ ] Placed by `pnpm gen adapter`; stub and skeleton test replaced; `TODO:` removed; no comments written
- [ ] `scaffold-integration-test` chained; `scaffold-test` chained (standalone) or left to `scaffold-slice`
- [ ] `/settle-comments` run (standalone) or left to `scaffold-slice`; nothing committed
