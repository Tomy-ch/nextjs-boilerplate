---
name: arch-check
usage-class: situational
description: >-
  Exhaustive layer-compliance audit: checks each in-scope kernel's files against the `## Audit Criteria` table
  of that kernel's own README, read at runtime — one row per `forbidden` tag plus the principles an import
  rule cannot express. Fans out the read-only `arch-auditor` agent in parallel, one per kernel, hands every
  auditor one static verdict, and reports `violation` / `suggestion` per kernel in Japanese. Report-only.
  Use it after a multi-kernel change, before a release, or on 「層の規約に沿っているか見て」「README の受け入れ範囲に収まってる？」「アーキ監査して」.
  Do NOT use it for design soundness (`full-verify`), a diff's correctness or security (`impl-review`), or
  README ↔ code drift (`back-prop`).
argument-hint: '[--scope=changed|full] [kernel...]'
---

# Arch Check

Integrator for the per-kernel layer audit. Fans out read-only auditors in parallel, one per kernel,
and aggregates what they return. It decides nothing about the code and writes nothing to it.

A Japanese reference translation lives at `SKILL.ja.md` in this directory (for human reference only;
not loaded as a skill).

## When to Use

- After a change that touched several kernels, before the pull request is reviewed.
- Before a release, as the one pass that reads every kernel against its README.
- When a kernel README's `## Audit Criteria` table changed — the criteria moved, so the whole kernel is
  read again.

To audit a single kernel, run this integrator and name that kernel in the scope question.

## Contract

| | |
| --- | --- |
| **Owns** | カーネルのコードと、そのカーネル README の「Audit Criteria」の突き合わせ。表そのものの欠け（`forbidden` タグに行が無い）の検出 |
| **Never** | ソース・README・PR への書き込み / 規則をこのスキルや agent に写すこと / auditor にゲートを回させること |
| **Starts when** | 複数カーネルを触った変更の後、リリース前、あるいは「Audit Criteria」の表が変わったとき |
| **Stops when** | 集約した報告を返したとき。直すのは user |

## Do NOT use this skill for

- **Import direction.** `pnpm check:architecture` and ESLint boundaries settle it deterministically;
  this skill relays their verdict and never re-derives it.
- **Design soundness** — `full-verify` Pass 1.
- **Reviewing a diff's correctness, security or runtime behaviour** — `impl-review`.
- **Drift between what a README states and what the code does** — `back-prop`. When an auditor finds a
  rule the README states but the table lacks, it reports it; growing the table is the README owner's
  call, not a finding here.

## Division of labour

Four passes look at structure. Each owns one question, and none repeats another's:

| Pass | Question | Subject |
| --- | --- | --- |
| **`arch-check`** (this skill) | Does each file stay inside what its kernel README accepts? Exhaustive, row by row | The kernel's files, against the README's `## Audit Criteria` table |
| `full-verify` Pass 1 | Is the structure itself sound — declared intent against actual structure, responsibility placement, abstraction? | The whole tree, as design |
| `impl-review` `architecture` lens | Does this change leak a type, misplace a responsibility, or invert a dependency only nominally? | The diff, semantically |
| [`type-design-reviewer`](../../agents/type-design-reviewer.md) | How strongly does each type state what it guarantees? Scored by degree | `src/model/**` — run from here **only under full scope** |

The type-design pass rides along only under full scope because a diff already reaches it through
`impl-review`; running it from here on the same diff would report the same finding twice with no way
for the reader to tell whose it is. A question with no diff behind it — "is `model` well typed as it
stands?" — has no other entry point.

## Architecture: parallel auditors, one static verdict

Detection is delegated to the read-only [`arch-auditor`](../../agents/arch-auditor.md) agent, invoked
**once per in-scope kernel**, all in one message so they run concurrently. One agent definition, many
invocations — a file per kernel would be the same logic maintained in eleven places.

**The criteria are single-sourced** in [`prompts/audit-layer.md`](prompts/audit-layer.md), and **the
rules themselves are single-sourced in each kernel's README**. This skill restates neither, and
neither does the agent definition.

