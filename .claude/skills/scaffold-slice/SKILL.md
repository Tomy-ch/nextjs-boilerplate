---
name: scaffold-slice
usage-class: situational
description: >-
  Orchestrator that builds one feature slice's data path from the contract inward: contract check →
  `scaffold-model` → `scaffold-adapter` → `pnpm gen feature` → `scaffold-route` → `scaffold-test` →
  `/settle-comments`, then `arch-check` on the kernels it touched as a report-only exit check. Each child
  reads its kernel README's `## 監査の観点` at runtime and confirms its own plan; this skill owns only the order
  and the hand-offs, and halts on the first failing step without rolling back. Use it when a slice starts from
  an operation in the contract, or on 「契約から feature を一式作って」「API から画面の手前まで通して」. Do NOT use it to
  settle a screen's look (`new-feature`), for one layer (run that scaffold), or to review.
argument-hint: '[feature-name] [--screen=<screen>]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Skill
---

# Scaffold Slice

Build one feature slice from the contract inward — the display types, the fetch seam, the slice's home,
and the `app` entry points — by chaining the skills that own each step, then audit what was built.

This skill **writes no source itself**. Every file comes from a child skill or from `pnpm gen`, each of
which reads its kernel README and confirms its own plan. What lives here is the order, what each step
passes to the next, and where the chain stops.

It is the contract-first counterpart of `new-feature`, which starts from a screen's look. **The two meet
at `pnpm gen feature`**: this skill places the slice, and the look, the stories, the specification and the
screen's tests stay with `new-feature`, which picks up the placed screen at its stories.

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- A slice starts from an operation the backend provides, and the path from the contract to the `app`
  entry points has to be built consistently.
- A new display type, a new seam and a new entry point are all needed, and building them in dependency
  order avoids writing any of them twice.

## Do NOT use this skill for

- **Settling a screen's look, stories or specification** — `new-feature`. This skill stops short of them
  and hands the placed screen over.
- **One layer** — run `scaffold-model`, `scaffold-adapter` or `scaffold-route` directly.
- **Changing an existing slice** — edit it; each child refuses a path that already exists.
- **Reviewing** — `impl-review` and `test-review` are peers under `AGENTS.md`'s Review Phase Protocol.
  This skill hands the decision to the user and never invokes them.

## What this skill reads at runtime

| Source | What it decides |
| --- | --- |
| `docs/playbook.md` | The screen order this skill must not pre-empt, and who owns the gate verdict |
| `openapi/README.md` | How a contract is fetched and regenerated |
| The child skills' `SKILL.md` | What each step needs as input and what it hands back |
| `architecture.ts` — `KERNELS` | The kernel names the exit check is scoped to |

If any of these disagree with this file, **they win** — report the disagreement rather than following
this file.

## Step 0. Resolve the slice

Call `AskUserQuestion` before anything is written:

1. **Feature name** (kebab-case), and the **screen** (kebab-case) the slice will hold.
2. **The operations** (`operationId`s) the slice calls.
3. **The display types** the slice returns, and which of them more than one feature will use.
4. **The entry points** the slice needs, if any — a Route Handler for a browser-side caller, an
   `app`-level Server Action for a mutation that must assert the principal.

Detect what already exists — the feature, the screen directory, adapter modules for the operations — and
drop those steps from the plan rather than letting a child fail on them. Show the resulting chain and
confirm it.

## Step 1. Contract

Check that each operation is in `openapi/*.gen.yaml`, and that `make ai-api-gen-check` is green. <!-- skill-lint-ignore -->

- **An operation is missing** → the contract is the backend's
  ([ADR 0072](../../../docs/adr/0072-api-type-generation.md)). If the backend has not published it, stop
  and hand off. If it has, propose moving `ref` in `openapi/sources.yaml` to the commit that carries it,
  and confirm with `AskUserQuestion` before editing.
- **After a `ref` move**, run `make ai-api-fetch` then `make ai-api-gen`. Never edit `openapi/*.gen.yaml` <!-- skill-lint-ignore -->
  or `src/adapters/gen/` by hand — both are generated, and editing one is a trip wire in `AGENTS.md`. <!-- skill-lint-ignore -->
- **A regeneration changes shared schemas.** Read the diff under `src/adapters/gen/`, find every module <!-- skill-lint-ignore -->
  that imports a changed schema, and list them in the report: a change made for this slice can break a
  sibling that no test in this chain exercises.

## Step 2. Display types — `scaffold-model`

For each display type from Step 0 that will be shared, chain `scaffold-model` with its name and shape.
It may stop and say the type belongs elsewhere; carry that decision, with the section that made it, to
the step that owns the new home — Step 3 when it names the adapter module, the feature's author after
Step 4 when it names the feature.

