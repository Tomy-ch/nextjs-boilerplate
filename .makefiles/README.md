# Make コマンド一覧

## 役割

`.makefiles/` は本リポジトリで使用するすべての `make` ターゲットの中央レジストリです。各 `.mk` ファイルは関連
ターゲットを領域別にグルーピングし、トップレベルの `Makefile` はそれらを `include` するだけなので、既存領域への
ターゲット追加はトップレベル編集なしで完結します。

ターゲットは以下の単位で整理されています。

- `.makefiles/github` : GitHub 初期設定 / リリース / ラベル / ルール設定 / ワークフロー Lint
- `.makefiles/tools` : 開発ツールの管理（mise）/ コミットメッセージ検証 / GitHub Actions の SHA ピン
- `.makefiles/security` : シークレット / 依存脆弱性のスキャン

アプリケーション側のコマンド（`dev` / `build` / `lint` / `typecheck`）は make ターゲットでは**なく**、
`package.json` の scripts に置き pnpm から実行します（[ADR 0001](../docs/adr/0001-package-manager.md)）。
`make` が受け持つのは pnpm scripts で表せない領域 — リポジトリ運用とツールチェーン整備 — だけです。

## 規約

- ターゲット名はハイフン区切りの小文字（`make install-tools`、`make setup-repo`）
- すべて `.PHONY` 指定し、末尾 `## <説明>` コメントを付けて `make help` の一覧に載せること。説明コメントの無い
  `.PHONY` 行は `make help` が警告する（一覧に出ないターゲットは利用者から見えないため）
- 自明でないロジックはインラインシェルではなく `scripts/*.ts` に置き `pnpm exec tsx` から実行する。TypeScript に
  置けば `pnpm typecheck` と biome の検査対象に入り、実行環境ごとのシェル差異も持ち込まずに済む
- 一回限りのリポジトリ運用コマンド（`make setup-repo` とその補助）は `.makefiles/github/operation/` 配下に置き、
  開発者向けターゲットと分離する。GitHub 設定を**適用する**ターゲットは `setting/`、何も変更せずファイルを
  **検査する**ターゲットは `lint/` へ置く

## ターゲットの一覧表示

```bash
make help
```

`make help` は `.makefiles/` 配下の `.PHONY: <target> ## <説明>` 行を収集し、各ファイルの `## <カテゴリ>` 見出し
ごとにグルーピングして出力します。

## `.makefiles/github` 系

### GitHub 設定関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make gh-login` | `gh` コマンドで GitHub にログインします。 | ブラウザ認証方式でログインを行います。 |
| `make delete-all-labels` | GitHub リポジトリ上の既存ラベルをすべて削除します。 | なし |
| `make create-default-labels` | `.github/settings/labels.json` をもとに、デフォルトラベルを作成します。 | なし |
| `make apply-branch-protection` | `.github/settings/branch-protection.json` をもとに、対象リポジトリへブランチルールセットを適用します。 | なし |

### GitHub リポジトリ初期化関連

#### `make setup-repo`

フォーク直後のリポジトリ初期化処理をまとめて実行します。以下を順に行います。破壊的な手順を含むため、
フォーク直後以外で実行する前に必ず内容を確認してください。

- `gh` ログイン
- **既存タグの全削除**（ローカルと `origin` の両方）と初期タグ `v0.0.0` の作成 / push
- `develop` / `staging` / `production` ブランチの作成
- GitHub デフォルトブランチの設定
- ブランチルールセット適用
- ラベル初期化
- **`.github/release/` 配下のリリースノートを `v0.0.0.md` を除いて全削除**
- **`upstream` リモートの削除**

#### セットアップ補助コマンド

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make setup-replace-license-copyright COPYRIGHT_HOLDER=<name> [COPYRIGHT_YEAR=<year>]` | LICENSE の著作権表記を更新します。 | 年は省略可能です。 |
| `make setup-replace-repository-reference REPOSITORY=<owner>/<repo>` | GitHub リポジトリ参照とプロジェクト名（`package.json` の `name`）をフォーク先へ置換します。 | `docs/` / `.claude/` / `scripts/setup/` / ビルド成果物（`.next` / `dist` / `build` / `tmp`）/ ロックファイルは対象外です。 |

どちらの補助コマンドも `DRY_RUN=1` を付けると、書き換えずに変更予定だけを出力します。有効値は `1` のみで、
それ以外（`DRY_RUN=0` や変数の省略）はすべて実際に書き換えます。

### GitHub Actions Lint 関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make actionlint` | `.github/workflows` のワークフロー定義を actionlint で検査します。 | ディレクトリが存在しない場合はスキップします。 |
| `make actions-shellcheck` | composite action（`.github/actions/**/action.yaml`）の `run:` シェルを shellcheck で検査します。 | 指摘は `action.yaml` の行・列で報告します。`bash` / `sh` 以外の `shell:` は検査せず、位置と方言を添えて skip として出力します。 |
| `make actions-comment-secret-lint` | PR コメントを投稿するジョブに `GITHUB_TOKEN` 以外の secret が渡っていないか検査します。 | 規約違反は exit 1、検査そのものが成立していない状態は exit 2 で区別します。 |

