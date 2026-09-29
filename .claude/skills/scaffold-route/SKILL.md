---
name: scaffold-route
usage-class: situational
description: >-
  Scaffold one `app` entry point that is not a screen — a Route Handler (`route.ts`) as a thin proxy over
  `adapters`, or an `app`-level Server Action (`actions.ts`) that asserts the principal itself — shaped to pass
  the `app` audit: element, allowed imports, `test-requirement` and the `## 監査の観点` rows are read from
  `src/app/README.md`, `src/app/api/README.md` and ADR 0025 at runtime. Chains the matching test skill. Use it
  when the browser needs a same-origin endpoint, when a mutation needs a principal assertion features cannot
  reach, when `scaffold-slice` reaches its route step, or on 「route handler を足したい」「主体の断言が要る Server
  Action を置きたい」. Do NOT use it for a page or layout (`new-feature`), or a feature-local Server Action.
argument-hint: '[route-handler|server-action] [route path]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Skill
---

# Scaffold Route

Place one `app` element that is an entry point rather than a screen, and shape it so that the `app`
audit has nothing to report.

`app` holds several elements with different rights, and the element is decided by the path and file name
together ([ADR 0025](../../../docs/adr/0025-app-layer-elements.md)). This skill covers the two that carry
a request into the rest of the tree: the **Route Handler** and the **`app`-level Server Action**. `pnpm gen`
has no kind for either, so the placement is derived here from the READMEs — and the first thing derived is
whether the element is needed at all.

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- The browser has to reach something through the same origin — a continuation fetch, a counterpart it
  cannot call directly — and no Route Handler serves it yet.
- A mutation must assert the principal inside the action, which only `app` can do, and no `app`-level
  `actions.ts` for that route exists yet.
- `scaffold-slice` reached its route step and passed the element and the adapter functions in context.

## Do NOT use this skill for

- **A route segment** (`page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx`) — a page settles a look and
  carries a specification ([ADR 0143](../../../docs/adr/0143-spec-driven-development.md)); `new-feature` owns
  that order.
- **A Server Action that needs no principal assertion** — it stays in the feature
  (`src/features/<name>/<screen>/actions.ts`), and the feature's author writes it. Step 1 settles which.
- **Metadata files** (`sitemap.ts` / `robots.ts` / images) — a different element with different rights.
- **Changing an existing handler or action** — edit it directly.
- **Writing the tests by hand** — Step 6 chains the skill that owns each.

## What this skill reads and writes

Read **at runtime**. Where these and this file disagree, the sources win and the disagreement is
reported.

| Source | What it decides |
| --- | --- |
| [ADR 0025](../../../docs/adr/0025-app-layer-elements.md) | The element table — which file is which element, what each may import, and which rows the machine enforces |
| `src/app/README.md` — frontmatter, `## 運用`, `## 監査の観点` | `forbidden` tags, which `test-requirement` each element is held to, and the rows the element must satisfy |
| `src/app/api/README.md` | What a Route Handler accepts and refuses, and where its failure responses are built |
| `architecture.ts` — `APP_ELEMENTS` | The per-element import restriction the boundary check applies |
| `src/adapters/server/http/` | The request-side helpers a handler validates input and builds failures with |
| `docs/playbook.md` — 逆引き | Where a Server Action goes first, and when it moves to `app` |
| A sibling element of the same kind | The concrete shape; on conflict the READMEs win |

Writes one `route.ts` or one `actions.ts` under `src/app/`. Nothing else.

## Step 0. Resolve the subject

From the argument, from `scaffold-slice`'s context, or with `AskUserQuestion`:

1. **Element** — Route Handler or Server Action.
2. **Route path** — where it answers, in the `src/app/` tree.
3. **What it calls** — the adapter functions (they must exist; otherwise `scaffold-adapter` first).
4. **Who calls it** — for a Route Handler, which client; for a Server Action, which form.

## Step 1. Decide whether the element is needed, and which

Read ADR 0025, `src/app/README.md` and `src/app/api/README.md` in full, and the reverse-index row in
`docs/playbook.md` for Server Actions.

- **Route Handler**: `src/app/api/README.md` lists what a handler accepts. A server-rendered screen that
  only needs data calls the adapter from the feature; it does not need a handler. When none of the
  accepted cases applies, say so and stop.
