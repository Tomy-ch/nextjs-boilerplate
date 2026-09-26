---
name: settle-comments
usage-class: frequent
description: >-
  Settle what a change earned in comments — the unconditional last step of implementing. Judges the whole
  comment block of every declaration the change touched: deletes what an evaluator already carries, writes the
  residue the implementation did not, authors the required TSDoc frame every named function lacks, and decides
  which single site owns a Why written in several. Use it at the end of every implementation, and on
  「コメントが長すぎる」「コメントを整理して」「この Why はコードに置くべきか」「根拠を ADR に移したい」. Its bulk mode sweeps a kernel or `scripts/`. **Not a
  review** — it finishes a change rather than auditing one, so it is never estimated beside `/impl-review` and
  `/test-review`. Do NOT use it for docs prose (`doc-reviewer`), README↔code drift (`sync-readme` / `back-
  prop`), or implementation and tests.
argument-hint: '[scope] [--bulk] [--apply | --report-only]'
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Agent
---

# Settle Comments

Decide what a change earned in comments. **The implementation writes none** (`AGENTS.md`, *Task
Execution Protocol*), so this pass is where every comment in the change is settled — both directions:
what comes out, and what finally gets written.

It asks one question the existing reviewers cannot: **does this content belong here, given what
already carries it?**

A Japanese reference translation of this skill is available at `SKILL.ja.md` in the same directory
(not loaded as a skill; for human reference only).

## When to Use

- **At the end of every implementation, unconditionally.** The change is unfinished until this has
  run — not unreviewed. Nothing here is estimated or put to the user as a cost; what *is* confirmed
  is each group of verdicts before it is written.
- Comments in a directory feel bloated or essay-like even though each line is individually true.
- A doc comment has grown into a design argument, a threat-model discussion, or a rejected-alternative
  list.
- The same rationale appears in both an ADR and the code that follows it — one of the two is going to
  rot, and it will be the one nobody re-reads.
- A periodic hygiene sweep of a kernel, a feature, or `scripts/`.
- Before a release or before a repository is created from this template, where accumulated commentary becomes someone else's burden.

## Do NOT use this skill for

- **README / docs prose quality** — `doc-reviewer`.
- **README ↔ code structural drift** — `sync-readme` / `back-prop`.
- **Implementation or test review** — `impl-review` / `test-review`.
- **Deciding whether to run at all.** There is no such decision: see the first bullet above.

## Why this skill exists

**Writing a comment while generating code is not a judgment that the declaration needed one.** It is a
by-product of generating the code, produced at every declaration a model touches because prose is
free to it. So the implementation writes none, and the judgment happens here instead — in a pass whose
job is deciding rather than producing. That separation is the point: the same statement that steers a
model 75–100 % of the time while it generates does not steer it while it inspects.

Two consequences follow, and together they are why this is not a sweep.

**It removes.** A reader who judges comments one change at a time can answer only **削除** (the content
should not exist) or **書換** (the content is right but said badly). Two further cases are common and
neither verdict fits. The content may be correct, valuable, and **already carried by something that
falls when it stops being true** — a test, a type, a rendered story — in which case the comment is a
copy that rots while the original stays right (**不要**). Or it may be correct and worth keeping, but
belong somewhere other than a comment.

That verdict is **移設**, and it cannot live in a read-only reviewer for two reasons. It requires
*writing the destination document*, which a reviewer must not do. And it is a judgment over the
accumulated stock rather than over one diff — the same rationale duplicated across an ADR and five
call sites is invisible when you only look at what changed.

**It also writes.** Since the implementation deliberately left every declaration bare, whatever the
change genuinely earned does not exist yet, and nothing else will write it (**著述**). Two kinds reach
this pass unwritten: the residue that only a comment can carry — a caller's obligation, a deliberate
absence, an assumption held elsewhere — and the **required TSDoc frame** of every named function —
the summary and the tags `docs/rules.md` 「コメントと文書」 makes mandatory, whatever the
function's visibility or nesting. The frame is read in the hover of whoever calls or edits the
function, and Storybook's autodocs renders it for a part with a story, so it is a deliverable rather
than a note. **A named function without it is incomplete**, and 著述 is not optional there.

The two differ in where the text comes from. The residue comes only from what the implementation
established, so it may not exist. The frame describes what the declaration does, which the signature
and the body supply, so it always exists.

