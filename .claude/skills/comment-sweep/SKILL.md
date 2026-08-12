---
name: comment-sweep
description: >-
  Sweep the accumulated stock of source-code comments in a chosen scope and decide, per comment, whether its content **belongs where it sits** — the jurisdiction question no other reviewer in this repository asks. Where `comment-reviewer` (inside `impl-review`) judges comments on a diff and can only answer 削除 or 書換, this skill runs over accumulated code and adds the missing verdict: **移設** — relocate a design rationale out of the comment and into the ADR or the layer README that owns it, leaving only the operative residue plus a one-line reference. Use it whenever comments feel bloated, verbose, or essay-like even though every line is individually true; when a doc comment has grown into a design argument or a rejected-alternative discussion; when the same rationale appears in both an ADR and the code that follows it; for a periodic hygiene sweep of a kernel, a feature, or `scripts/`; before a release or a fork cut where accumulated commentary would burden downstream readers; and when someone asks 「コメントが長すぎる」「コメントを整理して」「この Why はコードに置くべきか」「根拠を ADR に移したい」. It reads the comment standard at runtime — `docs/rules.md` if it grows a Comment Rules section, otherwise `AGENTS.md` plus the standard embedded in `.claude/agents/comment-reviewer.md` — and hardcodes no policy. It refuses the two classic misroutes: a library's specific behavior stays in the code, and business knowledge goes to the feature's own README, never to an ADR. It drives a per-item approval loop and performs the code **and** destination-document writes itself, so a relocated rationale never loses its home. Do NOT use it to review comments on a change you just wrote (`impl-review` with `comment-reviewer` owns diff scope), to judge README / docs prose quality (`doc-reviewer`), to fix README↔code structural drift (`sync-readme` / `back-prop`), or to review implementation or tests (`impl-review` / `test-review`).
argument-hint: '[path or kernel to sweep]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Comment Sweep

Judge accumulated comments on one question the existing reviewers cannot ask: **does this content
belong here?**

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- Comments in a directory feel bloated or essay-like even though each line is individually true.
- A doc comment has grown into a design argument, a threat-model discussion, or a rejected-alternative
  list.
- The same rationale appears in both an ADR and the code that follows it — one of the two is going to
  rot, and it will be the one nobody re-reads.
- A periodic hygiene sweep of a kernel, a feature, or `scripts/`.
- Before a release or a fork cut, where accumulated commentary becomes someone else's burden.

## Do NOT use this skill for

- **Comments on a change you just wrote** — `impl-review`'s `comment-reviewer` owns diff scope. It
  judges quality; this skill judges jurisdiction over the stock.
- **README / docs prose quality** — `doc-reviewer`.
- **README ↔ code structural drift** — `sync-readme` / `back-prop`.
- **Implementation or test review** — `impl-review` / `test-review`.

## Why this skill exists

`comment-reviewer` can answer only **削除** (the content should not exist) or **書換** (the content is
right but said badly). A third case is common and neither verdict fits: **the content is correct and
worth keeping, but it does not belong in a comment.**

That verdict is **移設**, and it cannot live in a read-only reviewer for two reasons. It requires
*writing the destination document*, which a reviewer must not do. And it is a judgment over the
accumulated stock rather than over one diff — the same rationale duplicated across an ADR and five
call sites is invisible when you only look at what changed.

## What this skill reads

Read **at runtime**. Hardcode no policy — the standard moves and this file must not become a stale
copy of it.

| Source | What it decides |
| --- | --- |
| `docs/rules.md` | **If it carries a Comment Rules section, that is the standard.** At the time of writing it does not; check rather than assume |
| `AGENTS.md` | Language Rules (comments are Japanese) and Code Style |
| `.claude/agents/comment-reviewer.md` | The content standard currently in force — What + a constraint whose premise sits at that call site, never How |
| `docs/adr/` | The candidate destinations, and what each ADR already says |
| The layer / feature `README.md` above the swept path | The other candidate destination, and its declared responsibilities |

## Step 0. Resolve the scope

Take the scope from the argument, or ask with `AskUserQuestion`:

- 「変更で触れたファイル」 — the caller passed a file list (see Chainability)
- 「1 カーネル / 1 feature」 — e.g. `src/adapters/`, `src/features/<name>/`
- 「`scripts/` の 1 ツール」
- 「パスを指定」

**Sweep one directory at a time.** A repository-wide sweep produces an approval queue nobody
finishes, and a half-finished queue is worse than none — the reader cannot tell swept from unswept.

## Step 1. Read the standard and the destinations

1. Read the comment standard (see the table above) — this run, not from memory.
2. Read the `README.md` above the scope, and the ADRs it references.
3. Read every file in scope, comments **and** the code under them. A jurisdiction call cannot be made
   from the comment alone: whether the premise sits at this call site is a fact about the code.

## Step 2. Classify every comment in scope

Four verdicts. The first three already exist; the fourth is what this skill adds.

