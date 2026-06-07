# Claude スキル運用方針 (運用系)

本プロジェクトでは、開発プロセスに付帯する **運用フロー** (コミット分割 / PR 作成 / リリースノート生成 / 依存監査 / メタ inventory 等) を Claude Code の **スキル** として `.claude/skills/` 配下に配置する。本 ADR では運用系スキルの配置 / 命名 / 構造 / カバー範囲を定義する。

開発系スキル (scaffolding / レビュー / ドキュメント同期 等) は [0010-claude-skills-development.md](0010-claude-skills-development.md) で別途扱う。

## Status

Accepted

## 採用理由 / 目的

- 反復する運用作業 (コミット分割 / リリース手順 / 依存監査 等) を **手順スクリプト + ユーザ確認** の形に固定し、人間 / AI エージェント間で同じ手順を再現できるようにする
- 各スキルの `SKILL.md` を **一次情報** とし、運用フローの「何をどの順序でやるか」を 1 ファイルで完結させる
- 商用操作 (push / tag / release / `mise.toml` 書換 等) を伴うスキルは **必ずユーザ確認** を挟む形に統一し、暴走を構造的に防ぐ

## 対象範囲 (運用系の定義)

「運用系」= 開発プロセスを進めるための **オペレーション** を扱うスキル。コード / ドキュメントの生成・編集を主目的としないものを指す。

具体的には:

- Git / GitHub 操作 (commit / PR 作成 / 更新)
- リリース工程 (release notes / tag)
- 依存・ツール監査 (`mise.toml` 更新 / `pnpm audit`)
- `.claude/` 配下のメタ inventory

開発系 (コード / ドキュメントの生成・編集を主目的とするもの) は ADR 0010 で扱う。

## 配置と命名

### 配置

```text
.claude/
└── skills/
    └── <slug>/
        ├── SKILL.md         ← canonical (英語)、Claude Code が読む
        └── SKILL.ja.md      ← 日本語翻訳 (参考用、Claude Code は読まない)
```

- `SKILL.md` は **英語の canonical 版**。Claude Code が読み込んでスキルを実行する
- `SKILL.ja.md` は **人間用の翻訳** で、スキルとしてはロードされない

### 命名規則

- ディレクトリ名 `<slug>` は **kebab-case**、動詞ベース
- ユーザは `/<slug>` で起動する
- 既存例: `commit` / `submit-pr` / `release-notes` / `tools-upgrade` / `tool-map`

## frontmatter

`SKILL.md` の冒頭に以下の YAML frontmatter を置く。

| キー | 必須 | 用途 |
| --- | --- | --- |
| `name` | ✓ | スキル名 (ディレクトリ名と一致) |
| `description` | ✓ | スキルが何をするかの 1 段落説明。Claude Code の skill picker / トリガ判定に使われる |
| `argument-hint` | 任意 | 起動引数の形式ヒント (例: `[--dry-run]`) |
| `allowed-tools` | 任意 | 使用許可するツールの明示 (Bash の細粒度許可など) |

`description` は **どのような状況で発火すべきか** を含めること (機能の説明ではなく「いつ使うか」)。

## 本文構造

`SKILL.md` の本文は以下の節を持つ。

1. **タイトル** (`# <Skill Name>`) と冒頭 1 段落の概要
2. **(任意) `SKILL.ja.md` への言及** — 翻訳が存在する場合、その旨を明記
3. **When to Use** — 利用すべき状況の列挙
4. **Do NOT use this skill for** — 利用すべきでない状況・代替手段の列挙
5. **Step <番号>. <タイトル>** — 番号付き手順 (Step 0 から始める慣例。前処理がある場合)
6. **検証 / 終了処理** — `make fix` / `make lint` / `pnpm test` 等の最終確認

## カバー範囲 (既存スキル)