This is why the skill is not named for sweeping. Half its work adds.

### The second question: what one comment at a time cannot see

Jurisdiction is asked of a single comment, and that leaves a blind spot of the same shape. When one
Why is written at three declarations, **each copy passes the jurisdiction test on its own** — each is
non-obvious, each sits at the site whose premise it states, each is individually defensible. Judged
one at a time they are three 維持. The redundancy exists only in the relation between them, so a
per-comment pass cannot find it however carefully it is run.

So every sweep asks a second question of each file's comment stock as a unit:

> **Is this content already carried somewhere else in this file, and if so, which single site owns it?**

Three shapes answer to it, and none is reachable per comment:

- **重複** — one Why restated at several declarations. One site owns the concept; the rest shrink to a
  pointer.
- **分散** — a constraint split across declarations so that no single place states it and a reader has
  to assemble it. The fix is to make one site whole, never to add another fragment.
- **総量過多** — every comment is individually correct, yet the file's total commentary costs more to
  read than the code it explains.

This is the same trap as the diff-scope one, one level down: the argument for keeping each copy wins
every time it is asked in isolation, so nothing ever consolidates. Ask it of the set instead.

### The exception: a general-purpose part's public doc

**A reusable part that knows nothing about the subject matter is exempt from 集約, and only from
集約.** Its public doc comment and its own `README.md` are allowed to say the same thing.

The reason is who reads them. A consumer of a design-system part meets it at the call site, through
the editor's hover, and cannot be assumed to have opened the README — nor should they have to, to
learn what a prop means. A README, meanwhile, is where someone browsing the catalogue decides whether
this part is the one they want. **Both are entry points, and neither may assume the other was read.**
Shrinking one to a pointer serves the file's tidiness at the cost of the reader the doc exists for.

So for a part under a general-purpose kernel (`src/components/**` and anything else whose
`README.md` describes a part rather than a feature):

- **Redundancy between the doc and that part's README is intended, not drift.** Do not raise it.
- **A contradiction between them is still a finding**, and a `誤り/陳腐化` — when the two disagree,
  one of them lies to somebody. Say which side matches the code.
- **削除 / 書換 / 移設 / 不要 are unaffected.** How-narration is still How-narration, and a decision
  that belongs to an ADR still belongs there.
- **著述 is unaffected too.** The required frame is written here exactly as for any other named
  function; the exemption licenses only the duplication with the part's own README.

**The exemption covers how to call the part, not why it is built that way.** A prop's meaning, the
composition a caller must respect, the constraint that breaks the part when ignored — those are what
the hover exists for, and their duplication with the README is intended. The responsibility argument
is not: which client boundary the part sits on, why a capability was deliberately excluded, what the
layer's split is. **Those fail the 前提の所在 test against the declaration** — someone changes them
without touching this file — and the README owns them. A doc comment that has grown to carry them is
a 移設 like any other, exemption or not.

This does not license a comment to repeat itself *inside one declaration's own doc*: a reader sees
that at once, so the copies help nobody. The exemption is about two documents with two audiences,
not about volume.

## What this skill reads

Read **at runtime**. Hardcode no policy — the standard moves and this file must not become a stale
copy of it.

| Source | What it decides |
| --- | --- |
| `docs/rules.md` 「コメントと文書」 | **The comment standard** — what a comment is and is not, and the named misroutes |
| `docs/README.md` 「2 つのテスト」 | The 前提の所在 test and the 管轄 test that the verdicts below apply |
| `AGENTS.md` | Language Rules (comments are Japanese) |
| `.claude/agents/comment-reviewer.md` | The reviewer that applies the standard to one comment; the same lens this skill's pass 1 uses |
| `docs/adr/` | The candidate destinations, and what each ADR already says |
| The layer / feature `README.md` above the swept path | The other candidate destination, and its declared responsibilities |

## Step 0. Resolve the scope and the apply mode

Stamp the boundary this run crosses before anything else: `.agents/closed-loop/marks.sh reviewStartedAt`.

**When this runs as the last step of an implementation — the default — the scope is not a question.**
It is the declarations the change touched, judged whole: resolve the base with
`gh pr view --json baseRefName -q .baseRefName`, falling back to `make -s base-branch`, and never
`gh repo view --json defaultBranchRef`. Ask only the apply-mode question, and default it to
確認して適用. Asking a scope question here would imply a choice the protocol does not offer.

