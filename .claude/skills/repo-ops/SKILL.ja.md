> このファイルは `SKILL.md`(canonical / 英語)の日本語参考訳です。スキルとしては読み込まれません(参考用)。

# Repo Ops Runbook

本リポジトリで繰り返し踏みがちな運用上の落とし穴に対する、具体的な復旧・手順ステップ集。これは
**ワークフローではなくルックアップ表**: 症状を見つけて対処を打つ。破壊的またはルートファイルに触れるステップは
`CLAUDE.md` に従い先にユーザへ伝える。

> **スコープ注記。** この runbook は意図的に薄い。元にした go-boilerplate の `repo-ops` は Docker ツールランナー・
> `sqlc` / `schema.gen.sql`・root 所有の生成ディレクトリ・稼働 DB が中心だったが、**それらはここには存在しない**
> (ADR 0004 no-docker、DB なし、表示層のみ)。以下には実在する落とし穴だけを載せる。新たに踏んだら項目を足す
> こと ── Go 固有のものを戻さない。

## 1. `make install-tools` が `mise not found` で落ちる

`make install-tools` は `mise install` を実行し、`mise.toml` の `[tools]` を読む(ADR 0003)。まず `mise` 自体が
`PATH` にあるか確認し、無ければメッセージを出して終了する。

対処: `mise` をインストール(<https://mise.jdx.dev/>)してから再実行。

```bash
make install-tools     # mise.toml に従い Node.js + pnpm を入れ、両バージョンを表示
```

原則: **mise が Node.js / pnpm バージョンの SSOT。** 誰かが `mise.toml` を変えたら(例 `node-upgrade`)、
`make install-tools` でローカルツールチェーンを揃え、`node --version` / `pnpm --version` で確認する。

## 2. `DRY_RUN=0 make <target>` でも dry-run のまま

Makefile の setup 系ターゲットは dry-run を `$(if $(DRY_RUN),--dry-run,)` で判定しており、**非空値なら真**扱い ──
つまり `DRY_RUN=0 make setup-repo` でも dry-run になる。実行するには**変数を完全に省く**。プレビューは何か値を入れる。

```bash
make setup-repo            # 実行(変数を省略)
DRY_RUN=1 make setup-repo  # dry-run プレビュー
DRY_RUN=0 make setup-repo  # ⚠️ これでも dry-run(0 は非空=真)
```

`make setup-repo` はリポジトリ初期化の一度きりターゲット: 既存タグを削除し `v0.0.0` + ブランチを作る。
**タグ/ブランチに破壊的**なので実行前にユーザ確認、初期化済みリポジトリでは実行しない(`v0.0.0` があれば中断する)。

## 3. `pnpm install --frozen-lockfile` が落ちる ── lockfile 不整合

ADR 0001 により `pnpm-lock.yaml` は**コミット必須**で `package.json` と同期させる。CI 相当の `--frozen-lockfile`
インストールは両者がズレると落ちる(例: 再ロックせず依存を編集)。

対処: `package.json` 編集と同じ変更で lockfile を再生成しコミット。

```bash
pnpm install                 # pnpm-lock.yaml を package.json に合わせて更新
git add package.json pnpm-lock.yaml
```

原則: **`package.json` の依存変更は、再生成した `pnpm-lock.yaml` を必ず同時コミットする。**(`package.json` は
保護対象のルート設定 ── 依存編集はユーザ明示指示が必要。Toolchain-0005 により依存メジャーは別 PR。)

## 4. biome: `pnpm lint` vs `pnpm fix`(ADR 0002)

biome が唯一のフォーマッタ/リンタ(ESLint / Prettier 不採用 ── ADR 0002)。入口は 2 つ:

```bash
pnpm fix       # biome check --fix : 自動修正可能なものを直す
pnpm lint      # biome check       : 残エラーを報告(手で直す)
pnpm format    # biome format --write : フォーマットのみ
```

`noConsole` は既定 `warn` ── **`console.log` をコミットに残さない**(AGENTS.md / ADR 0002)。自動修正で直らない
ものは手で直す。`// biome-ignore` を多用しない(スコープ付き `overrides` を `biome.json` に。ただし `biome.json` は
保護対象ルート設定=ユーザ指示)。

## 5. スクラッチ出力は `tmp/` 配下に置き、git には乗せない

`/tmp` と `/.claude/worktrees/` は `.gitignore` 済みなので、以下は `git status` に出ない。

- `tmp/reviews/` ── `full-verify` / `full-apply` の指摘集
- `tmp/<name>.md` ── 実体をリポジトリ外に置いた作業計画書への symlink
- `.claude/worktrees/<name>/` ── エージェントがリポジトリ内に作成する worktree

いずれもソースではなくスクラッチ出力: `git add -f` で強引に載せない。残す必要があるスクラッチはリポジトリ外に
実体を置き、`tmp/` 配下の symlink から参照する。

## 6. commit / push が hook に弾かれる(lefthook)

hook は `.lefthook.yaml` で宣言される(ADR 0151)。`pnpm install` では登録されないため、clone 後に
`pnpm exec lefthook install` を 1 度実行する必要がある。hook は共通 git ディレクトリに置かれるので
worktree にも継承されるが、**`node_modules` は継承されない** ── worktree で `pnpm install` を実行しないと
すべての hook が `command not found` で落ちる。

| 段階 | 入口 | 検査内容 |
| --- | --- | --- |
| pre-commit | `pnpm lint:ci`、`*.md` が staged なら `pnpm md-lint` も | biome 完全版 / markdownlint + mermaid 構文 |
| commit-msg | `make commitlint` | subject を ADR 0150 に照らす |
| pre-push | `pnpm typecheck` | `tsc --noEmit` |

各段の再現は入口を手で叩けばよい。引数まで含めた正確なコマンド行は `.lefthook.yaml` にあり、写しではなく
そちらを読むこと。

commit-msg で落ちた場合、subject が ADR 0150 の prefix 11 種を使った `<Prefix>: <subject>` になっていないか、
subject が空か、末尾が `。` で終わっている。
`commitlint.config.ts` は `type-case` を意図的に課していない ── prefix が `Feat` と `CI` のように大文字構成を
混在させるため、単一の case ルールが当たらない。merge / revert コミットは commitlint の既定 ignore で除外される。

コミットせずにメッセージだけ検査する:

```bash
echo "Feat: 説明" | pnpm exec commitlint
```

## 制約

- ✅ read-only ナレッジ: 正確なコマンドを提示。実行はユーザが操作を頼んだ時のみ。
- ✅ 破壊的ステップ(§2 のタグ/ブランチ削除)は `CLAUDE.md` に従い事前警告。
- ✅ ルートファイル編集(§4 `biome.json`、§3 `package.json`)は事前にユーザ確認 ── 既定の
  AI 変更スコープ外。
- ❌ go-boilerplate の Docker / sqlc / DB 項目をここに移植しない ── 適用外(ADR 0004)。