actionlint は `run:` ステップのシェルも shellcheck 経由で検査するため、両バイナリを `mise.toml` で版固定して
います（[ADR 0003](../docs/adr/0003-version-manager.md)）。先に `make install-tools` を実行してください。

composite action は actionlint の走査対象に含めていません（`action.yaml` を渡すと workflow として解釈され、
必ず構文エラーになります）。その代わり `run:` のシェルは `make actions-shellcheck` が担い、両者を合わせて
pre-commit hook と CI の `actions-lint` job が実行します。actionlint 側に何が残るかは
[ADR 0153](../docs/adr/0153-ci-configuration.md) を参照してください。

`make actions-shellcheck` は、次のいずれかでも異常終了します。検査範囲が黙って縮んだまま緑になる状態を
作らないためのもので、判定はファイル単位です（合計で見ると 1 ファイルの抽出失敗が他ファイルの成功に隠れます）。

- **抽出数が合わない** — パーサ自身の変換で数えた `runs.steps[].run` の件数と、実際に抽出できた件数が食い違う
  （`using:` の綴りを取り違えた action もここで落ちます）
- `runs.using: composite` なのに `runs.steps` がリストとして読めない
- `run:` ステップに `shell:` が無い / 参照先の無い alias がある / YAML として壊れている

`run:` の本文は**リテラル（`|`）で書いてください**。ブロック折り畳み（`>`）は隣接する行を空白へ畳むため
指摘の位置を写し戻せず、畳まれた行がソースに無い構文を作って誤検知も生むため、error になります。

`make actions-comment-secret-lint` は、検査ログをそのまま公開 PR コメントへ複製する `upsert-pr-comment` の
性質上守らなければならない規約 — **本文を作るジョブに secret を渡さない**（[ADR 0153](../docs/adr/0153-ci-configuration.md)）—
を機械検査します。走査単位はステップではなく**ジョブ**で、`upsert-pr-comment` を内側で呼ぶローカル action を
経由するジョブも対象に含めます。

検出できるのは `${{ }}` 式に現れる secrets コンテキストの直接参照だけです。別ジョブで読んで
`needs.<job>.outputs` 経由で渡す間接参照は静的に追えないため検査を通ります。**規約が正であり、この検査は
規約が将来 `env:` 1 行で破られることへの退行ガード**です。

異常終了は 2 通りに分かれます。

- **exit 1** — 規約違反（投稿ジョブ、またはワークフロー全体に及ぶ位置に `GITHUB_TOKEN` 以外の secret がある）
- **exit 2** — 検査そのものが成立していない。ワークフローが 1 件も見つからない（リポジトリルート以外での実行）/
  `jobs:` がマッピングとして読めない / `upsert-pr-comment` の定義があるのに、それを使うジョブが 1 つも
  見つからない（参照の同定が壊れている）

### リリースブランチ関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make hotfix-patch` | `production` から hotfix ブランチを作成し、GitHub のデフォルトブランチに設定します。 | 現在の最新タグを基準に patch を 1 つ進めます。 |
| `make branch-patch` | `production` から patch リリース用ブランチを作成し、デフォルトブランチに設定します。 | 現在の最新タグを基準に patch バージョンを進めます。 |
| `make branch-minor` | `production` から minor リリース用ブランチを作成し、デフォルトブランチに設定します。 | 現在の最新タグを基準に minor バージョンを進めます。 |
| `make branch-major` | `production` から major リリース用ブランチを作成し、デフォルトブランチに設定します。 | 現在の最新タグを基準に major バージョンを進めます。 |

### リリースタグ関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make tag-patch` | patch バージョンを 1 つ進めたタグを作成し、GitHub Release を作成します。 | 現在の最新タグを基準とし、リリースノートには `.github/release/<version>.md` を使用します。 |
| `make tag-minor` | minor バージョンを進めたタグを作成し、GitHub Release を作成します。 | 現在の最新タグを基準にします。 |
| `make tag-major` | major バージョンを進めたタグを作成し、GitHub Release を作成します。 | 現在の最新タグを基準にします。 |

## `.makefiles/tools` 系

### ツールバージョン管理関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make install-tools` | `mise.toml` の `[tools]`（Node.js / pnpm / actionlint / shellcheck / gitleaks / Trivy）をインストールします。 | mise の事前インストールが必要。全エントリが backend を明示します。詳細は [ADR 0003](../docs/adr/0003-version-manager.md) 参照 |