| Slug | 役割 | カバー範囲 |
| --- | --- | --- |
| `commit` | コミット分割と実行 | 作業ツリーの変更を prefix 規約 (Feat/Fix/...) で分割し、`git commit --no-verify` で個別に積む。最後に lefthook 相当の検証を 1 回まとめて回す |
| `submit-pr` | PR 作成・更新 | 現ブランチに既存 PR があれば update、なければ create を自動選択。PR 本文は `.github/pull_request_template.md` から生成 |
| `release-notes` | リリースノート生成 | `AskUserQuestion` で FROM タグと NEXT_VERSION を確認し、`.github/release/<NEXT>.md` を生成 |
| `tools-upgrade` | `mise.toml` の依存監査 | upstream の latest と比較し、`min_age_days` でサプライチェーン検疫。承認後に `mise.toml` 更新 |
| `tool-map` | `.claude/` 配下の inventory | commands / skills / agents の表 + Mermaid 依存マップを生成 |

新規追加は本 ADR の趣旨 (運用系の定義) に合致する場合のみ。リスト追加は軽微編集とし ADR 改訂は不要。

## 商用操作前のユーザ確認

以下の操作を含むスキルは **実行前にユーザ確認を必須** とする:

- `git push` / `gh pr create` / `gh pr edit` (`submit-pr`)
- `git tag` / `gh release create` (`release-notes` の後続)
- `mise.toml` の書き換え (`tools-upgrade`)
- `git reset --hard` 系の破壊的操作

確認には `AskUserQuestion` または AGENTS.md `Git Rules > Critical Rules` が定める確認文言 (`変更はローカルにコミット済みです。これらの変更をプルリクエストにプッシュしますか？`) を用いる。

## `AskUserQuestion` の利用

スキル内で **確認が必要な入力** (FROM タグ / バージョン番号 / 検疫日数 / 出力形式等) は `AskUserQuestion` ツールで明示的に確認する。

- 引数 / 直近メッセージの値を **暗黙に採用しない**
- 確認は実行直前に行い、ドリフトを避ける

## 共通参照

すべての運用系スキルは以下を共通参照する:

- **Git 規約**: [ADR 0006](0006-git-workflow.md) — ブランチ・コミット・PR の規約
- **hook 方針**: [ADR 0007](0007-git-hooks.md) — `--no-verify` を用いる場合の例外運用と最終検証
- **mise.toml の SSOT**: [ADR 0003](0003-version-manager.md) — `tools-upgrade` が監査対象とする
- **ライブラリ運用**: [ADR 0005](0005-library-management.md) — 依存更新時の exact pin / メジャー更新分離の原則
- **AGENTS.md の Instruction Priority と Language Rules**: [ADR 0008](0008-agents-md.md)

## 禁止事項

- ❌ 運用系スキルから業務ロジックを直接編集すること (コード編集は開発系 = ADR 0010 の領域)
- ❌ `SKILL.md` の frontmatter `description` を「機能説明」のみで書くこと (発火条件を含めること)
- ❌ 商用操作 (push / tag / release) を確認なしで実行すること
- ❌ `SKILL.md` を翻訳ファイル (`SKILL.ja.md`) で上書きすること (canonical は英)
- ❌ skill 名 / ディレクトリ名に空白・大文字・日本語を含めること

## 補足

- スキルは現状 Claude Code 専用。Codex / Cursor 等の他エージェントは将来別途検討
- スキルの粒度は「1 起動 = 1 オペレーション」を原則とする。複数オペレーションを束ねたい場合は別スキルとして分けるか、メタスキルから個別スキルを呼ぶ形にする
- スキル数の上限は設けないが、似た役割の重複は避ける

## 関連 ADR

- [0003-version-manager.md](0003-version-manager.md) — `tools-upgrade` が監査対象とする `mise.toml`
- [0005-library-management.md](0005-library-management.md) — 依存更新時の規約
- [0006-git-workflow.md](0006-git-workflow.md) — `commit` / `submit-pr` の Git 規約
- [0007-git-hooks.md](0007-git-hooks.md) — `commit` が回避する lefthook の取り扱い
- [0008-agents-md.md](0008-agents-md.md) — AGENTS.md と本 ADR の関係
- [0010-claude-skills-development.md](0010-claude-skills-development.md) — 開発系スキル方針 (本 ADR と対をなす)
