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

## 2. `DRY_RUN` は `make setup-repo` には効かない

`DRY_RUN=1` が効くのは置換系の補助ターゲット 2 つだけ。`make setup-repo` はこの変数を読まないため、
**事前にプレビューする手段が無い**。

```bash
DRY_RUN=1 make setup-replace-license-copyright COPYRIGHT_HOLDER='Example Inc.'  # プレビュー
DRY_RUN=1 make setup-replace-repository-reference REPOSITORY=org/app           # プレビュー
DRY_RUN=1 make setup-repo                                                      # ⚠️ そのまま実行される
```

dry-run が有効になる値は `1` のみ。それ以外(`DRY_RUN=0` を含む)はすべて書き換える。

`make setup-repo` はリポジトリ初期化の一度きりターゲットで**破壊的**: ローカルと `origin` の既存タグを全削除し、
`v0.0.0.md` 以外のリリースノートを削除し、`upstream` リモートを外し、`v0.0.0` と保護ブランチ 3 本を作成・push する。
実行前にユーザ確認を取り、初期化済みリポジトリでは実行しない(`v0.0.0` があれば中断する)。

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

| 段階 | コマンド |
| --- | --- |
| pre-commit | `pnpm lint:ci`、`*.md` が staged なら `pnpm md-lint`、`.github/workflows/*` が staged なら `make actionlint` |
| commit-msg | `make commitlint COMMIT_MSG_FILE={1}` |
| pre-push | `pnpm typecheck`、`make secret-scan` |

pre-push の `make secret-scan` は **fail-closed** ── push 予定のコミット範囲のどこかに秘密が含まれていれば
push が止まり、対処は再実行ではなく履歴からの除去。

`make trivy-fs` は **hook に接続していない**(手動実行専用)。依存の脆弱性は push する当事者がその場で
解消できず、diff と独立に状態が変わるため、ゲートとして成立しないという判断による(ADR 0110 3.1)。

`mise ls` にツールが入っているのに hook が `❌ <tool> が PATH にありません` で落ちる場合、hook のシェルが
`mise activate` を経ていないだけ ── hook は非対話シェルで走る。そのため `.lefthook.yaml` の全コマンドを
`mise exec --` で包んである。包み忘れた新規エントリは、mise を activate していないシェルの全員に対し、
変更内容と無関係に落ちる。hook のコマンドを手で再現するときも同じ形で叩く:

```bash
mise exec -- make secret-scan     # make secret-scan ではなく
```

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
