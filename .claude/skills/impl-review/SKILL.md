---
name: impl-review
description: Local adversarial, low-bias code review of the current change, run by subagents on a DIFFERENT model than the implementer. Mirrors `/code-review`'s finder → verify shape but keeps everything local and adds a runtime stage that mocked tests cannot cover. Confirms scope via `AskUserQuestion` (changed files vs branch-vs-base diff vs specific paths), fans out `adversarial-reviewer` subagents — one per lens (correctness / security / architecture / runtime-gap / test-gap, where `test-gap` is a code-origin pass that reads the changed production source and flags reachable branches / whole changed symbols left untested or vacuously asserted) — plus the dedicated `comment-reviewer` subagent for comment quality, each on a user-selected model (fable / sonnet / opus / haiku; default auto = a model ≠ the implementer) so reviewer ≠ implementer — then verifies each finding with an independent `review-verifier` subagent (CONFIRMED / PLAUSIBLE / REFUTED) and synthesizes a single Japanese report. Comment quality is not just reported but PROCESSED inside the lifecycle: CONFIRMED comment findings are auto-fixed in the working tree after one confirmation (delete / rewrite / enrich, with guards — never remove functional directives like `// @ts-expect-error` / `// biome-ignore`, rewrite-or-enrich rather than delete an exported declaration's contract-bearing TSDoc, skip generated files / Markdown prose / the deny list), then `pnpm fix` + `pnpm lint:ci` verify. The other lenses stay read-only on source (no auto-fix). By default the surviving CONFIRMED / PLAUSIBLE findings from the read-only lenses are posted to the branch's PR as inline review comments anchored to each finding's line (opt out with `--no-comment`; comment-style findings are applied, not posted). Use before commit / PR to get an independent second opinion that the implementer's own model would not surface. Flags: `--no-comment` (skip PR posting), `--no-apply` (report comment-style findings instead of auto-fixing).
---

# Local Review

Independent, adversarial, **different-model** code review you can run locally — no Copilot, no cloud `/code-review`. The implementer's own model has blind spots; the whole point is to review with another model so those blind spots get caught. Built on the `/code-review` finder → verify pattern, plus a runtime build + request stage that mocked component tests structurally cannot reach.

A Japanese reference translation of this skill lives at `SKILL.ja.md` in this directory (for human reference only; not loaded as a skill).

## When to Use

- Before committing / opening a PR, to get a second opinion the implementer's model would not produce on its own.
- After a multi-kernel change where mocked component tests pass but the RSC / Client boundary, `src/proxy.ts`, or the `adapters` request path is unverified.
- Whenever you want an adversarial pass focused on bugs, auth / IDOR, and layer violations.

Do NOT use this skill for:

