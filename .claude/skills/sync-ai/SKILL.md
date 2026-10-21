---
name: sync-ai
usage-class: situational
description: >-
  Port one changed skill between Claude Code (`.claude/skills/<name>/`) and Codex
  (`.agents/skills/<name>/`) as a one-way semantic port, never a raw copy — one side is authoritative for the
  run, a transfer contract is written, and the receiving side authors the target in its own idioms:
  `/manage-skill` for Claude, a headless `codex exec` handoff for Codex. Use it after creating or materially
  updating a skill that should exist on both sides, and on 「スキルを Codex に移植して」「Codex 側と同期して」「sync-ai」.
  Do NOT use it for EN / JA translation pairs (`canonicalize-doc`), for code or docs synchronization, for
  automatic two-way merges, or to install `codex`.
argument-hint: '[skill-name] [--from=claude|codex]'
allowed-tools: Bash(ls:*), Bash(git status:*), Bash(git diff:*), Bash(pnpm exec tsx scripts/sync-ai:*), Read, Write, Glob, Grep, AskUserQuestion, Skill
---

# Sync AI

Synchronize a skill as a **one-way semantic port**, never as a raw directory copy. The source skill
is authoritative only for this run; the receiving skill stays native to its own AI environment.
**Neither side writes the other's skill directory** — a port that bypasses the receiver lands a file
in the right place with the wrong idioms, which is the failure this skill exists to prevent.

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- A skill under `.claude/skills/<name>/` was created or materially changed, and it is not
  Claude-only — port it to Codex.
- A skill under `.agents/skills/<name>/` changed and the Claude side should follow — port it to
  Claude.
- Someone asks to synchronize, migrate, port, or compare one skill across Claude and Codex.

## Do NOT use this skill for

- **EN / JA translation pairs** — `canonicalize-doc` owns `SKILL.md` ↔ `SKILL.ja.md`.
- **Implementation code or documentation synchronization.**
- **Automatic two-way merges, timestamp-based conflict resolution, or wholesale overwrite.** If both
  copies changed, a human picks the authoritative one.
- **Installing `codex`.** An unavailable CLI is a finding to report (`AGENTS.md`, *Installing
  Things*).

## What this skill does not reach

State these in every report where they apply; do not paper over them.

- **Codex cannot start a run.** The only handoff here is Claude → Codex (`scripts/sync-ai/`). No
  Codex-side `sync-ai` and no handoff that starts Claude headlessly exist, so the Codex → Claude
  direction runs only from a Claude session that reads the Codex copy as its source.
- **The Codex receiver may have no authoring workflow of its own.** The script checks whether
  `.agents/skills/manage-skill/SKILL.md` exists and tells Codex either to use it or to author the <!-- skill-lint-ignore -->
  target directly in Codex's native skill format and say so in its report. In the second case no
  receiving-side convention check ran; the report says that.
- **`codex` is not installed by anything this repository runs.** When it is not on `PATH` the script
  exits 4 and the run stops with that finding.

## Step 0. Resolve direction and unit

Confirm exactly one skill name and one direction with `AskUserQuestion`, putting any value from
`$ARGUMENTS` forward as the recommended option rather than adopting it silently:

```text
source: .claude/skills/<name>/  → target: .agents/skills/<name>/
source: .agents/skills/<name>/  → target: .claude/skills/<name>/
```

Never infer the direction from file mtimes. If both copies changed since they last matched, stop and
ask which copy is authoritative.

Read the complete source unit and the target unit if it exists. Treat `SKILL.md`, `SKILL.ja.md`, UI
metadata, `scripts/`, `references/`, `prompts/` and `assets/` as one unit. A skill whose scripts live
under the repository's `scripts/<tool>/` rather than inside the skill directory carries those scripts
as part of the unit — name them in the contract.

## Step 1. Build the transfer contract

Extract purpose, trigger and non-trigger cases, inputs, approvals, side effects, validation, and
reusable resources. Classify each item as **port**, **adapt**, or **omit**. Translate platform
mechanisms instead of copying them: Claude's `AskUserQuestion` / `Agent` / `Skill` instructions and
`allowed-tools` frontmatter must not reach Codex unchanged, and Codex delegation and tool
instructions must not become Claude syntax.