Every other entry point resolves a scope explicitly. One `AskUserQuestion` call carrying **two**
questions; skip whichever the argument or a flag already answers, and skip the call entirely when
both are fixed.

- 「settle-comments の対象スコープを選んでください」
  - 「変更で触れたファイル」 — the default above, stated explicitly
  - 「1 カーネル / 1 feature」 — e.g. `src/adapters/`, `src/features/<name>/`。`--bulk` はこれを指す
  - 「`scripts/` の 1 ツール」
  - 「レビュー指摘への対応分」 — 前回レビューの最終コミット `...HEAD` が触れたファイルを、**丸ごと**。反映そのものが未レビューである（`AGENTS.md` の Review Phase Protocol）
  - 「パスを指定」
- 「検出結果をどう適用しますか？」
  - 「判定の束ごとに確認して書き換える」 ← default
  - 「そのまま書き換える（確認を取らない。文書書き込みを伴う移設は対象外）」
  - 「報告のみ（書き込まない）」

**Sweep one directory at a time.** A repository-wide sweep produces an approval queue nobody
finishes, and a half-finished queue is worse than none — the reader cannot tell swept from unswept.

### Where this runs

**The per-change pass runs in this session, never in a subagent.** A constraint the implementation
discovered — that a caller must clear the cookie, that a capability was left out on purpose — exists
only in the context that just wrote the code. Hand the pass to an agent that did not write it and
著述 has nothing to write from; it would re-derive from the code and produce something thinner than
what was known a moment ago.

**`--bulk` is the opposite case and delegates.** Sweeping a kernel that predates this pass carries no
such context to lose, and reading a whole kernel into this session is exactly the pollution the
protocol exists to avoid. Fan `comment-reviewer` out over the files, one agent per file or per
directory, and run the approval loop here on what comes back.

### Apply modes

| Mode | Selected by | What Steps 3–4 do |
| --- | --- | --- |
| 確認して適用 | the default option, or `mode: confirm` | Step 3 takes approval per verdict group, then Step 4 writes — every verdict is reachable |
| 自動適用 | `--apply`, or the second option | Step 4 writes 削除 / 書換 / high-confidence 集約 with no approval prompt; a 移設 that needs a document write is reported, not applied |
| 報告のみ | `--report-only`, or `mode: report` | Step 3 renders the findings in full and the run ends; nothing is written |

### Flags

- `--bulk` — sweep a kernel that predates this pass, delegated per *Where this runs*. Implies a scope
  question rather than the per-change default, and never runs 著述 for a residue it cannot know. It
  does run 著述 for a missing frame — the code it reads is that text's source.
- `--apply` — 自動適用. Fixes the mode, so the mode question is not asked.
- `--report-only` — 報告のみ. Detect and report; never write.
- Both at once is a contradiction, not a precedence puzzle: say so and fall back to the mode
  question rather than silently picking one.

## Step 1. Read the standard and the destinations

1. Read the comment standard (see the table above) — this run, not from memory.
2. Read the `README.md` above the scope, and the ADRs it references.
3. Read every file in scope, comments **and** the code under them. A jurisdiction call cannot be made
   from the comment alone: whether the premise sits at this call site is a fact about the code.

## Step 1.5. Scan for repetition across files (mechanical)

Pass 2 asks its question of one file's stock. The same Why written once in every `adapters` client,
once in every feature's `actions.ts`, once in every `scripts/` tool is invisible to it — no per-file
pass can see across files, and every copy already passed jurisdiction on its own, which is why nobody
had noticed.

Collect the comment lines of every file in scope, normalise away the leading marker and indentation,
drop lines shorter than a clause, and report any text that appears at declarations in **more than one
file**:

```sh
for f in <files in scope>; do
  grep -hE '^[[:space:]]*(//|\*|#)' "$f" \
    | sed -E 's@^[[:space:]]*(//+|\*|#)[[:space:]]?@@' \
    | awk -v f="$f" 'length($0) > 30 { print f "\t" $0 }'
done | sort -t$'\t' -k2 \
  | awk -F'\t' '{ n[$2]++; src[$2] = src[$2] "\n    " $1 }
                 END { for (k in n) if (n[k] > 1) print "[" n[k] "] " k src[k] }'
```

The `grep` is load-bearing: without it the pipeline clusters code and blank lines too and reports one
enormous meaningless cluster. The `\*` arm catches JSDoc continuation lines, which is where this
repository's rationale usually sits.