- Style / formatting — `pnpm fix` / `pnpm lint:ci`.
- Static layer-boundary enforcement — `pnpm lint:ci` runs `eslint-plugin-boundaries` (ADR [0021](../../../docs/adr/0021-frontend-responsibility.md) Enforcement) plus `pnpm check:architecture`, so import direction **is** statically gated. The `architecture` lens is therefore the *semantic* pass on top of that gate: spend it on violations the matrix cannot express (a type leaking through a legal import, responsibility placed in the wrong kernel, an abstraction that inverts the dependency only nominally), not on re-deriving what ESLint already fails on. Exhaustive layer-compliance auditing belongs to a dedicated auditor skill, which **does not exist yet** (BACKLOG GB-1).
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
- Detect which **kernels / elements** are touched. The inventory is ADR [0027](../../../docs/adr/0027-directory-structure.md)'s physical layout, and what each may import is ADR [0021](../../../docs/adr/0021-frontend-responsibility.md)'s dependency matrix: `src/app/**` (3 elements — route-segment `page`/`layout`, route-handler `route.ts`, metadata), `src/features/<name>/**`, `src/model/**`, `src/components/**`, `src/adapters/server/**` · `src/adapters/client/**`, `src/capabilities/**`, `src/stores/**`, `src/config/**`, `src/errors/**`, `src/logging/**`, `src/observability/**` — plus the **boot / build boundary entries that sit outside the kernels**: `src/proxy.ts`, `src/instrumentation.ts`, `next.config.ts`. Several kernels are not on disk yet (ADR 0027 creates each when its decision lands); detect what exists rather than assuming the full set.
- Note whether a **request-time seam** is touched — a Route Handler (`src/app/**/route.ts`), a Server Action (`src/features/<name>/actions.ts`), `src/proxy.ts`, the response header configuration (`next.config.ts` `headers()`), or the **layout shell / Provider composition** (`src/app/**/layout.tsx` — ADR [0026](../../../docs/adr/0026-layout-shell-mount.md); a missing Provider only fails when the route actually renders). This decides whether Step 4-2 runs. <!-- skill-lint-ignore -->
- Note whether a **generated API artifact** is touched (`**/gen/**` — the types / zod schemas of ADR [0072](../../../docs/adr/0072-api-type-generation.md)). A regenerated artifact ripples to every consumer, so widen the review to the `adapters` conversions and features that import it, not just the changed file.
- Note whether any **non-generated production `.ts` / `.tsx` under `src/**`** is touched (exclude `*.test.ts(x)` / `*.spec.ts(x)` / `**/gen/**` / files carrying a `Code generated … DO NOT EDIT` banner) — this feeds the `test-gap` lens its changed-symbol list.
- Note separately whether any **`*.test.ts(x)` / `*.spec.ts(x)`** is touched. Together with the previous bullet this resolves the **test-viewpoint predicate**: `production source touched OR test file touched`. A test-only change satisfies it through the second disjunct alone — which is exactly the case `test-gap` cannot see, since it reads production source. Which of four states holds decides who owns the viewpoint:
  - Predicate true **and** the Step 4.5 delegation runs → the delegate owns it; `test-gap` does **not** run.
  - Predicate true, delegation unavailable, **production source touched** → `test-gap` runs as the high-signal subset.
  - Predicate true, delegation unavailable, **only test files touched** → **neither runs.** `test-gap` would have no symbol to enumerate and return an empty result that reads as a clean audit. This is the one state where the test viewpoint goes entirely unexamined — say so on the `テスト観点:` line instead of letting an empty lens stand in for it.
  - Predicate false → neither runs; there is no test viewpoint to audit.
- Check whether a **test runner is configured at all**: a `test` script in `package.json`, or any `*.test.ts(x)` / `*.spec.ts(x)` in the tree. If neither exists, the `test-gap` lens is **disabled** for this run (see Step 2) — say so in the Step 5 report rather than silently skipping it.

## Step 2 — Fan-out Finders (different model, concurrent)

Spawn all finders concurrently (issue every `Agent` call in a single message). Pass the Step 0 user-selected reviewer model to every `Agent` call via the `model` parameter (omit only when *auto* already resolves to the agent-file default). Two agent types:

- The **code lenses** run `adversarial-reviewer` — one per lens, `agentType: "adversarial-reviewer"`, `label` like `find:security`.
- The **comment dimension** runs the dedicated `comment-reviewer` — `agentType: "comment-reviewer"`, `label: "find:comment"`. This is the stronger, comment-focused agent (a richer taxonomy than a one-paragraph lens), and its findings feed the Step 5.5 auto-fix.

| Finder | Agent | Run when |
| --- | --- | --- |
| `correctness` | adversarial-reviewer | always |
| `security` | adversarial-reviewer | always (especially when a Route Handler / Server Action / `src/proxy.ts` / auth / a generated API request-response type is touched) |
| `architecture` | adversarial-reviewer | always |
| `runtime-gap` | adversarial-reviewer | when a Route Handler / Server Action / `src/proxy.ts` / Provider mount / generated API artifact is touched — the seams a mocked component test does not exercise |
| `test-gap` | adversarial-reviewer | **fallback only** — spawn it when Step 4.5's delegation to `/test-review` could not run. Otherwise the test viewpoint belongs to the delegate |
| comment quality | **comment-reviewer** | when the diff adds / changes any code comment (almost always) |

