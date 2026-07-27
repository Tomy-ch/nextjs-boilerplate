# Claude スキル運用方針 (開発系)

本プロジェクトでは、コード / ドキュメントの生成・編集・レビューに付帯する **開発フロー** を Claude Code の **スキル** として `.claude/skills/` 配下に配置する。本 ADR では開発系スキルの配置 / 命名 / 構造 / subagent パターン / カバー範囲を定義する。

運用系スキル (コミット / PR / リリース / 依存監査 等) は [0154-claude-skills-operations.md](0154-claude-skills-operations.md) で別途扱う。

## Status

Accepted

## 採用理由 / 目的

- ドキュメント同期 / 設定編集 / コードレビューの **反復作業** をスキル化し、人間と AI エージェントが同じ手順で再現できるようにする
- 多層 review が必要な作業 (adversarial review 等) を **subagent パターン** で構造化し、単一エージェントの bias を回避する
- 開発系スキルは現状 go-boilerplate 由来のものを含むため、**Next.js 文脈への再設計が必要なもの** を本 ADR で明示し、再利用時の落とし穴を可視化する

## 対象範囲 (開発系の定義)

「開発系」= **コード / ドキュメント / 設定の生成・編集・レビュー** を主目的とするスキル。

具体的には:

- ドキュメント同期 (canonical EN / 翻訳 JA ペア管理 / README の現実合わせ)
- ドキュメント評価 (README が portal-worthy か等)
- 設定編集 (環境変数の e2e 追加等)
- コードレビュー (adversarial / 多視点)

運用系 (Git 操作 / リリース / 依存監査) は 0154 で扱う。

## 配置・命名・frontmatter

配置・命名・frontmatter の規約は **0154 と共通** ([0154-claude-skills-operations.md](0154-claude-skills-operations.md) 参照)。

要約:

- 配置: `.claude/skills/<slug>/SKILL.md` (canonical 英) + `SKILL.ja.md` (翻訳参考)
- 命名: kebab-case 動詞ベース
- frontmatter: `name` / `description` / `argument-hint` (任意) / `allowed-tools` (任意)
- 本文構造: When to Use / Do NOT use / Step 番号付き手順 / 検証

## カバー範囲 (既存スキル)

| Slug | 役割 | カバー範囲 |
| --- | --- | --- |
| `canonicalize-doc` | EN / JA ペア同期 | canonical 英ドキュメントと日本語翻訳の同期 / 新規作成 |
| `sync-readme` | README ↔ ディスク同期 | 単一 README の記述を実ディレクトリ状態に合わせて更新。子ディレクトリの README は digest + 参照リンクのみ |
| `readme-review` | README の portal 価値評価 | 単一 README を `docs/portal/manifest.yaml` 登録基準で採点 |
| `new-env` | 環境変数の e2e 追加 | 目的別 config モジュール / env ファイル / 変数表 docs を一括で同期 (対象構造は A7 = [0030](0030-environment-variable-management.md)、後述) |
| `local-review` | adversarial code review | 4 観点 (correctness / security / architecture / runtime-gap) の subagent fanout + verifier による多段検証 |
| `full-verify` | リポ全体の検証 | アーキテクチャ (Pass 1) + 全実装 (Pass 2) の妥当性を検証し、`tmp/reviews/` (architecture.md / mod_*.md /_index.md) に所見 Markdown を生成。read-only (コード変更なし) |
| `full-apply` | full-verify 所見の適用 | `tmp/reviews/` の所見を severity 順 (Critical → Low) に修正適用。設計判断を要する所見は理由付きで defer し、コミット前に `pnpm fix` / lint / build で検証。`full-verify` と対をなす |
| `adr-scan` | ADR 候補の全リポ発見 | de facto に存在するが BACKLOG 未追跡の設計判断を read-only で走査し、taxonomy (decision / exclusion / rule / inventory) と Tier / frame ID へ分類した候補 inventory を出力 (※ 暫定 / one-off。BACKLOG 反映後に削除・アーカイブ予定) |

新規追加は本 ADR の趣旨 (開発系の定義) に合致する場合のみ。リスト追加は軽微編集とし ADR 改訂は不要。

## subagent パターン

`local-review` と `full-verify` は **複数の subagent を組み合わせる構造** を持つ。

```text
local-review (orchestrator)
 ├─ adversarial-reviewer (per lens)   ← .claude/agents/adversarial-reviewer.md
 │   ├─ correctness 観点
 │   ├─ security 観点
 │   ├─ architecture 観点
 │   └─ runtime-gap 観点
 └─ review-verifier                   ← .claude/agents/review-verifier.md
     (各 finding を CONFIRMED / PLAUSIBLE / REFUTED 判定)

full-verify (orchestrator / in-session fast-path)
 ├─ arch-verifier (Pass 1)            ← .claude/agents/arch-verifier.md
 │   (構造の設計妥当性。基準は skills/full-verify/prompts/verify-arch.md が SSOT)
 └─ impl-verifier (Pass 2 / unit 単位で並列 fanout) ← .claude/agents/impl-verifier.md
     (unit ごとの実装品質。基準は skills/full-verify/prompts/verify-impl.md が SSOT)
```