This comes before the adapter because the adapter returns and imports these types; `model` imports
nothing from `adapters`, so the dependency runs one way.

## Step 3. Fetch seam — `scaffold-adapter`

Chain `scaffold-adapter` with the name and the operations. It places with `pnpm gen adapter`, derives
classification, port, lifetime and taint from its README, and chains `scaffold-integration-test`. **When it
hands a derivation off, the chain stops here**: every later step builds on the seam.

## Step 4. Slice home — `pnpm gen feature`

```sh
pnpm gen feature <name> --screen=<screen>
```

Skip it when Step 0 found the screen directory already there. Do not fill the generated view, stories or
page composition — the look is not settled yet, and `docs/playbook.md` puts tests and the split after the
look is reviewed. The slice's README is placed from the template; `new-feature` fills it.

## Step 5. Entry points — `scaffold-route`

For each entry point from Step 0, chain `scaffold-route` with the element, the route path and the adapter
functions. It may stop and say the element is not needed — a Server Action with no principal assertion
belongs in the feature, for example. Record that and continue.

## Step 6. Tests — `scaffold-test`

Chain `scaffold-test` once, over the units Steps 2–5 placed: the model modules, the adapter's unit side,
and any `app`-level action. **Leave out the screen's view and page composition** — their tests wait for
the look, and `new-feature` writes them. The integration tests were already chained by Steps 3 and 5.

## Step 7. Settle comments

Run `/settle-comments` once over every declaration the chain touched. It is the unconditional last step
of implementing and confirms before it writes; the children left it to this step.

## Step 8. Exit check — `arch-check`

Invoke `arch-check` in its changed-files mode: it reads the working tree against the merge base,
untracked files included, so it sees what this chain wrote without a commit and fans out only to the
kernels the chain touched. Let
`arch-check` ask its own static-verdict question. The result is **report-only** — it gates nothing here
and fixes nothing. Relay its report as it returned it, counts included.

## Step 9. Hand off

Report in Japanese:

- each step with its outcome — ran, skipped (and why), or stopped (and at what, with the hand-off);
- the files per kernel;
- the shared-schema consumers from Step 1, if any;
- the `arch-check` report, and that `type-design-reviewer` already scored the model modules in Step 2;
- **the screen**: placed but not settled — continue with `new-feature`, which picks it up at its stories;
- that `AGENTS.md`'s Review Phase Protocol asks the user, per skill, whether to run `/impl-review` and
  `/test-review`, with an estimate of each one's return — stated, not run.

**Do not commit. Do not push.** Both belong to the user, through `/commit` and `/submit-pr`.

## AI Modification Scope

Invoking this skill is the explicit instruction for the one write outside `src/` that the chain makes:
the `ref` in `openapi/sources.yaml`, after confirmation, followed by the generators that rewrite
`openapi/` and `src/adapters/gen/`. Everything else is written by the child skills under `src/`, each <!-- skill-lint-ignore -->
within its own declared scope.

## Constraints

- ✅ Run the steps in dependency order: contract → model → adapter → feature → entry points → tests →
  comments → audit
- ✅ Halt on the first step that stops, and surface its hand-off; never roll back earlier writes
- ✅ Let each child confirm its own plan
- ✅ Run `arch-check` in its changed-files mode and relay its report unfiltered
- ✅ Japanese for everything the skill emits or writes to the repository
- ❌ Write source directly — every file comes from a child or a generator
- ❌ Edit a generated file, or move the contract `ref` without confirmation
- ❌ Fill the screen's look, stories, specification or screen tests — `new-feature` owns them
- ❌ Invoke `impl-review` / `test-review`
- ❌ Add a dependency, remove a visible element, or route around either — both are stopping points in
  `AGENTS.md`, and a child that meets one stops the chain
- ❌ Run the full lint or the full suite to pre-empt the hooks and CI

## Checklist

- [ ] Slice resolved and existing parts detected; chain confirmed (Step 0)
- [ ] Operations present and generated files in sync; any `ref` move confirmed; shared-schema consumers listed (Step 1)
- [ ] `scaffold-model` → `scaffold-adapter` → `pnpm gen feature` → `scaffold-route` run in order, or halted with a hand-off (Steps 2–5)
- [ ] `scaffold-test` run once over the placed units, screen units excluded (Step 6)
- [ ] `/settle-comments` run once over the chain's declarations (Step 7)
- [ ] `arch-check` run in changed-files mode; report relayed as returned (Step 8)
- [ ] Screen handed to `new-feature`; review decision handed to the user; nothing committed (Step 9)
