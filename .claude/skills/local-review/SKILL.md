---
name: local-review
description: Local adversarial, low-bias code review of the current change, run by subagents on a DIFFERENT model than the implementer. Mirrors `/code-review`'s finder → verify shape but keeps everything local and adds a runtime stage that mocked tests cannot cover. Confirms scope via `AskUserQuestion` (changed files vs branch-vs-base diff vs specific paths), fans out `adversarial-reviewer` subagents — one per lens (correctness / security / architecture / runtime-gap / test-gap, where `test-gap` is a code-origin pass that reads the changed production source and flags reachable branches / whole changed symbols left untested or vacuously asserted) — plus the dedicated `comment-reviewer` subagent for comment quality, each on a user-selected model (fable / sonnet / opus / haiku; default auto = a model ≠ the implementer) so reviewer ≠ implementer — then verifies each finding with an independent `review-verifier` subagent (CONFIRMED / PLAUSIBLE / REFUTED) and synthesizes a single Japanese report. Comment quality is not just reported but PROCESSED inside the lifecycle: CONFIRMED comment findings are auto-fixed in the working tree after one confirmation (delete / rewrite / enrich, with guards — never remove functional directives like `// @ts-expect-error` / `// biome-ignore`, rewrite-or-enrich rather than delete an exported declaration's contract-bearing TSDoc, skip generated files / Markdown prose / the deny list), then `pnpm fix` + `pnpm lint:ci` verify. The other lenses stay read-only on source (no auto-fix). By default the surviving CONFIRMED / PLAUSIBLE findings from the read-only lenses are posted to the branch's PR as inline review comments anchored to each finding's line (opt out with `--no-comment`; comment-style findings are applied, not posted). Use before commit / PR to get an independent second opinion that the implementer's own model would not surface. Flags: `--no-comment` (skip PR posting), `--no-apply` (report comment-style findings instead of auto-fixing).
---

# Local Review

Independent, adversarial, **different-model** code review you can run locally — no Copilot, no cloud `/code-review`. The implementer's own model has blind spots; the whole point is to review with another model so those blind spots get caught. Built on the `/code-review` finder → verify pattern, plus a runtime curl + o11y stage that mocked unit tests structurally cannot reach.

A Japanese reference translation of this skill lives at `SKILL.ja.md` in this directory (for human reference only; not loaded as a skill).

## When to Use

- Before committing / opening a PR, to get a second opinion the implementer's model would not produce on its own.
- After a multi-layer change where mocked tests pass but DI / middleware / real-DB behavior is unverified.
- Whenever you want an adversarial pass focused on bugs, auth/IDOR, and layer violations.

Do NOT use this skill for:

- Style / formatting — `pnpm fix` / `pnpm lint:ci`.
- Exhaustive layer-compliance auditing — `arch-check` (this skill's `architecture` lens flags only high-signal violations).
- Spec validation — `verify-spec`.
- Applying non-comment fixes — for the code lenses this skill is read-only; it reports, the user fixes. (Exception: **comment-style findings are auto-applied** in Step 5.5 — verbose / narrating comments are actually fixed, not just reported.)

## Core Idea — reviewer ≠ implementer

Bias reduction is the design constraint, not a nicety. Reviewers therefore run as **subagents on a different model than whoever wrote the code**:

- The reviewer agents (`adversarial-reviewer`, `comment-reviewer`, `review-verifier`) default to **`sonnet`** in their frontmatter, which differs from the usual Opus implementer.
- **The reviewer model is chosen by the user in Step 0.** The options are `fable` (Fable 5) / `sonnet` / `opus` / `haiku`, plus an *auto* default that resolves to a model ≠ the session's implementer. Pass the chosen model to every reviewer subagent via the `Agent` tool's `model` parameter (it takes precedence over the agent file's `sonnet` default) — e.g. `opus` for depth, `haiku` for a cheap divergent pass, `fable` for a fresh independent perspective.
- **The orchestrator MUST guarantee reviewer ≠ implementer.** If the user selects the same model as the session's implementer, warn that it undermines the different-model bias reduction and confirm before proceeding. Never silently let reviewer and implementer be the same model.
- Reviewer subagents are **read-only** (their agent files grant no Edit/Write) — they only return findings. The single place this skill mutates source is Step 5.5, where the **orchestrator** (not a subagent) applies the verified comment-style fixes after user confirmation. The code lenses are never auto-fixed.

## Step 0 — Confirm Scope

Call `AskUserQuestion` immediately. Default-detect scope by checking branch vs base — get the base with `gh repo view --json defaultBranchRef -q '.defaultBranchRef.name'` (this repo's base is a `release/*` branch); if there are unmerged commits, default to "changed files", otherwise "whole working tree / specific paths".

```text
質問: どの範囲をレビューしますか？
選択肢:
  - 変更ファイルのみ（ベースブランチとの diff）  ← 未マージのコミットがある場合の既定
  - 作業ツリーの未コミット変更（git status の差分）
  - 特定のパス/ファイルを指定
  - キャンセル
```

### Reviewer model selection

In the same `AskUserQuestion` call (a second question alongside scope), ask which model the
reviewer subagents run on:

```text
質問: レビュアーをどのモデルで実行しますか？（バイアス低減のため 実装者 ≠ レビュアー を推奨）
選択肢:
  - 自動（実装者と異なるモデルを既定選択）  ← 既定
  - fable（Fable 5）
  - sonnet
  - opus（深掘り）
  - haiku（安価・高速な発散パス）
```

*Auto* resolves to the agent-file default (`sonnet`) when the implementer is not `sonnet`,
otherwise to a different tier. If the user picks the implementer's own model, warn (per Core
Idea) that it weakens the different-model guarantee and confirm before continuing. The chosen
model is passed to every `adversarial-reviewer` / `comment-reviewer` / `review-verifier`
`Agent` call via the `model` parameter in Step 2 and Step 3.

### Flags

- `--no-comment` — suppress Step 6 (do not post to the PR); produce the local report only. **Default is opt-out**: when an open PR exists for the current branch, Step 6 posts the surviving findings as inline review comments unless this flag is given.
- `--no-apply` — suppress Step 5.5 (do not auto-fix comment findings); instead report them and let them flow into Step 6 (PR post) like the other lenses. **Default is to apply**: comment quality findings are auto-fixed in the working tree after one confirmation.

## Step 1 — Gather Context

- Resolve the base ref and produce the review target: `git diff <base>...HEAD` (or `git diff` for uncommitted), plus the changed-file list (`git diff --name-only ...`).
- Detect which layers/areas are touched (`internal/controller/**`, `usecase`, `domain`, `infrastructure`, `pkg`, `openapi/**`, `database/**`).
- Note whether any **endpoint** is touched (controller handler or `openapi/**`) — this decides whether Step 4 runs.
- Note whether any **shared** OpenAPI component is edited (a `components/*` referenced by more than one operation) — this widens Step 4 to every consumer.
- Note whether any **non-generated production `.ts` / `.tsx` under `src/**`** is touched (exclude `*.test.ts(x)` / `*.spec.ts(x)` / `**/gen/**` / files carrying a `Code generated … DO NOT EDIT` banner) — this feeds the `test-gap` lens its changed-symbol list.
- Check whether a **test runner is configured at all**: a `test` script in `package.json`, or any `*.test.ts(x)` / `*.spec.ts(x)` in the tree. If neither exists, the `test-gap` lens is **disabled** for this run (see Step 2) — say so in the Step 5 report rather than silently skipping it.

## Step 2 — Fan-out Finders (different model, concurrent)

Spawn all finders concurrently (issue every `Agent` call in a single message). Pass the Step 0 user-selected reviewer model to every `Agent` call via the `model` parameter (omit only when *auto* already resolves to the agent-file default). Two agent types:

- The **code lenses** run `adversarial-reviewer` — one per lens, `agentType: "adversarial-reviewer"`, `label` like `find:security`.
- The **comment dimension** runs the dedicated `comment-reviewer` — `agentType: "comment-reviewer"`, `label: "find:comment"`. This is the stronger, comment-focused agent (a richer taxonomy than a one-paragraph lens), and its findings feed the Step 5.5 auto-fix.

| Finder | Agent | Run when |
| --- | --- | --- |
| `correctness` | adversarial-reviewer | always |
| `security` | adversarial-reviewer | always (especially when a Route Handler / Server Action / middleware / auth / an API request-response type is touched) |
| `architecture` | adversarial-reviewer | always |
| `runtime-gap` | adversarial-reviewer | when a Route Handler / Server Action / middleware / Provider mount / generated API type is touched — the seams a mocked component test does not exercise |
| `test-gap` | adversarial-reviewer | when the diff touches non-generated production `.ts` / `.tsx` under `src/**` **and** a test runner is configured (Step 1) |
| comment quality | **comment-reviewer** | when the diff adds / changes any code comment (almost always) |

Each `adversarial-reviewer` prompt MUST include: the lens name + its definition, the base ref + changed-file list + the diff, and pointers to `AGENTS.md` / the relevant `README.md` / the governing ADRs.

**`test-gap` lens definition** (this lens is *code-origin* — it reads the changed production source, not the test files): for each production symbol added or changed in the diff, enumerate its logical branches / thrown error types / boundary conditions / null-and-undefined defenses, then check the paired test reaches each and *distinctly* asserts it — the specific error class (`await expect(fn()).rejects.toThrow(SpecificError)`), the distinguishing value or rendered state, not a bare `expect(fn).toThrow()` / `toBeTruthy()`. Report two shapes: a production symbol changed in the diff with **no test at all**, and a reachable branch of a changed symbol left **untested or vacuously asserted**. This is a **high-signal subset** — flag the reachable gaps on the *changed* code; it does NOT do exhaustive per-symbol enumeration across a module. Findings are read-only suggestions (never auto-fixed) and anchor to the subject line in the diff, so they post inline like the other code lenses.

**`test-gap` is gated on the test foundation existing.** This repository has no test runner installed yet (ADR [0090](../../../docs/adr/0090-testing-strategy.md) selects Vitest + RTL + MSW + Playwright but the tooling is not in `package.json`). Until Step 1 finds a configured runner, do **not** spawn this lens — with no tests to read it would report every changed symbol as untested, which is noise, not signal. Turn it on by installing the runner; no edit to this skill is needed.

The `comment-reviewer` prompt MUST include: the base ref + changed-file list + the diff, and the **line policy** (judge only comments on changed lines for a diff scope). The agent already encodes the all-languages-uniform standard (TS/TSX and non-TS alike — shell / `.mjs` / CSS / YAML; non-TS is higher-risk, not exempt), reads `AGENTS.md` at runtime as its authoritative policy, and carries the functional-directive / exported-declaration guards — do not re-specify or soften them here. Restrict the file list it sees to comment-bearing source files: exclude generated files (`**/gen/**`, `// Code generated … DO NOT EDIT`), the deny list, and Markdown / docs prose (the comment rules govern source comments, not standalone documents — that is `doc-reviewer`'s job).

## Step 3 — Adversarial Verify

Collect all findings and **dedup** by (file, line, claim). For each surviving finding, spawn one `review-verifier` subagent (concurrently), handing it the single finding + the base ref. Use `agentType: "review-verifier"`, `label` like `verify:<file>`, and the Step 0 user-selected reviewer `model` (same reviewer ≠ implementer rule).

- Keep **CONFIRMED** and **PLAUSIBLE** findings. Drop **REFUTED** (but keep a count for the report).
- For a critical/high finding where a single verdict feels shaky, spawn 2–3 verifiers and go by majority — diversity beats one opinion on the findings that matter.

## Step 4 — Runtime Verification (curl + o11y) — endpoints only

Run this **only if Step 1 found a touched endpoint**, and run it from the **orchestrator (main session)**, not a subagent — it needs interactive bash, real DB/state, log reading, and possibly user confirmation. Follow `scaffold-endpoint` Step 3.5:

1. Mocked tests do NOT build the real DI graph, run auth/OpenAPI middleware, or touch the DB — so this stage exists to catch what Step 2's `runtime-gap` lens only *predicts*.
2. Pick/seed a target row in a known state. For credential/state-sensitive checks, create a row whose plaintext/state you control.
3. `curl` the touched endpoint(s) (local auth: `Authorization: Bearer debug:<subject>`) and assert: happy path; key error paths (404 / 400 / 422); and — **if the operation declares `security:`** — no-token ⇒ 401 (prove it is actually protected). For IDOR-shaped findings, curl as a *different* subject and assert it cannot reach another subject's resource.
4. **Shared-schema impact:** if a shared `components/*` was edited (Step 1), curl **every** consumer endpoint, not just the changed one — `grep` the spec for `$ref`s and exercise each.
5. Read the o11y logs once for a single request: confirm the trace spans the layers and the emitted queries are what you expect. Later re-checks can rely on o11y instead of re-curling.
6. **Destructive guard:** if a curl mutates data and the only restore path is a full data reset, confirm with the user before running it (per `CLAUDE.md`). Clean up rows you created.

Fold any runtime-confirmed defect into the report as CONFIRMED with the curl/o11y evidence.

## Step 5 — Synthesize Report (Japanese)

Produce one Japanese report:

```text
## ローカルレビュー結果（reviewer: <model> / implementer: <model>）

スコープ: <base>...HEAD（<N> files） / lens: correctness, security, architecture, runtime-gap, test-gap, comment-style
未実行のレンズ: test-gap（テストランナー未導入のため無効）
ランタイム検証: 実施（curl/o11y）/ 対象外（エンドポイント変更なし）

### CONFIRMED（要対応）
- [重大度] タイトル — path:行
  - 問題 / 根拠 / 修正案
  - 検証: verifier 判定（+ 該当すれば curl/o11y 結果）

### PLAUSIBLE（要確認・判断保留）
- ...

### コメント品質（Step 5.5 で適用）
- [重大度] 対象コメント — path:行 / 分類 / 実施したアクション（削除・書換・加筆）

### 補足
- REFUTED: <n> 件（finder が挙げたが verifier が否定）
- ランタイム検証でカバーした経路 / スキップした経路
```

Order by severity, CONFIRMED before PLAUSIBLE. Always state what runtime checks ran, what was skipped, and **which lenses did not run and why** — silent omission reads as "covered everything" when it was not. In the report, keep the **comment quality** findings in their own subsection — they are *processed* in Step 5.5, not posted to the PR.

## Step 5.5 — Apply Comment Fixes (default; skip with `--no-apply`)

This is the one place the skill mutates source. Apply the verified **comment quality** findings (CONFIRMED, plus any PLAUSIBLE the user opts in) yourself — the `comment-reviewer` subagent never edits. The code lenses are NOT auto-fixed here; they go to Step 6.

Confirm once before editing:

- `AskUserQuestion`: 「コメント指摘 <N> 件をライフサイクル内で修正適用しますか？」 — options: 「すべて適用」 / 「1件ずつ確認」 / 「適用しない（レポートのみ／PR コメント化）」.

Apply the action each finding carries — **削除 (delete)** a bad-content comment, **書換 (rewrite)** to a correct/behavioral What, or **加筆 (enrich)** a thin What / missing non-obvious contract / missing good Why. A `誤り/陳腐化` finding (the What contradicts the code) is corrected, not deleted. Obey these guards (a wrong deletion here is a real regression):

- **Never delete functional / directive comments**: `// @ts-expect-error`, `// @ts-ignore`, `// biome-ignore …`, `// eslint-disable` / `// eslint-disable-next-line` / `/* eslint-disable … */` (ADR [0002](../../../docs/adr/0002-formatter-linter.md) keeps ESLint for the checks biome cannot express), `/** @jsxImportSource … */`, `// prettier-ignore`, `// Code generated … DO NOT EDIT`, shebangs, tool directives in SQL / YAML. (`"use client"` / `"use server"` are string directives, not comments — never touch them either.)
- **Never edit a protected path.** `AGENTS.md`'s *AI Modification Scope* and *Protected Documentation* are authoritative: `AGENTS.md` itself, Accepted ADR bodies, `LICENSE`, and anything listed under `.claude/settings.json`'s `permissions.deny` stay untouched even during skill execution. Root config (`package.json` / `tsconfig.json` / `next.config.ts` / `mise.toml` / `biome.json` / `Makefile` / `.makefiles/` / `.github/` / `.claude/`) is lifted only by the temporary pre-v1.0.0 rules — a comment fix is never a good enough reason to reach into one. If a comment finding lands on such a path, report it instead of applying it.
- **Exported declarations**: if the doc comment carries a real contract (error semantics / units / boundaries / side effects), **rewrite or enrich, never delete** — the type signature does not carry it. Delete only when the comment is a pure restatement of the name and type. The `comment-reviewer` marks which case applies on every exported-declaration finding; if it did not, treat it as contract-bearing and rewrite.
- **Keep good comments**: a correct, sufficient What and a non-obvious Why (rationale / load-bearing constraint) are not findings — do not strip them. Rewrites/enrichments describe **What + non-obvious Why**, never **How** or development 経緯. Comments are written in Japanese (AGENTS.md Language Rules). Edit only in-scope files; never touch generated files, Markdown prose, or the deny list. Use `Edit`, one finding (or one file) at a time.

After editing, verify:

1. `pnpm fix` — absorb formatting / auto-fixes.
2. `pnpm lint:ci` — the full profile with `--error-on-warnings`, same as the pre-commit hook.
3. `git diff` the touched files and confirm only prose comments changed (no functional directive caught). For non-TS files, re-read the changed hunks.
4. On failure, surface it and stop — do not auto-revert; the user decides. Do NOT commit — leave the changes for the user (or a later `/commit`).

If `--no-apply`, skip this step and instead let the comment findings flow into Step 6 (posted to the PR like the other lenses). If **both** `--no-apply` and `--no-comment` are given, nothing consumes them — list them in full in the Step 5 local report instead, and retitle that subsection 「コメント品質（未適用・未投稿）」 so it does not claim an apply that never happened.

## Step 6 — Post Findings as Inline PR Comments (default; opt out with `--no-comment`)

By default, after Step 5.5, post the surviving **CONFIRMED + PLAUSIBLE** findings **from the code lenses** (correctness / security / architecture / runtime-gap / test-gap) to the branch's PR as **inline review comments** — one per finding, anchored to its `path:line`, instead of a single wall-of-text comment. **Never post REFUTED.** Comment quality findings are NOT posted here — they were applied in Step 5.5 (unless `--no-apply` was given, in which case include them in this post). The Step 5 local report is still produced regardless; this step is additive.

Skip this step entirely when:

- invoked with `--no-comment`, OR
- no open PR exists for the current branch (`gh pr view` returns nothing) — keep the local report only and optionally offer to open a PR.

Posting to GitHub is an outward-facing action, so confirm **once** before posting — show the count and the target PR (`AskUserQuestion`: 「<N> 件の指摘を PR #<番号> にインラインコメントとして投稿しますか？」/「投稿する」「投稿しない（ローカルレポートのみ）」).

**Redact before posting.** This repository is public, and a `security` finding quotes the very thing it flags — a leaked token, a hardcoded credential, a PII sample. Posting that verbatim republishes the secret in a place that cannot be retracted. Before building the payload, rewrite every finding body so the evidence is described, not reproduced: replace concrete secret-shaped values with `***REDACTED***` and cite `path:line` instead. A finding whose point cannot survive redaction (the value *is* the finding) stays in the local report only — say so in the summary rather than posting it.

**`gh api` is denied by `.claude/settings.json`.** The `permissions.deny` list carries `Bash(gh api *)`, and AGENTS.md keeps that list in force even during skill execution — so the inline-comment call below will be blocked rather than run. Do **not** work around it (never re-route the same request through `python3` / `pnpm exec tsx` / any other allowed interpreter — that defeats the guard rather than satisfying it) and never edit the deny list to unblock yourself. Instead: surface the block to the user, and offer either a one-off permission grant for exactly this call or the fallback below.

**Fallback when the API call is unavailable:** post a single summary comment with `gh pr comment` — the findings grouped by file with `path:line` references instead of true line anchors — and say plainly in the Step 5 report that the findings were summarized, not inlined.

### Procedure

1. Resolve PR number, repo, and the commit the comments anchor to:

   ```sh
   gh pr view --json number,url -q '.number'        # PR number
   gh repo view --json nameWithOwner -q '.nameWithOwner'
   git rev-parse HEAD                                # anchor SHA
   git rev-parse @{u}                                # pushed head — warn if it differs from HEAD
   ```

   The anchor commit MUST be the commit pushed to the PR. If local `HEAD` ≠ `@{u}`, warn the user to push first (the API rejects comments whose `commit_id` is not on the PR).

2. Decide which findings can be inline. A GitHub inline comment must target a line present in the PR diff. Parse the diff hunks (`gh pr diff <PR> --patch` or `git diff <base>...HEAD`):
   - `(path, line)` inside an added/context hunk → inline comment, `side: "RIGHT"`.
   - `(path, line)` on a removed line → inline comment, `side: "LEFT"`.
   - Off-diff (the reviewer referenced unchanged context) → **cannot** be inline; fold it into the review summary `body`.

3. Build one review and post all comments atomically (a single review, not N standalone comments):

   ```sh
   gh api --method POST repos/<owner>/<repo>/pulls/<PR>/reviews --input payload.json
   ```

   `payload.json`:

   ```json
   {
     "commit_id": "<SHA>",
     "event": "COMMENT",
     "body": "🔎 local-review (reviewer: <model>) — CONFIRMED <n> / PLAUSIBLE <m>\n\ndiff 外で行アンカー不可の指摘:\n- <path>: <要約>",
     "comments": [
       {
         "path": "<file>",
         "line": "<行番号>",
         "side": "RIGHT",
         "body": "🔎 [CONFIRMED · high] <問題の要約>\n\n根拠: <...>\n修正案: <...>\n検証: <verifier 判定>"
       }
     ]
   }
   ```

   Use `event: "COMMENT"` — this is an advisory review, never `REQUEST_CHANGES` / `APPROVE`. Prefix every comment body with `🔎 local-review` (or the `🔎 [verdict · severity]` tag) so the posts are distinguishable from human review.

4. Robustness: if the API rejects the batch (422 — a line is not in the diff), move the offending comment(s) to the summary `body` and retry. Report afterward what was posted inline vs. summarized — never silently drop a finding.

## Do / Do NOT

- ✅ Guarantee reviewer model ≠ implementer model (user selects it in Step 0; warn + confirm if they pick the implementer's model).
- ✅ Run finders concurrently (one message, multiple `Agent` calls): the code lenses via `adversarial-reviewer`, comment quality via `comment-reviewer`.
- ✅ Independently verify every finding before reporting; drop REFUTED.
- ✅ Run the runtime stage for touched endpoints; widen to all consumers on a shared-schema edit.
- ✅ Confirm with the user before any destructive curl whose only restore path is a full data reset.
- ✅ Apply comment quality findings in Step 5.5 after one confirmation (delete / rewrite / enrich), then `pnpm fix` + `pnpm lint:ci`; skip with `--no-apply`.
- ✅ By default, post the code lenses' CONFIRMED + PLAUSIBLE findings to the branch's PR as inline review comments (Step 6); suppress with `--no-comment` or when no open PR exists.
- ✅ Confirm once before posting to the PR (outward action); anchor each comment to its `path:line`, fold off-diff findings into the review summary.
- ✅ Redact secret-shaped values out of every finding body before posting — this repository is public and a post cannot be retracted.
- ❌ Route a denied command (`gh api`) through an allowed interpreter, or edit `permissions.deny` to unblock yourself — surface the block and offer the summary-comment fallback instead.
- ✅ State in the report which lenses did not run and why (`test-gap` while no test runner is configured).
- ❌ Post REFUTED findings, or use `REQUEST_CHANGES` / `APPROVE` — the posted review is advisory `COMMENT` only.
- ❌ Auto-fix the code lenses — those are reported, the user fixes. Only comment quality is auto-applied (Step 5.5).
- ❌ In Step 5.5, delete a functional directive (`// biome-ignore` etc.) or a contract-bearing exported doc comment (rewrite it); touch generated files / Markdown / the deny list; or auto-commit.
- ❌ Spawn `test-gap` before a test runner exists — with nothing to read it flags every changed symbol, which is noise.
- ❌ Let a reviewer run on the same model as the implementer.
- ❌ Report speculative style nits as findings, or pad the list to look thorough.
- ❌ Edit generated files or anything in the deny list while verifying.

## Checklist

- [ ] Scope confirmed via `AskUserQuestion`; base ref resolved.
- [ ] Reviewer model selected in Step 0 and verified ≠ implementer model (warn + confirm if same).
- [ ] Finders fanned out concurrently: code lenses (`adversarial-reviewer`) + comment quality (`comment-reviewer`); `test-gap` only when a test runner is configured.
- [ ] Every finding independently verified; REFUTED dropped (count kept).
- [ ] Runtime curl + o11y done for touched endpoints (shared-schema → all consumers); destructive curls confirmed.
- [ ] Single Japanese report: CONFIRMED → PLAUSIBLE, comment findings in their own subsection, runtime coverage and skipped lenses stated.
- [ ] Unless `--no-apply`: comment findings applied in Step 5.5 (functional directives untouched, contract-bearing exported doc comments rewritten not deleted), then `pnpm fix` + `pnpm lint:ci`; no auto-commit.
- [ ] Unless `--no-comment` / no PR: confirmed once, then posted the code lenses' CONFIRMED + PLAUSIBLE as inline PR comments (off-diff → summary body); REFUTED excluded; `event: COMMENT`.