Each `adversarial-reviewer` prompt MUST include: the lens name + its definition, the base ref + changed-file list + the diff, and pointers to `AGENTS.md` / the relevant `README.md` / the governing ADRs.

**`test-gap` lens definition** (this lens is *code-origin* — it reads the changed production source, not the test files): for each production symbol added or changed in the diff, enumerate its logical branches / thrown error types / boundary conditions / null-and-undefined defenses, then check the paired test reaches each and *distinctly* asserts it — the specific error class (`await expect(fn()).rejects.toThrow(SpecificError)`), the distinguishing value or rendered state, not a bare `expect(fn).toThrow()` / `toBeTruthy()`. Report two shapes: a production symbol changed in the diff with **no test at all**, and a reachable branch of a changed symbol left **untested or vacuously asserted**. This is a **high-signal subset** — flag the reachable gaps on the *changed* code; it does NOT do exhaustive per-symbol enumeration across a module. Findings are read-only suggestions (never auto-fixed) and anchor to the subject line in the diff, so they post inline like the other code lenses.

**`test-gap` is suppressed while Step 4.5 delegates.** The test viewpoint now has a dedicated owner: `/test-review` runs a five-lens audit over the same change with the subject-symbol and branch×meaning lenses that this one only samples. When Step 4.5 runs the delegation, do **not** spawn `test-gap` — one owner, no double-reporting. Keep `test-gap` only as the fallback for a run where the delegation is declined or unavailable; the Step 1 runner check still gates that fallback.

