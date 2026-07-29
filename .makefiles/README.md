# Make コマンド一覧

## 役割

`.makefiles/` は本リポジトリで使用するすべての `make` ターゲットの中央レジストリです。各 `.mk` ファイルは関連
ターゲットを領域別にグルーピングし、トップレベルの `Makefile` はそれらを `include` するだけなので、既存領域への
ターゲット追加はトップレベル編集なしで完結します。

ターゲットは以下の単位で整理されています。

- `.makefiles/github` : GitHub 初期設定 / リリース / ラベル / ルール設定 / ワークフロー Lint
- `.makefiles/tools` : 開発ツールの管理（mise）/ コミットメッセージ検証
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

actionlint は `run:` ステップのシェルも shellcheck 経由で検査するため、両バイナリを `mise.toml` で版固定して
います（[ADR 0003](../docs/adr/0003-version-manager.md)）。先に `make install-tools` を実行してください。

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
| `make install-tools` | `mise.toml` の `[tools]`（Node.js / pnpm / actionlint / shellcheck / gitleaks / Trivy）をインストールします。 | mise の事前インストールが必要。詳細は [ADR 0003](../docs/adr/0003-version-manager.md) 参照 |

### コミットメッセージ検証関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make commitlint [COMMIT_MSG_FILE=<path>]` | コミットメッセージを commitlint で検証します。 | `.lefthook.yaml` の commit-msg hook から呼ばれます。`COMMIT_MSG_FILE` 省略時は編集中のコミットメッセージを対象にします。規約は [ADR 0150](../docs/adr/0150-git-workflow.md) 参照 |

## `.makefiles/security` 系

シークレットの混入と脆弱な依存をローカルで検知するためのスキャンです。pre-push hook から実行され、CI 側のゲートと同じコマンドを呼びます（[ADR 0110](../docs/adr/0110-security-operations.md)）。

抑止は `.gitleaks.toml` / `.gitleaksignore` / `.trivyignore.yaml` に限定し、各ファイル冒頭の抑止ポリシーに従って理由付きで記録します。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make secret-scan` | push 予定のコミット範囲を gitleaks でスキャンします。 | 対象は「`HEAD` から辿れてどのリモートにも無いコミット」。検出時は exit 1 で失敗します（fail-closed）。検出値は `--redact` で出力しません。 |
| `make secret-scan-history` | コミット履歴全体を gitleaks でスキャンします。 | マージ済み履歴に埋もれた秘密を拾う用途。コミット数に比例して伸びるため hook には載せません。 |
| `make trivy-fs` | 依存ライブラリの脆弱性を Trivy fs でスキャンします。 | 修正版のあるものだけを報告し、exit code では落としません。厳格判定は昇格ゲートが CI 側で持ちます。 |

## 補足

- 既存グループファイルへのターゲット追加ならトップレベル編集は不要。ただし**新規** `.mk` ファイルを追加する場合は、
  トップレベル `Makefile` へ `include` 行の追記が必要（ワイルドカードではなく個別 include のため）
- リリースブランチ / タグ系のターゲットは GitHub のデフォルトブランチを操作し `origin` へ push します。実行前に
  [ADR 0150](../docs/adr/0150-git-workflow.md) を確認してください
