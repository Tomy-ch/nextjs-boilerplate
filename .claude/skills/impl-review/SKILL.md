---
name: impl-review
description: Local adversarial, low-bias code review of the current change, run by subagents on a DIFFERENT model than the implementer. Mirrors `/code-review`'s finder → verify shape but keeps everything local and adds a runtime stage that mocked tests cannot cover. Confirms scope via `AskUserQuestion` (changed files vs branch-vs-base diff vs specific paths), fans out `adversarial-reviewer` subagents — one per lens (correctness / security / architecture / cohesion / runtime-gap / test-gap, where `cohesion` flags a unit holding several reasons to change — the within-module counterpart to `architecture`, which owns cross-kernel placement — and requires each finding to name two distinct reasons so it cannot decay into taste, and where `test-gap` is a code-origin pass that reads the changed production source and flags reachable branches / whole changed symbols left untested or vacuously asserted) — plus the dedicated `comment-reviewer` subagent for comment quality, each on a user-selected model (fable / sonnet / opus / haiku; default auto = a model ≠ the implementer) so reviewer ≠ implementer — then verifies each finding with an independent `review-verifier` subagent (CONFIRMED / PLAUSIBLE / REFUTED) and synthesizes a single Japanese report. Comment quality is not just reported but PROCESSED inside the lifecycle: CONFIRMED comment findings are auto-fixed in the working tree after one confirmation (delete / rewrite / enrich, with guards — never remove functional directives like `// @ts-expect-error` / `// biome-ignore`, rewrite-or-enrich rather than delete an exported declaration's contract-bearing TSDoc, skip generated files / Markdown prose / the deny list), then `pnpm fix` + `pnpm lint:ci` verify. The other lenses stay read-only on source (no auto-fix). By default the surviving CONFIRMED / PLAUSIBLE findings from the read-only lenses are posted to the branch's PR as inline review comments anchored to each finding's line (opt out with `--no-comment`; comment-style findings are applied, not posted). Step 0 asks a third question — also default yes — about the OTHER half of the comment subject: `comment-reviewer` judges what the diff ADDED, while Step 6 chains `/comment-sweep` with a `scope` / `mode` / `base_ref` / `hold` / `claimed` payload over the comment STOCK the touched files carry, in 確認して適用 (default) or 報告のみ but never the unattended 自動適用, and a mandatory `コメント在庫:` line records which of the three states applied so an unswept stock cannot read as a swept one. Use before commit / PR to get an independent second opinion that the implementer's own model would not surface. Flags: `--no-comment` (skip PR posting), `--no-apply` (report comment-style findings instead of auto-fixing).
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
- Applying non-comment fixes — for the code lenses this skill is read-only; it reports, the user fixes. (Exception: **comment-style findings are auto-applied** in Step 8 — verbose / narrating comments are actually fixed, not just reported.)

## Core Idea — reviewer ≠ implementer

Bias reduction is the design constraint, not a nicety. Reviewers therefore run as **subagents on a different model than whoever wrote the code**:

- The reviewer agents (`adversarial-reviewer`, `comment-reviewer`, `review-verifier`) default to **`sonnet`** in their frontmatter, which differs from the usual Opus implementer.
- **The reviewer model is chosen by the user in Step 0.** The options are `fable` (Fable 5) / `sonnet` / `opus` / `haiku`, plus an *auto* default that resolves to a model ≠ the session's implementer. Pass the chosen model to every reviewer subagent via the `Agent` tool's `model` parameter (it takes precedence over the agent file's `sonnet` default) — e.g. `opus` for depth, `haiku` for a cheap divergent pass, `fable` for a fresh independent perspective.
- **The orchestrator MUST guarantee reviewer ≠ implementer.** If the user selects the same model as the session's implementer, warn that it undermines the different-model bias reduction and confirm before proceeding. Never silently let reviewer and implementer be the same model.
- Reviewer subagents are **read-only** (their agent files grant no Edit/Write) — they only return findings. Source is mutated in exactly two places, both by the **orchestrator** (never a subagent) and both gated on an explicit confirmation: Step 8 applies the verified comment-style fixes, and Step 6 writes whatever the user approves inside the delegated `/comment-sweep` run. The code lenses are never auto-fixed.

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

### Comment-stock delegation

In the same `AskUserQuestion` call (a third question), ask whether to delegate the comment stock of
the touched files to `/comment-sweep`. Ask it **unconditionally** — the file-set predicate that
decides whether the delegation has anything to chew on is resolved in Step 1, after this call:

```text
質問: 触れたファイルのコメント在庫を /comment-sweep へ委譲しますか？（既定: 委譲する（確認して適用））
選択肢:
  - 委譲する（確認して適用。Step 6 で確認を取って書き換える）  ← 既定
  - 委譲する（報告のみ。書き込まず検出結果だけ出す）
  - 委譲しない
```

`/comment-sweep`'s third mode, 自動適用, is deliberately absent. Every reviewer here is read-only on
source and every write this skill performs is gated on an explicit confirmation; a delegated sweep
writing unattended would be the one write nobody agreed to.

What the delegation adds is the other half of one subject:

| | What it looks at |
| --- | --- |
| `comment-reviewer` (Step 2) | the comments the diff **added** — their quality |
| `/comment-sweep` (Step 6) | the comment stock the touched files **carry** — its jurisdiction |

### Flags

- `--no-comment` — suppress Step 9 (do not post to the PR); produce the local report only. **Default is opt-out**: when an open PR exists for the current branch, Step 9 posts the surviving findings as inline review comments unless this flag is given.
- `--no-apply` — suppress Step 8 (do not auto-fix comment findings); instead report them and let them flow into Step 9 (PR post) like the other lenses. **Default is to apply**: comment quality findings are auto-fixed in the working tree after one confirmation.

## Step 1 — Gather Context

- Resolve the base ref and produce the review target: `git diff <base>...HEAD` (or `git diff` for uncommitted), plus the changed-file list (`git diff --name-only ...`).
- Detect which **kernels / elements** are touched. The inventory is ADR [0027](../../../docs/adr/0027-directory-structure.md)'s physical layout, and what each may import is ADR [0021](../../../docs/adr/0021-frontend-responsibility.md)'s dependency matrix: `src/app/**` (3 elements — route-segment `page`/`layout`, route-handler `route.ts`, metadata), `src/features/<name>/**`, `src/model/**`, `src/components/**`, `src/adapters/server/**` · `src/adapters/client/**`, `src/capabilities/**`, `src/stores/**`, `src/config/**`, `src/errors/**`, `src/logging/**`, `src/observability/**` — plus the **boot / build boundary entries that sit outside the kernels**: `src/proxy.ts`, `src/instrumentation.ts`, `next.config.ts`. Several kernels are not on disk yet (ADR 0027 creates each when its decision lands); detect what exists rather than assuming the full set.
- Note whether a **request-time seam** is touched — a Route Handler (`src/app/**/route.ts`), a Server Action (`src/features/<name>/actions.ts`), `src/proxy.ts`, the response header configuration (`next.config.ts` `headers()`), or the **layout shell / Provider composition** (`src/app/**/layout.tsx` — ADR [0026](../../../docs/adr/0026-layout-shell-mount.md); a missing Provider only fails when the route actually renders). This decides whether Step 4-2 runs. <!-- skill-lint-ignore -->
- Note whether a **generated API artifact** is touched (`**/gen/**` — the types / zod schemas of ADR [0072](../../../docs/adr/0072-api-type-generation.md)). A regenerated artifact ripples to every consumer, so widen the review to the `adapters` conversions and features that import it, not just the changed file.
- Note whether any **non-generated production `.ts` / `.tsx` under `src/**`** is touched (exclude `*.test.ts(x)` / `*.spec.ts(x)` / `**/gen/**` / files carrying a `Code generated … DO NOT EDIT` banner) — this feeds the `test-gap` lens its changed-symbol list.
- Note separately whether any **`*.test.ts(x)` / `*.spec.ts(x)`** is touched. Together with the previous bullet this resolves the **test-viewpoint predicate**: `production source touched OR test file touched`. A test-only change satisfies it through the second disjunct alone — which is exactly the case `test-gap` cannot see, since it reads production source. Which of four states holds decides who owns the viewpoint:
  - Predicate true **and** the Step 5 delegation runs → the delegate owns it; `test-gap` does **not** run.
  - Predicate true, delegation unavailable, **production source touched** → `test-gap` runs as the high-signal subset.
  - Predicate true, delegation unavailable, **only test files touched** → **neither runs.** `test-gap` would have no symbol to enumerate and return an empty result that reads as a clean audit. This is the one state where the test viewpoint goes entirely unexamined — say so on the `テスト観点:` line instead of letting an empty lens stand in for it.
  - Predicate false → neither runs; there is no test viewpoint to audit.
- Check whether a **test runner is configured at all**: a `test` script in `package.json`, or any `*.test.ts(x)` / `*.spec.ts(x)` in the tree. If neither exists, the `test-gap` lens is **disabled** for this run (see Step 2) — say so in the Step 7 report rather than silently skipping it.
- Resolve the **sweep scope** for Step 6: the changed comment-bearing source files — non-generated `.ts` / `.tsx` (excluding `*.test.ts(x)` / `*.spec.ts(x)` / `**/gen/**` / files carrying a `Code generated … DO NOT EDIT` banner) plus the non-TS sources that carry comments (shell, `.mjs` / `.cjs`, CSS, YAML), minus the deny list and Markdown / docs prose. This is the same exclusion set Step 2 applies to `comment-reviewer`, less the tests — `/comment-sweep` does not sweep test files. An empty sweep scope means Step 6 does not run whatever was chosen in Step 0, and Step 7 says so on the `コメント在庫:` line.

## Step 2 — Fan-out Finders (different model, concurrent)

Spawn all finders concurrently (issue every `Agent` call in a single message). Pass the Step 0 user-selected reviewer model to every `Agent` call via the `model` parameter (omit only when *auto* already resolves to the agent-file default). Two agent types:

- The **code lenses** run `adversarial-reviewer` — one per lens, `agentType: "adversarial-reviewer"`, `label` like `find:security`.
- The **comment dimension** runs the dedicated `comment-reviewer` — `agentType: "comment-reviewer"`, `label: "find:comment"`. This is the stronger, comment-focused agent (a richer taxonomy than a one-paragraph lens), and its findings feed the Step 8 auto-fix.

| Finder | Agent | Run when |
| --- | --- | --- |
| `correctness` | adversarial-reviewer | always |
| `security` | adversarial-reviewer | always (especially when a Route Handler / Server Action / `src/proxy.ts` / auth / a generated API request-response type is touched) |
| `architecture` | adversarial-reviewer | always |
| `cohesion` | adversarial-reviewer | always |
| `runtime-gap` | adversarial-reviewer | when a Route Handler / Server Action / `src/proxy.ts` / Provider mount / generated API artifact is touched — the seams a mocked component test does not exercise |
| `test-gap` | adversarial-reviewer | **fallback only** — spawn it when Step 5's delegation to `/test-review` could not run. Otherwise the test viewpoint belongs to the delegate |
| comment quality | **comment-reviewer** | when the diff adds / changes any code comment (almost always) |

Each `adversarial-reviewer` prompt MUST include: the lens name + its definition, the base ref + changed-file list + the diff, and pointers to `AGENTS.md` / the relevant `README.md` / the governing ADRs.

**`cohesion` lens definition.** `architecture` asks *which layer owns this*; `cohesion` asks *how many different asks would land on this same function or file*. The two never overlap, and the gap between them is real: a unit can sit in exactly the right kernel and pass `eslint-plugin-boundaries` and `pnpm check:architecture` while still forcing whoever revises an error's wording to read the code that talks to the network. Nothing in the toolchain sees that, and `full-verify`'s `impl-verifier` — which does own cleanliness and maintainability — only runs over the whole repository, so without this lens the finding waits for an audit instead of surfacing on the diff that introduced it.

The discipline that keeps it from becoming taste: every finding must **name two distinct reasons to change and who would ask for each**, then name the seam. A finding that cannot be stated that way is dropped, the same way a `correctness` finding without a failing input is dropped. Splitting is not free — each seam is one more file to open before the whole picture is visible — so the two reasons are what pays for it. Length alone is never a finding.

**`test-gap` lens definition** (this lens is *code-origin* — it reads the changed production source, not the test files): for each production symbol added or changed in the diff, enumerate its logical branches / thrown error types / boundary conditions / null-and-undefined defenses, then check the paired test reaches each and *distinctly* asserts it — the specific error class (`await expect(fn()).rejects.toThrow(SpecificError)`), the distinguishing value or rendered state, not a bare `expect(fn).toThrow()` / `toBeTruthy()`. Report two shapes: a production symbol changed in the diff with **no test at all**, and a reachable branch of a changed symbol left **untested or vacuously asserted**. This is a **high-signal subset** — flag the reachable gaps on the *changed* code; it does NOT do exhaustive per-symbol enumeration across a module. Findings are read-only suggestions (never auto-fixed) and anchor to the subject line in the diff, so they post inline like the other code lenses.

**`test-gap` is suppressed while Step 5 delegates.** The test viewpoint now has a dedicated owner: `/test-review` runs a five-lens audit over the same change with the subject-symbol and branch×meaning lenses that this one only samples. When Step 5 runs the delegation, do **not** spawn `test-gap` — one owner, no double-reporting. Keep `test-gap` only as the fallback for a run where the delegation is declined or unavailable; the Step 1 runner check still gates that fallback.

The `comment-reviewer` prompt MUST include: the base ref + changed-file list + the diff, and the **line policy** (judge only comments on changed lines for a diff scope). The agent already encodes the all-languages-uniform standard (TS/TSX and non-TS alike — shell / `.mjs` / CSS / YAML; non-TS is higher-risk, not exempt), reads `docs/rules.md` (its Comment Rules section, if present) and `AGENTS.md` at runtime as its authoritative policy, and carries the functional-directive / exported-declaration guards — do not re-specify or soften them here. Restrict the file list it sees to comment-bearing source files: exclude generated files (`**/gen/**`, `// Code generated … DO NOT EDIT`), the deny list, and Markdown / docs prose (the comment rules govern source comments, not standalone documents — that is `doc-reviewer`'s job).

## Step 3 — Adversarial Verify

Collect all findings and **dedup** by (file, line, claim). For each surviving finding, spawn one `review-verifier` subagent (concurrently), handing it the single finding + the base ref. Use `agentType: "review-verifier"`, `label` like `verify:<file>`, and the Step 0 user-selected reviewer `model` (same reviewer ≠ implementer rule).

- Keep **CONFIRMED** and **PLAUSIBLE** findings. Drop **REFUTED** (but keep a count for the report).
- For a critical/high finding where a single verdict feels shaky, spawn 2–3 verifiers and go by majority — diversity beats one opinion on the findings that matter.

### Resolve the held-back files

Once the surviving findings are known, list the files a CONFIRMED `architecture` / `correctness`
finding is likely to rewrite. **Resolve this list once, here.** Step 6 receives it as its `hold`
payload and Step 8 excludes the same files — a comment polished onto code that is about to change
is work done twice, and the resulting diff of comment edits buries the finding that matters.
Deriving the list separately in each step lets the two hold back different files and the report
contradict itself. Name the held-back files and the reason in the Step 7 report; they are re-offered
once the finding they wait on is resolved.

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

**There is no backend in this repository** — DB / auth / business logic belong to a separate service (ADR [0011](../../../docs/adr/0011-no-docker.md) / [0070](../../../docs/adr/0070-backend-role-separation.md)), so a Route Handler's upstream call fails unless a stub is configured. That is not a reason to skip the stage: the *failure* path is precisely what ADR 0071's error normalization owns, so assert it. What genuinely cannot be reached without a backend — a real success response, cross-subject authorization — is **stated as 到達不能 in the Step 7 report**. Never simulate it, and never report it as passing.

**Destructive guard:** a Server Action can mutate real backend state. If one is in scope and running it would write to a shared environment, confirm with the user first — ADR [0154](../../../docs/adr/0154-claude-skills-operations.md)'s 商用操作前のユーザ確認 requires it of any skill whose step reaches outside the working tree — and say what the restore path is.

Fold any runtime-confirmed defect into the report as CONFIRMED with the build output / curl evidence.

## Step 5 — Delegate the Test Viewpoint to `/test-review`

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

Embed the returned report as a section of the Step 7 report, **keeping its severity vocabulary
intact** (修正必須 / 補完推奨 / 再考 / 追加検討 + criticality). Remapping onto this skill's severities
would lose the distinction between "the rule is violated" and "this branch is unverified".

If the delegation cannot run, say so in the report and fall back to the `test-gap` lens for this run
rather than leaving the viewpoint silently unexamined.

## Step 6 — Delegate the Comment Stock to `/comment-sweep`

Run this when the Step 1 sweep scope is non-empty **and** the user chose to delegate in Step 0. It
sits here because Step 3 has already settled the findings it must respect, and because the
interactive approval loop it may open belongs after the read-only delegation of Step 5 rather than
interleaved with it — and before Step 7, so its result is reported rather than appended.

`comment-reviewer` (Step 2) judges the comments this diff **added**. It cannot judge the comments the
touched files already **carry**, and it cannot issue the verdict those often need — **移設**, moving a
rationale into the ADR or README that owns it — because that requires writing the destination
document, which a read-only reviewer must not do.

Invoke the `comment-sweep` skill via the Skill tool with:

- `scope` — the Step 1 sweep scope. The subject is the **whole comment stock of those files**, not
  the changed lines; the changed lines already had their pass in Step 2.
- `mode` — `confirm` or `report`, per the Step 0 choice. Never `apply`.
- `base_ref` — the base resolved in Step 1.
- `hold` — the files held back after Step 3 because a surviving CONFIRMED finding is likely to
  rewrite them. This is the same list Step 8 excludes — resolve it once and pass it to both, or the
  two will hold back different files and the report will contradict itself.
- `claimed` — the `path:line` of every comment a surviving `comment-reviewer` finding already owns.
  Without it the fold below is a rule with nothing to execute it: the sweep reads the whole file, so
  it lands on the changed lines too, and the collision is structural rather than rare.

The chain is **sequential and inline**, the shape every chain in this repo uses. In `report` mode the
delegated run writes nothing; in `confirm` mode it writes only what the user approved, including a
移設 into a destination document — the user chose the dialogue, so the sweep's own ADR question is not
suppressed.

**One comment, one reporter.** A comment on a changed line belongs to `comment-reviewer` (applied in
Step 8); the sweep's subject is the stock around it. The `claimed` payload is what makes this
executable — the delegated run drops those comments before its approval loop opens, so the user is
never asked about one comment twice and Step 8 never edits around a rewrite Step 6 just made. The
one exception runs the other way: when the sweep's verdict is **移設** and `comment-reviewer`'s is
削除 / 書換, keep the 移設. 移設 already contains the shortening, and dropping it would discard the only
verdict that can move a rationale to the document that owns it — the whole reason the sweep exists.

Embed the returned report as a section of the Step 7 report, keeping the sweep's verdict vocabulary
(維持 / 削除 / 書換 / 移設) intact. Skip the delegation when the change touches no source comments at
all, and say so on the `コメント在庫:` line rather than leaving it silent.

## Step 7 — Synthesize Report (Japanese)

Produce one Japanese report:

```text
## ローカルレビュー結果（reviewer: <model> / implementer: <model>）

スコープ: <base>...HEAD（<N> files） / lens: correctness, security, architecture, cohesion, runtime-gap, comment-style（テスト観点は /test-review へ委譲）
テスト観点: <4 状態のいずれか。下記の定型から選ぶ>
コメント在庫: <3 状態のいずれか。下記の定型から選ぶ>
ランタイム検証: 4-1 build 実施 / 4-2 リクエスト検証 実施（curl）・対象外（リクエスト時 seam の変更なし）・到達不能（バックエンド不在で未検証の経路: <経路>）

### CONFIRMED（要対応）
- [重大度] タイトル — path:行
  - 問題 / 根拠 / 修正案
  - 検証: verifier 判定（+ 該当すれば build / curl 結果）

### PLAUSIBLE（要確認・判断保留）
- ...

### コメント品質（Step 8 で適用）
- [重大度] 対象コメント — path:行 / 分類 / 実施したアクション（削除・書換・加筆）

### コメント在庫（/comment-sweep 委譲結果）
- <委譲したときのみ。確認して適用: 判定の内訳・適用した内容・保留したファイル。報告のみ: comment-sweep が返した finding 全文をそのまま埋め込む>

### 補足
- REFUTED: <n> 件（finder が挙げたが verifier が否定）
- ランタイム検証でカバーした経路 / スキップした経路
```

The **`コメント在庫:` line is mandatory** and takes exactly one of:

- `掃引実施（/comment-sweep <確認して適用|報告のみ> / 維持 <a>・削除 <b>・書換 <c>・移設 <d>）`
- `未実施（ソースのコメントに触れる変更なし）`
- `未実施（委譲しなかった / 委譲が動かせず、在庫は未判定）`

The third value covers both declining the delegation and being unable to run it — say which inside
the same parenthesis. Without this line, a review that only ever looked at the added comments reads
as one that swept the file, which is the exact confusion `comment-reviewer` and `/comment-sweep`
split the subject to avoid.

The **`テスト観点:` line is mandatory** and takes exactly one of the four values below, matching the state Step 1 resolved:

- `委譲実施（/test-review Lens 1-5 / CONFIRMED <n>・PLAUSIBLE <m>。レポートは別節に埋め込み）`
- `test-gap レンズのみ（変更シンボルの高シグナル・サブセット。全シンボル網羅は未実施）`
- `未実施（テストのみの変更で委譲できず、test-gap にも対象が無い）`
- `未実施（テスト関連の変更なし）`

It exists for the same reason the runtime line does: without it, a `lens:` list containing `test-gap` reads as "the tests were audited" when only a subset of the changed symbols was looked at, and a run with no test analysis at all leaves no trace. State the weaker case plainly rather than letting the omission pass for coverage.

Order by severity, CONFIRMED before PLAUSIBLE. Always state what runtime checks ran, what was skipped, and **which lenses did not run and why** — silent omission reads as "covered everything" when it was not. In the report, keep the **comment quality** findings in their own subsection — they are *processed* in Step 8, not posted to the PR. The same holds for the sweep section: its verdicts stay in `/comment-sweep`'s vocabulary (維持 / 削除 / 書換 / 移設), and the section is omitted entirely when Step 6 did not run (the `コメント在庫:` line already carries that fact).

## Step 8 — Apply Comment Fixes (default; skip with `--no-apply`)

This is the one place the skill mutates source **on its own account**. Apply the verified **comment quality** findings (CONFIRMED, plus any PLAUSIBLE the user opts in) yourself — the `comment-reviewer` subagent never edits. The code lenses are NOT auto-fixed here; they go to Step 9.

Sweep findings are not re-applied here: in `confirm` mode Step 6 already wrote what the user approved, and in `report` mode they were deliberately left alone. This step's subject is the `comment-reviewer` findings only.

**Exclude the held-back files.** Reuse the list resolved after Step 3 — the one Step 6 received as `hold` — rather than deriving it again, and state the excluded files and the reason in the report.

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

If `--no-apply`, skip this step and instead let the comment findings flow into Step 9 (posted to the PR like the other lenses). If **both** `--no-apply` and `--no-comment` are given, nothing consumes them — list them in full in the Step 7 local report instead, and retitle that subsection 「コメント品質（未適用・未投稿）」 so it does not claim an apply that never happened.

## Step 9 — Post Findings as Inline PR Comments (default; opt out with `--no-comment`)

By default, after Step 8, post the surviving **CONFIRMED + PLAUSIBLE** findings **from the code lenses** (correctness / security / architecture / cohesion / runtime-gap / test-gap) to the branch's PR as **inline review comments** — one per finding, anchored to its `path:line`, instead of a single wall-of-text comment. **Never post REFUTED.** Comment quality findings are NOT posted here — they were applied in Step 8 (unless `--no-apply` was given, in which case include them in this post). The Step 7 local report is still produced regardless; this step is additive.

**Sweep findings (Step 6) are never posted.** The stock is not what this change introduced, so it is standing debt this PR neither brought in nor is the place to argue about — including the part that sits on changed lines. State the count in the local report so the omission is visible.

Skip this step entirely when:

- invoked with `--no-comment`, OR
- no open PR exists for the current branch (`gh pr view` returns nothing) — keep the local report only and optionally offer to open a PR.

Posting to GitHub is an outward-facing action, so confirm **once** before posting — show the count and the target PR (`AskUserQuestion`: 「<N> 件の指摘を PR #<番号> にインラインコメントとして投稿しますか？」/「投稿する」「投稿しない（ローカルレポートのみ）」).

**Redact before posting.** This repository is public, and a `security` finding quotes the very thing it flags — a leaked token, a hardcoded credential, a PII sample. Posting that verbatim republishes the secret in a place that cannot be retracted. Before building the payload, rewrite every finding body so the evidence is described, not reproduced: replace concrete secret-shaped values with `***REDACTED***` and cite `path:line` instead. A finding whose point cannot survive redaction (the value *is* the finding) stays in the local report only — say so in the summary rather than posting it.

**`gh api` is available for this call.** `.claude/settings.json` allows `Bash(gh api *)` and denies only the shapes that lose committed work: anything containing `DELETE`, and ref manipulation (`git/refs`, whose `force` update is an API-side force push). Posting a review is neither, so it runs. Those denies still hold during skill execution — if a call you need is blocked, surface it and let the user decide. Never re-route a blocked request through `python3` / `pnpm exec tsx` / any other allowed interpreter (that defeats the guard rather than satisfying it), and never edit `permissions.deny` to unblock yourself.

The permission layer is not what makes this safe — a pattern rule cannot tell an advisory review from a destructive write. The control that matters is the single confirmation above, so do not skip it on the grounds that the command is allowed.

**Fallback when the API call fails:** post a single summary comment with `gh pr comment` — the findings grouped by file with `path:line` references instead of true line anchors — and say plainly in the Step 7 report that the findings were summarized, not inlined.

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
- ✅ Ask about the comment-stock delegation in Step 0 (default: 委譲する（確認して適用）) and, when it is taken, run Step 6 with `scope` / `mode` / `base_ref` / `hold` / `claimed`.
- ✅ State the comment stock's state on the `コメント在庫:` line of every report — including the runs where nothing was swept.
- ✅ Apply comment quality findings in Step 8 after one confirmation (delete / rewrite / enrich), then `pnpm fix` + `pnpm lint:ci`; skip with `--no-apply`.
- ✅ By default, post the code lenses' CONFIRMED + PLAUSIBLE findings to the branch's PR as inline review comments (Step 9); suppress with `--no-comment` or when no open PR exists.
- ✅ Confirm once before posting to the PR (outward action); anchor each comment to its `path:line`, fold off-diff findings into the review summary.
- ✅ Redact secret-shaped values out of every finding body before posting — this repository is public and a post cannot be retracted.
- ❌ Skip the Step 9 confirmation because `gh api` is allowed — the permission rule is not the safety control, the confirmation is.
- ❌ Route a denied command through an allowed interpreter, or edit `permissions.deny` to unblock yourself — surface the block and offer the summary-comment fallback instead.
- ✅ State in the report which lenses did not run and why, and whether the test viewpoint came from the `/test-review` delegation or the `test-gap` fallback.
- ❌ Post REFUTED findings, or use `REQUEST_CHANGES` / `APPROVE` — the posted review is advisory `COMMENT` only.
- ❌ Auto-fix the code lenses — those are reported, the user fixes. Only comment quality is auto-applied (Step 8).
- ❌ In Step 8, delete a functional directive (`// biome-ignore` etc.) or a contract-bearing exported doc comment (rewrite it); touch generated files / Markdown / the deny list; or auto-commit.
- ❌ Spawn `test-gap` while the `/test-review` delegation runs — the two would report the same gaps under different vocabularies.
- ❌ Delegate to `/comment-sweep` in its 自動適用 mode, report one comment from both `comment-reviewer` and the sweep, or post a sweep finding to the PR.
- ❌ Auto-apply comment fixes to a file a surviving CONFIRMED finding is likely to rewrite, or derive the held-back list separately in Step 6 and Step 8.
- ❌ Let a reviewer run on the same model as the implementer.
- ❌ Report speculative style nits as findings, or pad the list to look thorough.
- ❌ Edit generated files or anything in the deny list while verifying.

## Checklist

- [ ] Scope confirmed via `AskUserQuestion`; base ref resolved.
- [ ] Reviewer model selected in Step 0 and verified ≠ implementer model (warn + confirm if same).
- [ ] Finders fanned out concurrently: code lenses (`adversarial-reviewer`) + comment quality (`comment-reviewer`); `test-gap` only as the fallback when the Step 5 delegation could not run.
- [ ] Comment-stock delegation asked in Step 0; sweep scope resolved in Step 1; the resulting state recorded.
- [ ] Every finding independently verified; REFUTED dropped (count kept).
- [ ] Held-back files resolved once after Step 3 and used by both Step 6 (`hold`) and Step 8.
- [ ] Step 4-1 `pnpm build` run when app code was touched; Step 4-2 curl run when a request-time seam was; 到達不能 paths named; a mutating Server Action confirmed before running.
- [ ] Step 6 ran when delegated, with `scope` / `mode` (never `apply`) / `base_ref` / `hold` / `claimed` passed.
- [ ] Single Japanese report: CONFIRMED → PLAUSIBLE, comment findings in their own subsection, runtime coverage and skipped lenses stated, `コメント在庫:` line present with one of its three states.
- [ ] Unless `--no-apply`: comment findings applied in Step 8 (functional directives untouched, contract-bearing exported doc comments rewritten not deleted), then `pnpm fix` + `pnpm lint:ci`; no auto-commit.
- [ ] Unless `--no-comment` / no PR: confirmed once, then posted the code lenses' CONFIRMED + PLAUSIBLE as inline PR comments (off-diff → summary body); REFUTED excluded; `event: COMMENT`.