The `comment-reviewer` prompt MUST include: the base ref + changed-file list + the diff, and the **line policy** (judge only comments on changed lines for a diff scope). The agent already encodes the all-languages-uniform standard (TS/TSX and non-TS alike — shell / `.mjs` / CSS / YAML; non-TS is higher-risk, not exempt), reads `docs/rules.md` (its Comment Rules section, if present) and `AGENTS.md` at runtime as its authoritative policy, and carries the functional-directive / exported-declaration guards — do not re-specify or soften them here. Restrict the file list it sees to comment-bearing source files: exclude generated files (`**/gen/**`, `// Code generated … DO NOT EDIT`), the deny list, and Markdown / docs prose (the comment rules govern source comments, not standalone documents — that is `doc-reviewer`'s job).

## Step 3 — Adversarial Verify

Collect all findings and **dedup** by (file, line, claim). For each surviving finding, spawn one `review-verifier` subagent (concurrently), handing it the single finding + the base ref. Use `agentType: "review-verifier"`, `label` like `verify:<file>`, and the Step 0 user-selected reviewer `model` (same reviewer ≠ implementer rule).

- Keep **CONFIRMED** and **PLAUSIBLE** findings. Drop **REFUTED** (but keep a count for the report).
- For a critical/high finding where a single verdict feels shaky, spawn 2–3 verifiers and go by majority — diversity beats one opinion on the findings that matter.

## Step 4 — Runtime Verification (build + request)

Run this from the **orchestrator (main session)**, not a subagent — it needs interactive bash, a real server process, and possibly user confirmation. It is where the defects Step 2's `runtime-gap` lens only *predicts* get confirmed or dropped — as far as the stage reaches; see "What this stage does NOT reach" under 4-2. Two stages, each with its own gate.

### 4-1 Build verification — whenever app code is touched

Gate: the diff touches `src/**`, `next.config.ts`, `src/proxy.ts`, or `src/instrumentation.ts`.

Run `pnpm build`. This is not a slower `pnpm lint:ci` / `pnpm typecheck` — those are per-file and structurally cannot see the module graph the build assembles:

- **RSC / Client boundary violations** — a `server-only` module reachable from the client graph, `"use client"` on a module that imports server config, a client hook mixed into `adapters/server` (ADR [0024](../../../docs/adr/0024-adapters-server-client-split.md)).
- **Secret leakage into the client bundle** — server config reached from a client-side layer. ADR [0030](../../../docs/adr/0030-environment-variable-management.md) lets only `NEXT_PUBLIC_` literals cross, and the bundle is where the violation actually materializes.
- **Build-time config validation** — `next.config.ts` imports the schema and evaluates it in full (ADR 0030), so a missing or invalid variable fails here and nowhere earlier. Note that ADR 0030's *second* validation point, `src/instrumentation.ts`'s `register()`, runs once at **server start**, not during the build — only Step 4-2 reaches it.
- Route / metadata type errors raised only by the App Router's own generated types.

A build failure **is** a CONFIRMED finding: report it with the output. Do not fix it here — the code lenses are read-only.

### 4-2 Request verification — only when a request-time seam is touched

Gate: Step 1 found a touched Route Handler (`src/app/**/route.ts`), Server Action (`src/features/<name>/actions.ts`), `src/proxy.ts`, response header configuration (`next.config.ts` `headers()`), or layout shell / Provider composition (`src/app/**/layout.tsx`). <!-- skill-lint-ignore -->

1. Start the app built in 4-1: `pnpm start --port <3000+N>`, on a port distinct from other worktrees so a parallel session's server is not the one under test. Run it in the background and stop it when done.
2. `curl -i` the touched path(s) and assert:
   - the happy-path status and body shape;
   - **no raw upstream status leaks** — a backend failure must surface as the normalized `errors` classification, not a pass-through 4xx/5xx (ADR [0071](../../../docs/adr/0071-bff-api-integration.md));
   - the security headers / CSP the change should produce (ADR [0111](../../../docs/adr/0111-csp-security-headers.md) — `next.config.ts` `headers()` is the default seam; a nonce CSP forces every route dynamic, which is itself a finding if unintended);
   - for a path the change intends to protect, that the no-credential request is actually rejected — prove it, do not infer it from reading the handler.
3. **`src/proxy.ts` changes:** exercise both a path the `matcher` selects and one it excludes. A matcher regression is invisible to unit tests and to the build (ADR [0043](../../../docs/adr/0043-middleware-policy.md)).
4. **Layout shell / Provider changes:** request a route beneath the changed layout and confirm it renders — a Provider dropped from the shell leaves a hook without context, which surfaces as a runtime error or an error boundary, not a build failure (ADR [0026](../../../docs/adr/0026-layout-shell-mount.md)).

**What this stage does NOT reach.** It asserts the four points above plus the matcher and shell checks — nothing else. The `runtime-gap` lens can raise categories this stage cannot execute today, chiefly **cache / revalidation** (a mutation that fails to invalidate its tags) and **retry / idempotency / breaker semantics**: both need the `adapters` layer and a backend, and ADR 0071 leaves their concrete shape to the implementation PR. Report those findings as 到達不能 rather than treating an unrun check as a pass.

**There is no backend in this repository** — DB / auth / business logic belong to a separate service (ADR [0011](../../../docs/adr/0011-no-docker.md) / [0070](../../../docs/adr/0070-backend-role-separation.md)), so a Route Handler's upstream call fails unless a stub is configured. That is not a reason to skip the stage: the *failure* path is precisely what ADR 0071's error normalization owns, so assert it. What genuinely cannot be reached without a backend — a real success response, cross-subject authorization — is **stated as 到達不能 in the Step 5 report**. Never simulate it, and never report it as passing.

**Destructive guard:** a Server Action can mutate real backend state. If one is in scope and running it would write to a shared environment, confirm with the user first — ADR [0154](../../../docs/adr/0154-claude-skills-operations.md)'s 商用操作前のユーザ確認 requires it of any skill whose step reaches outside the working tree — and say what the restore path is.

Fold any runtime-confirmed defect into the report as CONFIRMED with the build output / curl evidence.

## Step 4.5 — Delegate the Test Viewpoint to `/test-review`

The test viewpoint is not audited here. `/test-review` owns it, and it goes deeper than this skill's
`test-gap` sample: it builds the subject's exported-symbol table (a symbol with no test at all is
invisible to a test-file-first read) and runs a per-function branch × meaning matrix. Running both
would double-report the same gaps under two vocabularies.