The exact pipeline matters less than the property: it is **deterministic and cheap**, so it runs on
every sweep rather than when someone suspects duplication. Tune the length floor to the scope — too
low and boilerplate one-liners dominate, too high and a one-line Why slips through.

**Scan only the files Step 0 resolved.** Widening it to the repository breaks the one-directory rule
and produces clusters nobody in this run can act on.

Each cluster is then resolved by the Step 2 verdicts: jurisdiction first — usually 移設 or 書換 at
every site — and 集約 across files only when one declaration genuinely owns the concept. **A cluster
is a finding even when every member is individually correct.** That is the whole point.

## Step 2. Classify every comment in scope

Run **both passes** over the same files. They find different things and neither substitutes for the
other: pass 1 asks jurisdiction of each comment, pass 2 asks ownership of each file's stock. Pass 2
reads no extra material — what it adds is a question — so run it on every file, including the ones
where pass 1 found nothing. A file whose comments are all individually fine is exactly where
duplication hides.

Seven verdicts. Three are ordinary comment review; **不要**, **移設**, **集約** and **著述** are what
this skill adds.

| 判定 | Pass | When | Action |
| --- | --- | --- | --- |
| **維持** | 1 | A correct What, or a constraint that passes the 前提の所在 test | Leave it |
| **削除** | 1 | How-narration, restatement, 経緯, tautology, a marker the code already satisfies | Remove |
| **不要** | 1 | Correct and worth knowing, but something that **falls when it turns false** already carries it — a type, a test case, a rendered story, a generator's input | Remove, **naming the 正本**. A finding without that name is not a 不要. Never raised against the required TSDoc frame — the frame is written whatever else carries the fact |
| **書換** | 1 | Right content, wrong wording — drifted, ambiguous, or longer than the fact it delivers — or a surviving sentence not yet in the shape `docs/rules.md` requires | Rewrite in place |
| **移設** | 1 | Correct and worth keeping, but it fails the 前提の所在 test and the 管轄 test names a document | Move it to that document; leave the operative residue and a one-line reference **to the README** |
| **集約** | 2 / 1.5 | The same content is carried at several sites — in one file, or across the files in scope when Step 1.5 clustered it (重複 / 分散 / 総量過多). **Not raised for a general-purpose part's public doc vs. its own README** — see the exception above | One site keeps it; the rest shrink to a pointer |
| **著述** | 1 | The declaration carries a constraint only a comment can hold and has none, because the implementation wrote none — or a named function lacks part of the required TSDoc frame `docs/rules.md` defines | Write it |

**不要 before 書換.** A comment worth shortening is not worth shortening if something else already
states it; ask what carries it before deciding how to word it.

**著述 is the one verdict with no comment to quote**, so it is stated as the declaration plus the text
being written and where that text came from. The two kinds of 著述 source it differently:

- **The frame** — the summary and the mandatory tags — describes what the declaration does, and the
  signature and the body are its source. Which declarations are in scope, which tags are mandatory and
  which are written only when they apply is `docs/rules.md` 「コメントと文書」's to say; read it
  this run rather than from memory. The frame always exists, so a named function without it is never
  in its correct state.
- **The residue** — a caller's obligation, a deliberate absence, an assumption held elsewhere — is
  what the implementation established, not what the code can be read to imply. **When the fact cannot
  be sourced, there is no residue 著述.** Do not invent a constraint to fill the space the frame
  leaves.

Weight the prose the way `docs/rules.md` does: `@remarks` states in summary what the declaration takes
on, and an inline comment is kept to the minimum — it appears in no hover and no Storybook page, so
when it turns false nobody sees it. `@example` is written where the rules say it earns its place (a
complex role, several uses), not by default.

**The 移設 test**: could someone make this statement false without editing this declaration? If yes,
nobody here can verify it and nothing will flag it when it turns false. Ask where it *would* be
checked — that place is its home.

**A comment is reported once.** When a comment is both individually shortenable and a member of a
集約 set, the **集約 wins** and absorbs the shortening — otherwise the same line is put to the user
twice under two verdicts that partly contradict each other.

### What a 集約 finding must contain

集約 is the only verdict whose subject is a **set**, and everything below is what makes the set
decidable as one unit. A 集約 missing any of it is not reviewable:

1. **The shape** — 重複 / 分散 / 総量過多. They fail differently, so the shape is what tells the
   reviewer what to check.
2. **Every member** — each `file:line` and its comment in full. Not only the site you propose to
   keep: a consolidation cannot be judged from the winner alone.
3. **The owning site, with evidence** — which declaration keeps the content, and *why that one*. The
   test is ownership of the concept, not comment length or file order: the site a reader arrives at
   first when they ask the question the comment answers. A wrong pick is the expensive failure here,
   because the other sites are already shrunk by the time it shows.
4. **The consolidated wording** — the full text the owning site will carry. It must cover what the
   shrunk sites gave up; a consolidation that quietly drops one member's distinct fact is a deletion
   wearing another verdict's name.
5. **Each pointer** — the exact residue left at every other site. A bare 「詳細は上記参照」 is not a
   pointer; name the declaration, so a reader who jumped straight to that line can navigate. When the
   owning site is in another file, name the file and the declaration — the same shape `docs/rules.md`
   already requires of a value whose concept one module owns.
6. **確度: high / medium / low** — load-bearing, not decorative. 自動適用 applies a 集約 only at
   `high`, so rate honestly: `high` means you can point to the sentences that state the same fact and
   to the declaration that owns the concept. Uncertainty about which site should win is `medium` at
   best.

**A 集約 never writes a document** — it only moves content between comments inside one file. When the
right home turns out to be prose outside the code, that is a **移設**, and the two are not mixed in
one finding.

### Where things go, and the two misroutes to refuse

**`docs/README.md` owns the routing judgment** — the four kinds a candidate is classified into, the
ordered test that names a destination, the two tests that settle a borderline case, and the default:
a candidate that fits no destination stays in the code. **`docs/rules.md` 「コメントと文書」 —
its rule "設計判断を、それを所有しない文書へ置かない" — carries the two named misroutes** — a
library's or an API's specific behavior stays at the call site, and business knowledge goes to
`docs/spec/` rather than to an ADR. Read both when a 移設 verdict needs a
destination.

Do not restate it here. The same rule kept in two places means that the day one side is revised, this
skill and whatever else routes a rationale start answering differently for the same comment — and
neither copy says which one is authoritative.

What this skill adds on top of that rule is the verdict and the write: a comment whose content
belongs elsewhere is **移設**, and the edit into the destination document is performed here rather
than left to the reader.

Classification is **mode-independent**. Produce every finding, in full, whatever Step 0 resolved —
the entire difference between the three modes lives in Steps 3–5. A run that classified less because
it was only going to report would quietly disagree with a run that classified in order to apply, and
nothing exists to detect that drift.

## Step 3. Drive the approval loop

Present the findings **grouped by verdict**, most consequential first (著述 → 移設 → 不要 → 削除 → 書換), each with:

- `file:line` and the comment verbatim
- the verdict and the one-sentence reason
- for 移設: the destination file, and the exact text proposed for it
- for 不要: the 正本 — `file:line` of the test case, the type, or the story that already carries it
- for 著述: the declaration, the exact text proposed, and where the fact came from
- the residue proposed for the code (never leave the call site silent when a constraint remains)

In **確認して適用**, confirm with `AskUserQuestion` per group: 「この判定で適用しますか？」 /
「個別に確認したい」 / 「この分類は見送る」. A sweep that applies 40 edits on one confirmation is not
reviewable. In **自動適用**, take no confirmation here — Step 4 states afterwards what it wrote.

**A 集約 is one question covering the whole set, never one per member.** Splitting it produces
outcomes the user never chose: approve the shrinks without the surviving site and the Why is gone;
approve the survivor without the shrinks and nothing consolidated. Offer 集約 /
「現状のまま（維持）」 / 「別の site を本体にする」 / 「判断を保留」, and show every member.

**In 報告のみ the run ends here**, and the grouped summary above is not enough on its own. Render
every non-`維持` finding in full — the evidence, the comment before and after, and for a 移設 the
exact prose proposed for the destination — because no approval loop follows to reveal them one at a
time. Close by saying how to act on the report: re-run with `--apply` for the 削除 / 書換, or in
確認して適用 for those plus the 移設. For a 集約, render every member comment and not only the site
that keeps the content — a consolidation cannot be judged from the winner alone.

## Step 4. Apply — code and destination together

