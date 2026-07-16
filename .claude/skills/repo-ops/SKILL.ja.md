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

## 5. `tmp/reviews/`(full-verify / full-apply の成果物)が `git status` に出る

`full-verify` / `full-apply` は指摘集を `tmp/reviews/` 配下に書く。Next.js の既定 `.gitignore` は `tmp/` を無視
**しない**ため、未追跡として現れ、誤ってコミットされ得る。

対処: `tmp/` を無視(`.gitignore` はルートファイルなので編集前にユーザ確認)。

```gitignore
# review / scratch artifacts
/tmp/
```

それまでは `tmp/reviews/**` を `git add` しない ── ソースではなくスクラッチ出力。

## 6. git hook はまだ無い(lefthook 保留 ── BACKLOG G2)

Toolchain-0006 は lefthook による pre-commit / pre-push を規定するが、**まだ未導入**(`.lefthook.yaml` なし・
devDependency なし ── BACKLOG G2 実装ギャップ)。したがって現状**ローカルで commit-msg / pre-commit hook は
発火しない**: lint/build は自分で `pnpm lint` / `pnpm build` を回すこと(と `commit` スキルの検証ステップ)で担保
され、hook ではない。hook が何か拾ったと仮定しない。G2 導入時にその hook の落とし穴をこの runbook に足す。

## 制約

- ✅ read-only ナレッジ: 正確なコマンドを提示。実行はユーザが操作を頼んだ時のみ。
- ✅ 破壊的ステップ(§2 のタグ/ブランチ削除)は `CLAUDE.md` に従い事前警告。
- ✅ ルートファイル編集(§5 `.gitignore`、§4 `biome.json`、§3 `package.json`)は事前にユーザ確認 ── 既定の
  AI 変更スコープ外。
- ❌ go-boilerplate の Docker / sqlc / DB 項目をここに移植しない ── 適用外(ADR 0004)。