Chain it with a payload so it does not re-ask what this run already resolved:

- `scope` — the resolved file list from Step 1. **Include production files whose paired test does not
  exist**; that absence is precisely what the delegate's symbol lens reports.
- `base_ref` — when this run is in branch-vs-base mode.
- `reviewer_model` — the model resolved in Step 2, so reviewer ≠ implementer holds across the boundary.
- `skip_verifier` — pass through only if this run is skipping verification.

Embed the returned report as a section of the Step 5 report, **keeping its severity vocabulary
intact** (修正必須 / 補完推奨 / 再考 / 追加検討 + criticality). Remapping onto this skill's severities
would lose the distinction between "the rule is violated" and "this branch is unverified".

If the delegation cannot run, say so in the report and fall back to the `test-gap` lens for this run
rather than leaving the viewpoint silently unexamined.

## Step 5 — Synthesize Report (Japanese)

Produce one Japanese report:

```text
## ローカルレビュー結果（reviewer: <model> / implementer: <model>）

スコープ: <base>...HEAD（<N> files） / lens: correctness, security, architecture, runtime-gap, comment-style（テスト観点は /test-review へ委譲）
テスト観点: <4 状態のいずれか。下記の定型から選ぶ>
ランタイム検証: 4-1 build 実施 / 4-2 リクエスト検証 実施（curl）・対象外（リクエスト時 seam の変更なし）・到達不能（バックエンド不在で未検証の経路: <経路>）

### CONFIRMED（要対応）
- [重大度] タイトル — path:行
  - 問題 / 根拠 / 修正案
  - 検証: verifier 判定（+ 該当すれば build / curl 結果）

### PLAUSIBLE（要確認・判断保留）
- ...

### コメント品質（Step 5.5 で適用）
- [重大度] 対象コメント — path:行 / 分類 / 実施したアクション（削除・書換・加筆）

### 補足
- REFUTED: <n> 件（finder が挙げたが verifier が否定）
- ランタイム検証でカバーした経路 / スキップした経路
```

The **`テスト観点:` line is mandatory** and takes exactly one of the four values below, matching the state Step 1 resolved:

- `委譲実施（/test-review Lens 1-5 / CONFIRMED <n>・PLAUSIBLE <m>。レポートは別節に埋め込み）`
- `test-gap レンズのみ（変更シンボルの高シグナル・サブセット。全シンボル網羅は未実施）`
- `未実施（テストのみの変更で委譲できず、test-gap にも対象が無い）`
- `未実施（テスト関連の変更なし）`

It exists for the same reason the runtime line does: without it, a `lens:` list containing `test-gap` reads as "the tests were audited" when only a subset of the changed symbols was looked at, and a run with no test analysis at all leaves no trace. State the weaker case plainly rather than letting the omission pass for coverage.

Order by severity, CONFIRMED before PLAUSIBLE. Always state what runtime checks ran, what was skipped, and **which lenses did not run and why** — silent omission reads as "covered everything" when it was not. In the report, keep the **comment quality** findings in their own subsection — they are *processed* in Step 5.5, not posted to the PR.

## Step 5.5 — Apply Comment Fixes (default; skip with `--no-apply`)

This is the one place the skill mutates source. Apply the verified **comment quality** findings (CONFIRMED, plus any PLAUSIBLE the user opts in) yourself — the `comment-reviewer` subagent never edits. The code lenses are NOT auto-fixed here; they go to Step 6.

Confirm once before editing:

- `AskUserQuestion`: 「コメント指摘 <N> 件をライフサイクル内で修正適用しますか？」 — options: 「すべて適用」 / 「1件ずつ確認」 / 「適用しない（レポートのみ／PR コメント化）」.