- **Server Action**: ADR 0025 decides the home by whether the action needs a principal assertion. When it
  does not, it belongs in the feature — say so and stop; `scaffold-slice` passes that to the feature step.
- **A route segment** asked for through this skill: stop and point at `new-feature`.

A stop here is a result, not a failure. Report which section decided it.

## Step 2. Plan against the audit rows

Read the frontmatter and the `## 監査の観点` table of `src/app/README.md`. Keep only the rows whose subject
is this element — a row about route segments does not bind a handler — and say which rows were set aside
and why. Build the plan as a table with **one line per kept row**:

| Row (観点) | How the element stays inside it |
| --- | --- |

- A row whose 根拠 starts with `機械:` is enforced by a gate. Plan so it would not trip; do not re-judge it.
- Every other row gets a concrete answer — for a handler, what it validates and which helper builds its
  failures; for an action, **where the principal assertion is called inside each exported action** and
  what it checks.
- A `forbidden` tag with no row is a gap in the README; plan against the tag and report the gap.

Add the file path, the exported symbols, the adapter functions called, and the tests Step 6 will produce.
Confirm with `AskUserQuestion`: 「この計画で置きますか？」 / 「修正したい」 / 「キャンセル」.

## Step 3. Write the element

- **Route Handler**: validate the input, call the adapter, return what it returns. Build failures with
  the helper `src/app/api/README.md` names, not inside the handler. Do not change the runtime. No raw
  `fetch`, no business decision, no aggregation.
- **Server Action**: `"use server"`; every exported action calls the principal assertion before doing
  anything else, never relying on the screen that rendered the form being protected. Read no server
  config. Return the result shape the feature's form expects.
- **Write no comments.** Step 7 decides which ones the element earned.
- **No new dependency.** If the element cannot be written without one, stop: adding a dependency is a
  stopping point owned by [ADR 0004](../../../docs/adr/0004-library-management.md).
- **Remove nothing a user can see.** An entry point replacing or reshaping an existing visible flow is a
  stopping point (`docs/rules.md`, *作業とエージェント*); stop and ask.

## Step 4. Check the written element against the plan

Read the file back against the Step 2 table, row by row, and fix any line that drifted from its answer
before any test is written. This is the author's check, not the audit — `arch-check` is, and
`scaffold-slice` runs it at its end.

## Step 5. Declare what changed at the boundary

A new Route Handler is a new edge where the tree meets the outside, and `docs/design/context-map.md`
records those edges. Name the new one in the report so `context-map` can add it; this skill does not
write the map.

## Step 6. Tests

`src/app/README.md` says which declaration each element is tested under; read it rather than assuming.

- **Route Handler**: chain `scaffold-integration-test` on the new `route.ts`.
- **Server Action**: standalone, chain `scaffold-test` on the new `actions.ts`. From `scaffold-slice`,
  leave it — the orchestrator runs `scaffold-test` once over the whole slice.

## Step 7. Settle comments and hand off

Standalone, run `/settle-comments` over the declarations written here; it is the unconditional last step
of implementing and confirms before it writes. From `scaffold-slice`, the orchestrator runs it once.

Report in Japanese: the element and its path, the Step 1 decision with its source, the audit-row table
with the rows set aside, the tests produced, and any README gap. Do not commit.

## Constraints

- ✅ Decide from ADR 0025 and the READMEs whether the element is needed, and stop when it is not
- ✅ Answer every applicable `## 監査の観点` row in the plan, and confirm the plan before writing
- ✅ Assert the principal inside every exported `app`-level action
- ✅ Chain `scaffold-integration-test` for a Route Handler
- ❌ Write a route segment, a metadata file, or a feature-local action
- ❌ Put a raw `fetch`, a business decision, or response building inside a handler
- ❌ Write comments while writing the code
- ❌ Add a dependency, remove a visible element, or route around either
- ❌ Restate a README row or an ADR rule in this file

## Checklist

- [ ] Element, route path, adapter functions and caller resolved
- [ ] Need and home decided from ADR 0025 / the READMEs; stopped when not needed
- [ ] Plan answers every applicable audit row; set-aside rows named; README gaps reported; plan confirmed
- [ ] Element written without comments; principal asserted in every exported action
- [ ] Boundary change named in the report
- [ ] Test skill chained per element (or left to `scaffold-slice` for an action)
- [ ] `/settle-comments` run (standalone) or left to `scaffold-slice`; nothing committed
