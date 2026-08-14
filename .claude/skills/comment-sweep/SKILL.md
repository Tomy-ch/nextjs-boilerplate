---
name: comment-sweep
description: >-
  Sweep the accumulated stock of source-code comments in a chosen scope and decide, per comment, whether its content **belongs where it sits** — the jurisdiction question no other reviewer in this repository asks. Where `comment-reviewer` (inside `impl-review`) judges comments on a diff and can only answer 削除 or 書換, this skill runs over accumulated code and adds the missing verdict: **移設** — relocate a design rationale out of the comment and into the ADR or the layer README that owns it, leaving only the operative residue plus a one-line reference. Use it whenever comments feel bloated, verbose, or essay-like even though every line is individually true; when a doc comment has grown into a design argument or a rejected-alternative discussion; when the same rationale appears in both an ADR and the code that follows it; for a periodic hygiene sweep of a kernel, a feature, or `scripts/`; before a release or a fork cut where accumulated commentary would burden downstream readers; and when someone asks 「コメントが長すぎる」「コメントを整理して」「この Why はコードに置くべきか」「根拠を ADR に移したい」. It reads the comment standard at runtime — `docs/rules.md` if it grows a Comment Rules section, otherwise `AGENTS.md` plus the standard embedded in `.claude/agents/comment-reviewer.md` — and hardcodes no policy. It refuses the two classic misroutes: a library's specific behavior stays in the code, and business knowledge goes to the feature's own README, never to an ADR. It then applies the result in one of three modes, picked in Step 0 or fixed by a flag — 確認して適用 (default; approval per verdict group, then write), 自動適用 (`--apply`; writes 削除 / 書換 with no approval prompt and withholds every 移設 that needs a document write, because creating an ADR is a call `AGENTS.md` reserves for a prior user instruction and a no-question mode has no way to ask it), and 報告のみ (`--report-only`; renders every finding in full and writes nothing) — performing the code **and** destination-document writes itself, so a relocated rationale never loses its home. It is also the delegation target of `impl-review`: its Step 6 chains here with a `scope` / `mode` / `base_ref` / `hold` / `claimed` payload that skips the Step 0 questions and returns the report for the caller to embed. Do NOT use it to review comments on a change you just wrote (`impl-review` with `comment-reviewer` owns diff scope), to judge README / docs prose quality (`doc-reviewer`), to fix README↔code structural drift (`sync-readme` / `back-prop`), or to review implementation or tests (`impl-review` / `test-review`).
argument-hint: '[path or kernel to sweep] [--apply | --report-only]'
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

## Step 0. Resolve the scope and the apply mode

One `AskUserQuestion` call carrying **two** questions. Skip whichever one the argument, a flag, or a
caller payload (see Chainability) has already answered; skip the call entirely when both are fixed.

- 「comment-sweep の対象スコープを選んでください」
  - 「変更で触れたファイル」 — the caller passed a file list (see Chainability)
  - 「1 カーネル / 1 feature」 — e.g. `src/adapters/`, `src/features/<name>/`
  - 「`scripts/` の 1 ツール」
  - 「パスを指定」
- 「検出結果をどう適用しますか？」
  - 「判定の束ごとに確認して書き換える」 ← default
  - 「そのまま書き換える（確認を取らない。文書書き込みを伴う移設は対象外）」
  - 「報告のみ（書き込まない）」

**Sweep one directory at a time.** A repository-wide sweep produces an approval queue nobody
finishes, and a half-finished queue is worse than none — the reader cannot tell swept from unswept.

### Apply modes

| Mode | Selected by | What Steps 3–4 do |
| --- | --- | --- |
| 確認して適用 | the default option, or `mode: confirm` | Step 3 takes approval per verdict group, then Step 4 writes — every verdict is reachable |
| 自動適用 | `--apply`, or the second option | Step 4 writes 削除 / 書換 with no approval prompt; a 移設 that needs a document write is reported, not applied |
| 報告のみ | `--report-only`, or `mode: report` | Step 3 renders the findings in full and the run ends; nothing is written |

### Flags

- `--apply` — 自動適用. Fixes the mode, so the mode question is not asked.
- `--report-only` — 報告のみ. Detect and report; never write.
- Both at once is a contradiction, not a precedence puzzle: say so and fall back to the mode
  question rather than silently picking one.

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

Classification is **mode-independent**. Produce every finding, in full, whatever Step 0 resolved —
the entire difference between the three modes lives in Steps 3–5. A run that classified less because
it was only going to report would quietly disagree with a run that classified in order to apply, and
nothing exists to detect that drift.

## Step 3. Drive the approval loop

Present the findings **grouped by verdict**, most consequential first (移設 → 削除 → 書換), each with:

- `file:line` and the comment verbatim
- the verdict and the one-sentence reason
- for 移設: the destination file, and the exact text proposed for it
- the residue proposed for the code (never leave the call site silent when a constraint remains)

In **確認して適用**, confirm with `AskUserQuestion` per group: 「この判定で適用しますか？」 /
「個別に確認したい」 / 「この分類は見送る」. A sweep that applies 40 edits on one confirmation is not
reviewable. In **自動適用**, take no confirmation here — Step 4 states afterwards what it wrote.

**In 報告のみ the run ends here**, and the grouped summary above is not enough on its own. Render
every non-`維持` finding in full — the evidence, the comment before and after, and for a 移設 the
exact prose proposed for the destination — because no approval loop follows to reveal them one at a
time. Close by saying how to act on the report: re-run with `--apply` for the 削除 / 書換, or in
確認して適用 for those plus the 移設.