Not reached in 報告のみ. Between the other two modes the write itself is identical; what differs is
who approves it, and how much of the verdict set is in play.

### 自動適用 — no approval prompt

Apply **削除**, **書換**, and **集約** as Step 2 classified them, in one pass, and report what was
written. **不要 and 著述 are never applied unattended** and come off first, before the exclusions
below: 不要 rests on a claim about a file this run may have misread, and its cost when wrong is a
constraint deleted with nothing left behind; 著述 writes prose nobody has read, which is the failure
this whole protocol exists to prevent. Both land in 確認して適用. Three further exclusions:

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
- **A 集約 whose members span more than one file is reported, never applied.** A cross-file
  consolidation edits files the reader of any one of them cannot see, and picking the owning
  declaration across a kernel is the call most likely to be wrong. 確認して適用 is where it lands.
- **A 集約 is applied only at `確度: high`.** A 書換 risks the wrong wording at one site; a
  consolidation additionally picks *which declaration owns the concept*, and it has already shrunk
  the other sites by the time a wrong pick becomes visible. That is markedly harder to undo, so
  anything rated `medium` or `low` is reported for 確認して適用 instead of applied.

**Do not apply a 移設 that would write to a destination document.** Report those with their count and
proposed landing form, and say that 確認して適用 is where they land. The reason is not caution in
general: `AGENTS.md`'s *AI Modification Scope* leaves `docs/adr/` outside the default scope, so
**writing an ADR needs a prior user instruction**, and whether a rationale becomes a new record or a
rewrite of an existing one is exactly that call. A mode whose contract is "no questions" has no way
to ask it. Keeping that one question alive would break the contract; answering it silently would
settle a repository-policy question by generator.

Every guard below still holds. 自動適用 removes the prompt, not the rules.

### 確認して適用 — write what each approved group asked for

For each approved item, write **both sides in the same step**:

1. Append the relocated rationale to the destination document, in that document's voice and section
   structure. Do not paste the comment verbatim — a comment and a document read differently.
2. Edit the code: remove the relocated prose, keep the operative residue, and add a one-line
   reference **to the layer or feature README** — never to the ADR, even when the ADR is where the
   prose landed. `docs/rules.md` forbids an ADR reference in a comment: an ADR's number, section and
   owning record all move, while the README moves with the layer, so a README reference cannot go
   stale unseen. The README is what lists the related ADRs.

Never do one without the other. A rationale removed from code before its destination exists is
information destroyed, and this skill is the only thing holding both ends.

Guards that hold regardless of approval or mode:

- **Never remove a functional directive** — `// @ts-expect-error`, `// biome-ignore …`,
  `// eslint-disable*`, `/** @jsxImportSource … */`, `// Code generated … DO NOT EDIT`, shebangs.
  (`"use client"` / `"use server"` are string directives, not comments — never touch them.)
- **Never edit a protected path.** `AGENTS.md`, `LICENSE`, and anything under
  `.claude/settings.json`'s `permissions.deny` stay untouched. Whether an Accepted ADR body needs
  approval before it becomes a destination is decided by `AGENTS.md`'s *Protected Documentation*,
  like any other ADR edit.
- **Never touch generated files** — `**/gen/**`, anything with a generated banner.
- **Do not rewrite the code's behavior.** This skill moves prose. If a comment is wrong because the
  code is wrong, report it and stop.

## Step 5. Verify

Run this only when something was written. 報告のみ has nothing to verify; 自動適用 needs it most,
because nobody read the edits one at a time.

**Format only what this run wrote, and leave the gates to the hooks and CI** (`docs/playbook.md`,
*ゲートを先回りして回さない* — CI is the authority):

```sh
pnpm exec biome check --fix <the source files you touched>
pnpm exec markdownlint-cli2 --no-globs --fix <the documents you touched>
```

`--no-globs` is load-bearing — without it the configured `globs` are *added* to your arguments and
the whole tree is rewritten.

Then re-read the diff of the touched files and confirm only comments and documents changed. Behavior
must be untouched; if `git diff` shows a statement changed, that is a defect in this run.

**After a cross-file 集約, read every file it touched and follow each pointer from the shrunk side
back to the owning declaration** — a pointer that names a declaration a reader cannot reach from
where they are standing is the failure this verdict introduces.

**After a 集約, read the whole file top to bottom** rather than each edited site in isolation — the
finding was about the file, so the check has to be too. Two failures show up only this way: the
surviving site does not actually carry what the shrunk ones gave up, and a pointer names a
declaration a reader cannot find from where they are standing.