Write the contract to `tmp/skills/sync-ai/<name>-contract.md` — the only file this skill writes. Do
not create a durable third copy or a synchronization manifest.

For a Codex target the contract goes to a **headless** receiver that cannot ask anything, so
completeness is not a nicety: every question the receiver would raise is either settled in the
contract or explicitly delegated to its judgement. Resolve ambiguity with the user here, before the
handoff. State in the contract the conventions the target must follow (language, frontmatter keys,
file layout), because the receiver may have no workflow of its own that knows them.

## Step 2. Hand the contract to the receiver

**For a Claude target** (`.claude/skills/<name>/`), invoke `/manage-skill` with the contract. It
creates or updates the target in place, applies this repository's frontmatter and body rules, and
syncs `SKILL.ja.md`.

**For a Codex target** (`.agents/skills/<name>/`), confirm with `AskUserQuestion` before starting
Codex — it runs a separate paid agent that writes to the working tree. Then:

```sh
pnpm exec tsx scripts/sync-ai tmp/skills/sync-ai/<name>-contract.md
```

The script keeps the invocation posture in one place: `codex exec --sandbox workspace-write` with
`.agents/` added to the writable roots, the prompt on stdin, and a child-operation preamble — no
questions, no other agent, writes confined to `.agents/skills/<name>/` and `tmp/`. Read
`scripts/sync-ai/handoff.ts` before changing a flag.

**The recursion bound is the lease, not the preamble.** The script takes
`tmp/skills/sync-ai/.handoff.lock` before starting Codex and refuses when it is already held, so a
receiver that tries to hand off again is turned away rather than deepening the chain. An instruction
can be ignored; a chain that ignores it loops while spending money on both agents.

| Exit | Meaning | What to do |
| --- | --- | --- |
| 0 | Codex finished | Go to Step 3 |
| 2 | No contract path, or the contract is unreadable | Fix the path |
| 3 | The lease is held | Either a chain tried to recurse (the guard working), or a previous run was killed — the message names which to check and prints the path to remove |
| 4 | `codex` is not on `PATH` | Stop and report it as a finding. Do not install |
| other | Codex's own exit status | Report it with what Codex printed |

Do not delete the source skill, commit, push, publish, or change any other skill.

## Step 3. Verify and report

The receiver's summary is a claim, not evidence. Read `git status` and `git diff` over the target
directory and judge from those. **A handoff that reports success while writing nothing is the first
failure mode to check for.**

- Confirm the target preserves the source behaviour while using only mechanisms the target
  environment supports.
- Check what a diff does not show: a new bundled script's executable bit (`ls -l`), and for a Claude
  target, that `SKILL.md` and `SKILL.ja.md` have matching heading structure.
- If the receiver asks for a synchronization in the other direction, **do not start it in this
  run.** Confirm with the user first: a return trip the run starts on its own is, from the inside,
  indistinguishable from the first turn of a loop. This gate exists only at the top of the chain —
  every process below it is headless — which is why the lease, not this gate, bounds recursion.

Report in Japanese: the direction, the source commit or diff basis, the port / adapt / omit
decisions, the files changed, any intent the target cannot express, and every limitation from
*What this skill does not reach* that applied to this run.

## AI Modification Scope

This skill itself writes only `tmp/skills/sync-ai/`. Writes to a target skill directory are made by
the receiver — `/manage-skill` within its own declared scope, or Codex within the paths the
preamble names. `AGENTS.md`, Accepted ADR bodies, `LICENSE`, and everything under
`permissions.deny` stay protected throughout.

## Guardrails

- The run that starts synchronization is the top of the chain; a receiver is a child operation and
  must not start a second outbound synchronization.
- A headless receiver has no user. Never hand it a contract that depends on a question being asked,
  and never give it flags that would let it wait for an approval nobody can grant.
- Keep a platform-only skill platform-only, and report why.
- Keep transfer artifacts under the ignored `tmp/`; the only maintained copies are the two native
  skill directories.