| 判定 | When | Action |
| --- | --- | --- |
| **維持** | A correct What, or a constraint whose premise sits at that call site | Leave it |
| **削除** | How-narration, restatement, 経緯, tautology, a marker the code already satisfies | Remove |
| **書換** | Right content, wrong wording — drifted, ambiguous, or longer than the fact it delivers | Rewrite in place |
| **移設** | Correct and worth keeping, but its premise is **not** at this call site and its reversal would oblige someone to update a document | Move it to that document; leave the operative residue and a one-line reference |

**The 移設 test**: could someone make this statement false without editing this declaration? If yes,
nobody here can verify it and nothing will flag it when it turns false. Ask where it *would* be
checked — that place is its home.

### Where things go, and the two misroutes to refuse

| Content | Destination |
| --- | --- |
| A decision about structure, mechanism, or policy | The ADR that owns that area |
| What a layer / feature accepts and refuses | That directory's `README.md` |
| A constraint whose premise sits at the call site | **Stays in the code** |

Two misroutes are common enough to name:

- **A library's specific behavior stays in the code.** "This API returns `null` rather than throwing
  when the key is absent" is a fact about the call site, not a decision. Moving it to an ADR buries a
  detail the next editor needs at exactly the place they are editing.
- **Business knowledge does not go to an ADR.** Why a purchase can be cancelled before shipping is
  the feature's knowledge; it belongs in that feature's README (or the backend's contract), not in a
  record of architectural decisions. An ADR that accumulates business rules stops being readable as
  a decision log.

## Step 3. Drive the approval loop

Present the findings **grouped by verdict**, most consequential first (移設 → 削除 → 書換), each with:

- `file:line` and the comment verbatim
- the verdict and the one-sentence reason
- for 移設: the destination file, and the exact text proposed for it
- the residue proposed for the code (never leave the call site silent when a constraint remains)

Confirm with `AskUserQuestion` per group: 「この判定で適用しますか？」 / 「個別に確認したい」 /
「この分類は見送る」. A sweep that applies 40 edits on one confirmation is not reviewable.

## Step 4. Apply — code and destination together

For each approved item, write **both sides in the same step**:

1. Append the relocated rationale to the destination document, in that document's voice and section
   structure. Do not paste the comment verbatim — a comment and a document read differently.
2. Edit the code: remove the relocated prose, keep the operative residue, and add a one-line
   reference to the destination.

Never do one without the other. A rationale removed from code before its destination exists is
information destroyed, and this skill is the only thing holding both ends.

Guards that hold regardless of approval:

- **Never remove a functional directive** — `// @ts-expect-error`, `// biome-ignore …`,
  `// eslint-disable*`, `/** @jsxImportSource … */`, `// Code generated … DO NOT EDIT`, shebangs.
  (`"use client"` / `"use server"` are string directives, not comments — never touch them.)
- **Never edit a protected path.** `AGENTS.md`, `LICENSE`, and anything under
  `.claude/settings.json`'s `permissions.deny` stay untouched. Accepted ADR bodies are editable below
  v1.0.0 and are a normal destination; above it they need approval like any other ADR edit.
- **Never touch generated files** — `**/gen/**`, anything with a generated banner.
- **Do not rewrite the code's behavior.** This skill moves prose. If a comment is wrong because the
  code is wrong, report it and stop.

## Step 5. Verify

```sh
pnpm fix
pnpm lint:ci
pnpm md-lint
```

Then re-read the diff of the touched files and confirm only comments and documents changed. Behavior
must be untouched; if `git diff` shows a statement changed, that is a defect in this run.

## Step 6. Report

State per file what was 維持 / 削除 / 書換 / 移設, and where each relocation landed. Say plainly what
was **not** swept — a directory left for later, a finding deferred because it needed a design call.
An unstated omission reads as "this directory is clean" when it is not.

## Chainability

`impl-review` delegates the comment **stock** of the files a change touched to this skill, alongside
its delegation of test viewpoints to `test-review`. The division holds because the two look at
different things: `comment-reviewer` judges the comments the diff *added*, and this skill judges the
stock those files *carry*. When called that way, take the scope from the caller and skip Step 0.

## Constraints

- ✅ Read the standard and the destination documents this run
- ✅ One directory per sweep
- ✅ Approve per verdict group, not per sweep
- ✅ Write the destination document and the code in the same step
- ❌ Relocate a library's specific behavior out of the code
- ❌ Relocate business knowledge into an ADR
- ❌ Remove a functional directive, touch a generated file, or edit a protected path
- ❌ Change behavior

## Checklist

- [ ] Scope resolved to one directory (or taken from the caller)
- [ ] Standard and destination documents read this run
- [ ] Every comment in scope classified into one of the four verdicts
- [ ] Approval taken per verdict group
- [ ] Each 移設 wrote both the destination and the code residue
- [ ] `pnpm fix` / `pnpm lint:ci` / `pnpm md-lint` run
- [ ] Diff confirmed to change only comments and documents
- [ ] What was not swept stated explicitly