Apply the action each finding carries — **削除 (delete)** a bad-content comment, **書換 (rewrite)** to a correct/behavioral What, or **加筆 (enrich)** a thin What / missing non-obvious contract / missing constraint. A `誤り/陳腐化` finding (the What contradicts the code) is corrected, not deleted. Obey these guards (a wrong deletion here is a real regression):

- **Never delete functional / directive comments**: `// @ts-expect-error`, `// @ts-ignore`, `// biome-ignore …`, `// eslint-disable` / `// eslint-disable-next-line` / `/* eslint-disable … */` (ADR [0002](../../../docs/adr/0002-formatter-linter.md) keeps ESLint for the checks biome cannot express), `/** @jsxImportSource … */`, `// prettier-ignore`, `// Code generated … DO NOT EDIT`, shebangs, tool directives in shell / YAML. (`"use client"` / `"use server"` are string directives, not comments — never touch them either.)
- **Never edit a protected path.** `AGENTS.md`'s *AI Modification Scope* and *Protected Documentation* are authoritative: `AGENTS.md` itself, Accepted ADR bodies, `LICENSE`, and anything listed under `.claude/settings.json`'s `permissions.deny` stay untouched even during skill execution. Root config (`package.json` / `tsconfig.json` / `next.config.ts` / `mise.toml` / `biome.json` / `Makefile` / `.makefiles/` / `.github/` / `.claude/`) is lifted only by the temporary pre-v1.0.0 rules — a comment fix is never a good enough reason to reach into one. If a comment finding lands on such a path, report it instead of applying it.
- **Exported declarations**: if the doc comment carries a real contract (error semantics / units / boundaries / side effects), **rewrite or enrich, never delete** — the type signature does not carry it. Delete only when the comment is a pure restatement of the name and type. The `comment-reviewer` marks which case applies on every exported-declaration finding; if it did not, treat it as contract-bearing and rewrite.
- **Keep good comments**: a correct, sufficient What, and a constraint whose premise sits at that call site, are not findings — do not strip them. Rewrites/enrichments describe **What + such a constraint**, never **How** or development 経緯. A rationale whose premise is remote (an upstream service's behavior, an operational policy) is neither demanded nor relocated here — leave it as the reviewer judged it. Comments are written in Japanese (AGENTS.md Language Rules). Edit only in-scope files; never touch generated files, Markdown prose, or the deny list. Use `Edit`, one finding (or one file) at a time.

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

**`gh api` is available for this call.** `.claude/settings.json` allows `Bash(gh api *)` and denies only the shapes that lose committed work: anything containing `DELETE`, and ref manipulation (`git/refs`, whose `force` update is an API-side force push). Posting a review is neither, so it runs. Those denies still hold during skill execution — if a call you need is blocked, surface it and let the user decide. Never re-route a blocked request through `python3` / `pnpm exec tsx` / any other allowed interpreter (that defeats the guard rather than satisfying it), and never edit `permissions.deny` to unblock yourself.

The permission layer is not what makes this safe — a pattern rule cannot tell an advisory review from a destructive write. The control that matters is the single confirmation above, so do not skip it on the grounds that the command is allowed.

**Fallback when the API call fails:** post a single summary comment with `gh pr comment` — the findings grouped by file with `path:line` references instead of true line anchors — and say plainly in the Step 5 report that the findings were summarized, not inlined.

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

   `payload.json`: <!-- skill-lint-ignore -->

   ```json
   {
     "commit_id": "<SHA>",
     "event": "COMMENT",
     "body": "🔎 impl-review (reviewer: <model>) — CONFIRMED <n> / PLAUSIBLE <m>\n\ndiff 外で行アンカー不可の指摘:\n- <path>: <要約>",
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

   Use `event: "COMMENT"` — this is an advisory review, never `REQUEST_CHANGES` / `APPROVE`. Prefix every comment body with `🔎 impl-review` (or the `🔎 [verdict · severity]` tag) so the posts are distinguishable from human review.

4. Robustness: if the API rejects the batch (422 — a line is not in the diff), move the offending comment(s) to the summary `body` and retry. Report afterward what was posted inline vs. summarized — never silently drop a finding.

## Do / Do NOT

- ✅ Guarantee reviewer model ≠ implementer model (user selects it in Step 0; warn + confirm if they pick the implementer's model).
- ✅ Run finders concurrently (one message, multiple `Agent` calls): the code lenses via `adversarial-reviewer`, comment quality via `comment-reviewer`.
- ✅ Independently verify every finding before reporting; drop REFUTED.
- ✅ Run `pnpm build` (Step 4-1) whenever app code is touched, and the request stage (Step 4-2) when a request-time seam is.
- ✅ When a generated artifact changed, widen the *finders'* read scope (Step 1) to every consumer that imports it — Step 4 does not widen; it verifies the paths it can reach.
- ✅ State a path as 到達不能 when the missing backend blocks it — never simulate it, never call it passing.
- ✅ Confirm with the user before running a Server Action that would mutate shared backend state.
- ✅ Apply comment quality findings in Step 5.5 after one confirmation (delete / rewrite / enrich), then `pnpm fix` + `pnpm lint:ci`; skip with `--no-apply`.
- ✅ By default, post the code lenses' CONFIRMED + PLAUSIBLE findings to the branch's PR as inline review comments (Step 6); suppress with `--no-comment` or when no open PR exists.
- ✅ Confirm once before posting to the PR (outward action); anchor each comment to its `path:line`, fold off-diff findings into the review summary.
- ✅ Redact secret-shaped values out of every finding body before posting — this repository is public and a post cannot be retracted.
- ❌ Skip the Step 6 confirmation because `gh api` is allowed — the permission rule is not the safety control, the confirmation is.
- ❌ Route a denied command through an allowed interpreter, or edit `permissions.deny` to unblock yourself — surface the block and offer the summary-comment fallback instead.
- ✅ State in the report which lenses did not run and why, and whether the test viewpoint came from the `/test-review` delegation or the `test-gap` fallback.
- ❌ Post REFUTED findings, or use `REQUEST_CHANGES` / `APPROVE` — the posted review is advisory `COMMENT` only.
- ❌ Auto-fix the code lenses — those are reported, the user fixes. Only comment quality is auto-applied (Step 5.5).
- ❌ In Step 5.5, delete a functional directive (`// biome-ignore` etc.) or a contract-bearing exported doc comment (rewrite it); touch generated files / Markdown / the deny list; or auto-commit.
- ❌ Spawn `test-gap` while the `/test-review` delegation runs — the two would report the same gaps under different vocabularies.
- ❌ Let a reviewer run on the same model as the implementer.
- ❌ Report speculative style nits as findings, or pad the list to look thorough.
- ❌ Edit generated files or anything in the deny list while verifying.

## Checklist

- [ ] Scope confirmed via `AskUserQuestion`; base ref resolved.
- [ ] Reviewer model selected in Step 0 and verified ≠ implementer model (warn + confirm if same).
- [ ] Finders fanned out concurrently: code lenses (`adversarial-reviewer`) + comment quality (`comment-reviewer`); `test-gap` only as the fallback when the Step 4.5 delegation could not run.
- [ ] Every finding independently verified; REFUTED dropped (count kept).
- [ ] Step 4-1 `pnpm build` run when app code was touched; Step 4-2 curl run when a request-time seam was; 到達不能 paths named; a mutating Server Action confirmed before running.
- [ ] Single Japanese report: CONFIRMED → PLAUSIBLE, comment findings in their own subsection, runtime coverage and skipped lenses stated.
- [ ] Unless `--no-apply`: comment findings applied in Step 5.5 (functional directives untouched, contract-bearing exported doc comments rewritten not deleted), then `pnpm fix` + `pnpm lint:ci`; no auto-commit.
- [ ] Unless `--no-comment` / no PR: confirmed once, then posted the code lenses' CONFIRMED + PLAUSIBLE as inline PR comments (off-diff → summary body); REFUTED excluded; `event: COMMENT`.