**The static gates are settled once, here.** Every auditor receives the same verdict and relays the
lines that fall in its kernel. Letting each auditor run the gates would run the same checks eleven
times, and CI owns that verdict anyway ([`docs/playbook.md#do-not-pre-run-the-gates`](../../../docs/playbook.md#do-not-pre-run-the-gates)).

## Step 0 — Confirm the scope and the static verdict (one `AskUserQuestion`)

Two batched questions, skipped where the argument already answers.

1. 「アーキ監査のスコープを選んでください」
   - 「変更ファイルのみ（ベースとのマージベースから作業ツリーまでの差分。未コミット・未追跡を含む。触れたカーネルだけ fan-out）」
     — default when the working tree differs from the merge base, committed or not
   - 「リポジトリ全体（全カーネルを fan-out）」 — default on a release line or with no diff
   - 「特定のカーネルのみ（続けて指定）」
   - 「キャンセル」

2. 「静的検査の結果をどこから取りますか」
   - 「PR の Lint の結果を使う」 — default when a PR exists, its head is the local `HEAD`, and the
     working tree is clean
   - 「範囲を絞って手元で 1 回だけ回す」
   - 「取得しない（未取得として監査）」

## Step 1 — Resolve the kernels and their file lists

For "changed files" mode:

```sh
BASE=$(gh pr view --json baseRefName -q '.baseRefName' 2>/dev/null || make -s base-branch)
test -n "$BASE" || { echo "ベースブランチを解決できませんでした"; exit 1; }
MERGE_BASE=$(git merge-base "origin/${BASE}" HEAD) || { echo "マージベースを解決できませんでした"; exit 1; }
{ git diff --name-only "$MERGE_BASE"; git ls-files --others --exclude-standard; } | sort -u
```

**The diff runs from the merge base to the working tree**, so committed, uncommitted and untracked work
are all in it: a caller that writes without committing (`scaffold-slice`) audits what it just wrote.
**An existing pull request's `baseRefName` stays the authority** — the audit reads the diff the PR
shows plus what is not yet committed on top of it. **Stop on an unresolved base or merge base rather
than continuing**: an empty file list fans out zero auditors, which reads exactly like a clean audit.

Map each changed path under `src/` to its kernel by the first segment, and **read the kernel list from
`KERNELS` in [`architecture.ts`](../../../architecture.ts) rather than carrying one here**. Keep the
whole diff list too — it is `diffFiles`.

Remove from each kernel's list what no row audits:

- test files (`*.test.ts` / `*.test.tsx`)
- generated files — `git check-attr linguist-generated -- <path>` answers for any path
- deleted paths — they stay in `diffFiles` and leave the kernel's list

**A kernel whose `README.md` changed is audited in full**, whatever else the diff touched: a changed
table is changed criteria, and the files the diff did not touch are judged by them too. Say so in the
report.

Changed paths under `src/` that belong to no kernel (`src/proxy.ts`, `src/instrumentation.ts`) get no
auditor of their own; the rows that concern them live in the kernels they import, and those auditors
search them. No kernel changes in changed-files mode → exit cleanly, saying so.

For "full repo" mode, every kernel in `KERNELS` with its full file list. For "specific kernel" mode,
the named kernels with their full file lists.

## Step 2 — Settle the static verdict once

Save the gate output under `tmp/arch-check/` (gitignored) and pass its path, so no auditor reads it
through a filter that drops rows ([0157](../../../docs/adr/0157-inspection-declaration-discipline.md)).

- **PR's Lint result.** The `Lint` workflow ([`.github/workflows/lint.yaml`](../../../.github/workflows/lint.yaml))
  runs `pnpm lint:ci` — biome, ESLint and `pnpm check:architecture` — and upserts its full log as a PR
  comment carrying the marker `<!-- lint-result -->`. Use it only when that workflow's run on the PR's
  current head has finished, the head equals the local `HEAD`, and no in-scope file carries an
  uncommitted or untracked change; otherwise the verdict belongs to another tree. The verdict is `緑` or `赤` from that run, and the saved file is the comment's body.
- **Narrowed local run.** `pnpm check:architecture` once, and `pnpm exec eslint` once over the in-scope
  files (the kernel directories under full scope). Record each exit code. The verdict is `緑` only when
  both exited 0.
- **Not obtained.** Pass `未取得`. Every row an auditor would have relayed is then reported as
  unverified, and the closing report says so.

## Step 3 — Fan out the auditors in parallel

For each kernel in scope, spawn `arch-auditor` with the **Agent tool**, all in **a single message with
multiple tool calls** so they run concurrently. Pass each one:

- `layer` — the kernel name
- `files` — the pre-resolved file list from Step 1
- `scope` — `changed` or `full` (`full` for a kernel whose README changed)
- `baseRef` — the base branch
- `diffFiles` — `changed` scope only: the whole diff list
- `staticVerdict` — the verdict and the saved output's path from Step 2

**Under full scope with `model` in scope**, add one `type-design-reviewer` call to the same message,
with `scope=full`, the `model` file list, and the same `staticVerdict`. Its criteria are
[`impl-review/prompts/type-design.md`](../impl-review/prompts/type-design.md); this skill neither reads
nor restates them. Under changed scope it does not run — say so in the report.

Each agent's final message **is** its findings. Collect them with their kernel label.

> If the agent cannot be spawned in the current environment, follow `prompts/audit-layer.md` inline for
> each kernel instead.

## Step 4 — Aggregate and report (Japanese)

```text
arch-check 統合結果（スコープ: <scope>, 静的検査: <緑 | 赤 | 未取得>（出所: <PR の Lint | 手元 | 未取得>））

[<kernel>] violations <N> / suggestions <K>（対象 <n> ファイル。README 変更のため全体 のときはそう書く）
  観点の網羅: <欠けたタグ、または なし>
  ...（各 auditor の所見をそのまま）

[type-design] <件数、または「スコープが changed のため未実行」>

総計: violations <sum>, suggestions <sum>, 観点の欠け <sum>
未検証: <静的検査を未取得にしたために確かめられなかった行>
対象外: <スコープから外れたカーネル / auditor を持たないパス>
```

**A clean report names its scope.** When every auditor came back empty, list the kernels that were
audited — a report that does not is indistinguishable from a run that fanned out nothing.

`[観点の網羅]` findings are findings against the README, not the code. Keep them apart from the
code's violations in the totals, so the reader can tell "the code breaks a rule" from "the table is
missing a rule".

## Step 5 — Hand off

The report is the deliverable. **This skill writes no source, no README and no PR.** When a caller
that owns the pull request (`impl-issue`, `submit-pr`) asks for it, the report goes into the PR body
through that caller; fixing a violation, deciding a suggestion, and growing a README's table are the
user's.

## AI Modification Scope

Invoking this skill relaxes `AGENTS.md`'s modification scope **only** to `tmp/arch-check/`, for the
duration of the run. Source, READMEs, ADRs, `docs/rules.md` and the PR stay untouched, as does anything
under `.claude/settings.json`'s `permissions.deny`. The auditors write nothing at all.

## Do / Do NOT

- ✅ Confirm scope and the static-verdict source once, before anything is read.
- ✅ Resolve the base the way `commit` and `submit-pr` do; stop when it cannot be resolved.
- ✅ Read the kernel list from `architecture.ts` at runtime.
- ✅ Settle the static verdict once and pass the same one to every auditor.
- ✅ Fan the auditors out in one message so they run concurrently.
- ✅ Audit a kernel in full when its README changed.
- ✅ Name the kernels audited, even — especially — on a clean run.
- ✅ Report in Japanese.
- ❌ Let an auditor run a gate, or run the gates once per kernel.
- ❌ Spawn the auditors one at a time.
- ❌ Restate a rule from a README, or the criteria from `prompts/audit-layer.md`, in this file.
- ❌ Run `type-design-reviewer` under changed scope.
- ❌ Report `未取得` as clean.
- ❌ Write to source, a README, a comment, or the PR.
- ❌ Commit or push.

## Checklist

- [ ] Scope and the static-verdict source confirmed in one `AskUserQuestion`.
- [ ] Base resolved via `baseRefName` / `make base-branch`, and changed files taken from its merge base
      to the working tree, untracked included; run stopped if either could not be resolved.
- [ ] Kernel list read from `architecture.ts`; tests and generated files removed from each list.
- [ ] Kernels whose README changed widened to full.
- [ ] Static verdict settled once and saved under `tmp/arch-check/`.
- [ ] Auditors fanned out in a single message, each with `layer` / `files` / `scope` / `baseRef` /
      `diffFiles` / `staticVerdict`.
- [ ] `type-design-reviewer` added only under full scope with `model` in scope.
- [ ] Aggregate names its scope, the static verdict's source, and what went unverified.
- [ ] Nothing written outside `tmp/arch-check/`; nothing committed, nothing pushed.