### コミットメッセージ検証関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make commitlint [COMMIT_MSG_FILE=<path>]` | コミットメッセージを commitlint で検証します。 | `.lefthook.yaml` の commit-msg hook から呼ばれます。`COMMIT_MSG_FILE` 省略時は編集中のコミットメッセージを対象にします。規約は [ADR 0150](../docs/adr/0150-git-workflow.md) 参照 |

### GitHub Actions の SHA ピン関連

`uses:` を moving tag のまま置くと、上流が tag を付け替えた時点で CI が実行する内容が黙って変わります。
これを防ぐため、参照は commit SHA へ固定し、tag → SHA の対応を `.github/actions-pin.toml` が持ちます
（[ADR 0153](../docs/adr/0153-ci-configuration.md)）。**版の SSOT は `uses:` 行末尾のコメント tag** であり、
`@` 側の SHA ではありません。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make actions-pin-resolve [ACTIONS_PIN_MIN_AGE_DAYS=<days>]` | コメント tag を `git ls-remote` で SHA へ解決し、ロックファイルを再生成します。 | 3 つのうち唯一ネットワークへ出ます。既定の検疫日数は 14。GitHub API のレート制限に掛かる場合は `GITHUB_TOKEN`（または `GH_TOKEN`）を設定してください。 |
| `make actions-pin-apply` | ロックファイルを元に `uses:` の `@<sha>` を書き換えます。 | コメント tag は保持します。 |
| `make actions-pin-check` | `uses:` がロックファイル通りに固定されているか検査します。 | 書き換えず、ネットワークにも出ません。pre-commit hook と CI の `actions-pin` job が実行します。未登録の参照 / 未固定・不一致の SHA / 壊れたロックファイル / 参照されなくなったエントリ / 解釈できない `uses:` 記法を検出して exit 1（fail-closed）。 |

`uses:` は **1 行 1 ステップのブロック記法**で書いてください。YAML の flow mapping
（`- {name: X, uses: owner/repo@v1}`）は検査の網に入らないため、素通りではなく error になります。

`ACTIONS_PIN_MIN_AGE_DAYS` は供給網検疫の窓です。解決先が公開から指定日数に満たない場合、既存のピンがあれば
それを維持し、無ければ採用を見送ります。公開直後の（侵害されている可能性のある）リリースを、上流が検知・
取り下げるより先に取り込まないための猶予です。`0` を渡すと検疫は無効になります。

検疫が見る経過日数は、Release の `published_at` と commit の日付のうち**新しい方**です。Release は tag 名に
紐づくだけで tag の付け替えでは動かず、commit の日付は発行者が任意に書けるため、どちらも単独では解決先の
新しさを表しません。ただし新しい方を採ってもなお、**検疫は自動化された乗っ取りに対して時間を稼ぐ仕組みで
あり、日付の偽装に耐える保証ではありません**。tag 付け替えそのものの検知はロックファイルの差分が担い、
`make actions-pin-resolve` は同一 tag が別 SHA へ解決された件を出力に明示します。

更新の運用手順は `actions-pin` スキルが持ちます。

## `.makefiles/security` 系

シークレットの混入と脆弱な依存をローカルで検知するためのスキャンです（[ADR 0110](../docs/adr/0110-security-operations.md)）。

抑止は `.gitleaks.toml` / `.gitleaksignore` / `.trivyignore.yaml` に限定し、各ファイル冒頭の抑止ポリシーに従って理由付きで記録します。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make secret-scan` | push 予定のコミット範囲を gitleaks でスキャンします。 | pre-push hook から実行されます。対象は「`HEAD` から辿れてどのリモートにも無いコミット」。検出時は exit 1 で失敗します（fail-closed）。検出値は `--redact` で出力しません。 |
| `make trivy-fs` | 依存ライブラリの脆弱性を Trivy fs でスキャンします。 | 手動実行専用で、**意図的に hook へ接続していません**。exit code でも落としません。脆弱性は push する当事者がその場で解消できず、diff と独立に状態が変わるためです。ブロックは昇格ゲートが持ちます（[ADR 0110](../docs/adr/0110-security-operations.md) 3.1）。 |

## 補足

- 既存グループファイルへのターゲット追加ならトップレベル編集は不要。ただし**新規** `.mk` ファイルを追加する場合は、
  トップレベル `Makefile` へ `include` 行の追記が必要（ワイルドカードではなく個別 include のため）
- リリースブランチ / タグ系のターゲットは GitHub のデフォルトブランチを操作し `origin` へ push します。実行前に
  [ADR 0150](../docs/adr/0150-git-workflow.md) を確認してください