このほか、特定スキルへの固定 wiring を持たない **単独起動の read-only レビュー subagent** として `comment-reviewer` (コメント内容の品質) / `doc-reviewer` (ドキュメント散文の品質) が `.claude/agents/` に存在する。いずれも下記の subagent 規約 (read-only / sonnet 既定 / モデル分散) に従う。

### subagent 規約

- subagent の配置は `.claude/agents/<slug>.md`
- スキルの `SKILL.md` は subagent の責務と起動 model (sonnet 既定 / Opus は限定的) を明記する
- subagent は **read-only on source** を既定とし、レビュー結果のみを返す (code edit は行わない)
- subagent 間でモデル分散 (reviewer ≠ implementer) を意図する場合は、`SKILL.md` でその意図を明示する

### subagent を使う判断

- **単一エージェントの bias を回避したい場合** (adversarial review / 多視点判定)
- **並列で独立した観点を走らせたい場合** (per-lens レビュー)
- **個別の review を集約・検証する 2 段構成が欲しい場合** (finder → verifier パターン)

単純な手順実行 (`canonicalize-doc` 等) は subagent を使わず orchestrator 1 本で完結させる。

## ドキュメント系の責務分担

ドキュメント関連 3 件は責務を分けて重複させない:

| スキル | 入力 | 出力 | 用途 |
| --- | --- | --- | --- |
| `canonicalize-doc` | EN または JA のドキュメント | 不足側を生成 / 両側の drift を同期 | 1 ドキュメントの 2 言語ペア管理 |
| `sync-readme` | README + そのディレクトリ | 実状に合わせて README を書き換え | README ↔ ディスク drift 解消 |
| `readme-review` | README | 採点レポート (manual-worthy / borderline / 等) | portal 登録判断 |

`sync-readme` 実行後は内部で `canonicalize-doc` を chain する設計になっている。

## `new-env` の対象構造

`new-env` は **A7 ([0030](0030-environment-variable-management.md)) の config カーネル**を対象とする。すなわち `src/config/` の目的別 config モジュール (`<purpose>.server.ts` / `<purpose>.client.ts` のスキーマ項目 + `#` private フィールド + getter)、`env/.env.{local,ci,dev,stg,prd}`、変数表ドキュメントの 3 点を同期する。

スキルは purpose インベントリ・スキーマライブラリ・env ファイル集合を**実行時に実ツリーから検出**し、固定値で持たない。スキーマライブラリの選定は [0030](0030-environment-variable-management.md) が A7 実装 PR へ委ねているため、スキル側でライブラリ名を前提にしない。

**`src/config/` が未着地の間、スキルは自らガードして停止する**。config カーネルの構築 (スキーマ / 検証呼び出し / `env/` の新設) は A7 実装 PR の担当であり、変数追加の依頼を根拠にスキルがカーネルを新規作成することはない。

## 共通参照

すべての開発系スキルは以下を共通参照する:

- **AGENTS.md の Instruction Priority と Language Rules**: [0152](0152-agents-md-policy.md)
- **ドキュメント運用ポリシー**: [0140](0140-documentation-operations.md) (D1・Accepted) — canonical EN / 翻訳 JA の同期方針
- **`canonicalize-doc` / `sync-readme` / `readme-review` のドメイン分担**: 本 ADR の「ドキュメント系の責務分担」表

## 禁止事項

- ❌ 開発系スキルから商用操作 (push / tag / release) を行うこと (運用系 = 0154 の領域)
- ❌ subagent をモデル分散 (reviewer ≠ implementer) なしで「念のため」増やすこと (コスト見合いに合わない)
- ❌ subagent に code edit 権限を渡すこと (read-only 原則)
- ❌ `new-env` に config カーネル (`src/config/` / スキーマ / 検証呼び出し / `env/`) を新規作成させること (A7 実装 PR の担当)
- ❌ ドキュメント系 3 件 (`canonicalize-doc` / `sync-readme` / `readme-review`) の責務を重複させること

## 補足

- subagent 設定 (`.claude/agents/`) は本 ADR と対になる。新規 subagent を追加する場合は `SKILL.md` 側の参照も更新する
- スキルの組み合わせ (`sync-readme` → `canonicalize-doc`) は `SKILL.md` 内で chain として明示する
- `local-review` の lens (correctness / security / architecture / runtime-gap) は追加・削除可能だが、本 ADR の趣旨 (adversarial / 多視点) を逸脱しないこと

## 関連 ADR

- [0030-environment-variable-management.md](0030-environment-variable-management.md) (A7) — `new-env` が対象とする config カーネルの構造
- [0140-documentation-operations.md](0140-documentation-operations.md) (D1) — canonical EN / 翻訳 JA のドキュメント運用ポリシー
- [0150-git-workflow.md](0150-git-workflow.md) — `local-review` が想定する「commit / PR 前」のタイミング
- [0152-agents-md-policy.md](0152-agents-md-policy.md) — AGENTS.md の Instruction Priority と Modification Scope
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) — 運用系スキルとの対 (配置・命名・frontmatter は共通)