## Step 6. Report

State per file what was 維持 / 削除 / 不要 / 書換 / 移設 / 集約 / 著述, where each relocation landed, and for every 不要 the 正本 it was checked against. Report the
cross-file cluster count from Step 1.5 separately, including the clusters that were left alone — a
cluster nobody acted on is the finding most likely to recur. **Count a
集約 once, not once per member**, and report the member count beside it so the size of the edit is
visible before anyone approves it. Say plainly what
was **not** swept — a directory left for later, a finding deferred because it needed a design call.
An unstated omission reads as "this directory is clean" when it is not.

In **自動適用**, name every finding that was withheld and why — a comment that contradicts the code, a
移設 that needs a document write, a 移設 whose destination could not be confirmed. A withheld finding
that goes unmentioned reads as one that was never raised.

## Relationship to the review skills

**This skill is not one of them.** `AGENTS.md`'s Review Phase Protocol names two subjects — the change
(`/impl-review`) and the tests (`/test-review`) — and asks for each with an estimate of what it will
return. Comments are not a third: they are part of the deliverable, and a change whose comments are
unsettled is unfinished rather than unreviewed. So this pass is not estimated, not offered, and not
declined; it runs.

What the two share with it is the rule against delegation between subjects. No review skill carries a
comment lens, and this one hands nothing to them. A review that runs afterwards is reviewing the
comments this pass wrote, like any other part of the change.

## Constraints

- ✅ Read the standard and the destination documents this run
- ✅ Run unconditionally at the end of an implementation; confirm the verdicts, never whether to run
- ✅ Run the per-change pass in this session; delegate only `--bulk`
- ✅ Name the 正本 on every 不要, and the source of the fact on every 著述
- ✅ Write the missing required TSDoc frame of every named function in scope, as `docs/rules.md` defines it — the function is incomplete without it
- ✅ One directory per sweep
- ✅ Run both passes on every file — the per-comment jurisdiction question and the per-file stock question
- ✅ Classify every comment in full whatever the mode — the mode changes Steps 3–5, never Step 2
- ✅ Approve a 集約 as one indivisible decision covering the whole set
- ✅ In 確認して適用, approve per verdict group, not per sweep
- ✅ Write the destination document and the code in the same step
- ✅ In 報告のみ, render every non-`維持` finding in full and write nothing
- ❌ Apply a 不要 or a 著述 unattended, in any mode
- ❌ Raise a residue 著述 for a fact the implementation did not establish — beyond the required frame, a bare declaration is the normal state
- ❌ Delegate the per-change pass to a subagent — the constraint it must write exists only here
- ❌ Apply a 移設 that writes a destination document while in 自動適用
- ❌ Apply a 集約 rated `medium` or `low` unattended, or split one into per-comment questions
- ❌ Raise a 集約 over a general-purpose part's public doc duplicating its own README — that redundancy is intended; only a contradiction between the two is a finding
- ❌ Report the same comment under both a 書換 and a 集約 — the 集約 absorbs the shortening
- ❌ Apply a finding whose comment contradicts the code, in any unattended mode
- ❌ Relocate a library's specific behavior out of the code
- ❌ Relocate business knowledge into an ADR
- ❌ Remove a functional directive, touch a generated file, or edit a protected path
- ❌ Change behavior

## Checklist

- [ ] Scope and apply mode resolved (from the argument, a flag, or Step 0)
- [ ] Standard and destination documents read this run
- [ ] Both passes run on every file in scope, mode-independently
- [ ] Every comment in scope classified into one of the seven verdicts, and every touched declaration checked for a missing one (著述)
- [ ] 確認して適用: approval taken per verdict group / 自動適用: withheld findings named
- [ ] 報告のみ: every non-`維持` finding rendered in full and nothing written
- [ ] Each applied 移設 wrote both the destination and the code residue
- [ ] Each 不要 named the 正本 that was opened and confirmed to carry the content
- [ ] Each 集約 carried its shape, every member, the owning site with evidence, the consolidated
      wording, each pointer, and a 確度
- [ ] After a 集約, the whole file re-read top to bottom
- [ ] Only the touched files formatted when something was written; no gate run
- [ ] Diff confirmed to change only comments and documents
- [ ] What was not swept stated explicitly