## Step 4. Apply — code and destination together

Not reached in 報告のみ. Between the other two modes the write itself is identical; what differs is
who approves it, and how much of the verdict set is in play.

### 自動適用 — no approval prompt

Apply **削除** and **書換** as Step 2 classified them, in one pass, and report what was written. Two
exclusions come off that set first:

- **A finding whose comment contradicts the code** is reported, never applied. Which side is wrong —
  the comment or the code — is not a comment-cleanup call, and deleting the comment can erase the
  only surviving evidence of a bug. The guard below already says to stop there; unattended, it is
  the difference between a report and a defect nobody hears about again.
- **A 移設 whose destination already states the content** is applied only after opening that document
  and confirming the content is actually there. With a human in the loop that claim is checked at
  approval time; unattended, a misread section would strip the rationale out of the code and point
  the residue at a document that never says it. When the check fails, report the finding instead of
  applying it. A 移設 that survives the check writes no document — it is really a shortening down to
  the residue plus a reference.

**Do not apply a 移設 that would write to a destination document.** Report those with their count and
proposed landing form, and say that 確認して適用 is where they land. The reason is not caution in
general: `AGENTS.md`'s *AI Modification Scope* permits editing `docs/adr/BACKLOG.md` but reserves
**ADR file creation for a prior user instruction**, and whether a rationale becomes a new record or a
rewrite of an existing one is exactly that call. A mode whose contract is "no questions" has no way
to ask it. Keeping that one question alive would break the contract; answering it silently would
settle a repository-policy question by generator.

Every guard below still holds. 自動適用 removes the prompt, not the rules.

### 確認して適用 — write what each approved group asked for

For each approved item, write **both sides in the same step**:

1. Append the relocated rationale to the destination document, in that document's voice and section
   structure. Do not paste the comment verbatim — a comment and a document read differently.
2. Edit the code: remove the relocated prose, keep the operative residue, and add a one-line
   reference to the destination.

Never do one without the other. A rationale removed from code before its destination exists is
information destroyed, and this skill is the only thing holding both ends.

Guards that hold regardless of approval or mode:

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

Run this only when something was written. 報告のみ has nothing to verify; 自動適用 needs it most,
because nobody read the edits one at a time.

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

In **自動適用**, name every finding that was withheld and why — a comment that contradicts the code, a
移設 that needs a document write, a 移設 whose destination could not be confirmed. A withheld finding
that goes unmentioned reads as one that was never raised.

## Chainability

`impl-review` is this skill's caller: its Step 6 delegates the comment **stock** of the files a
change touched, alongside its delegation of test viewpoints to `test-review`. The division holds
because the two look at different things: `comment-reviewer` judges the comments the diff *added*,
and this skill judges the stock those files *carry*. The two must never report the same comment — a
comment on a changed line is `comment-reviewer`'s, and the caller names those in the `claimed`
payload below.

A caller passes a context payload with:

- `scope` — the pre-resolved file list (skips the Step 0 scope question).
- `mode` — `confirm` or `report` (skips the Step 0 mode question). `apply` is **not** passed on this
  path. A review run that rewrites the tree with no approval prompt contradicts the caller's own
  structure, in which every reviewer is read-only on source and every write is gated on an explicit
  confirmation.
- `base_ref` — when the caller resolved the scope as a branch-vs-base diff.
- `hold` — files the caller is holding back because one of its own findings is likely to rewrite
  them. Exclude them from the approval loop and name them in the returned report: a comment polished
  onto code that is about to change is work done twice.
- `claimed` — the `path:line` of every comment the caller's own reviewer already owns. Drop them
  **before** the approval loop opens, so the user is never asked about one comment twice. One
  exception: when the verdict here is **移設** and the caller's is 削除 / 書換, keep the 移設 and say
  so in the report. 移設 already contains the shortening the caller wanted, while the reverse is not
  true — dropping it would discard the only verdict that can move a rationale to the document that
  owns it.

Under a payload the report is returned for the caller to embed rather than rendered as a standalone
deliverable, and it keeps this skill's verdict vocabulary (維持 / 削除 / 書換 / 移設) — the caller does
not remap it.

## Constraints

- ✅ Read the standard and the destination documents this run
- ✅ One directory per sweep
- ✅ Classify every comment in full whatever the mode — the mode changes Steps 3–5, never Step 2
- ✅ In 確認して適用, approve per verdict group, not per sweep
- ✅ Write the destination document and the code in the same step
- ✅ In 報告のみ, render every non-`維持` finding in full and write nothing
- ❌ Apply a 移設 that writes a destination document while in 自動適用
- ❌ Apply a finding whose comment contradicts the code, in any unattended mode
- ❌ Relocate a library's specific behavior out of the code
- ❌ Relocate business knowledge into an ADR
- ❌ Remove a functional directive, touch a generated file, or edit a protected path
- ❌ Change behavior

## Checklist

- [ ] Scope and apply mode resolved (from the argument, a flag, the caller payload, or Step 0)
- [ ] Standard and destination documents read this run
- [ ] Every comment in scope classified into one of the four verdicts, mode-independently
- [ ] 確認して適用: approval taken per verdict group / 自動適用: withheld findings named
- [ ] 報告のみ: every non-`維持` finding rendered in full and nothing written
- [ ] Each applied 移設 wrote both the destination and the code residue
- [ ] Under a payload: `hold` files excluded, `claimed` comments dropped before the approval loop
- [ ] `pnpm fix` / `pnpm lint:ci` / `pnpm md-lint` run when something was written
- [ ] Diff confirmed to change only comments and documents
- [ ] What was not swept stated explicitly
