# Make コマンド一覧

[English](README.md) | 日本語

このドキュメントでは、本リポジトリで利用できる `make` コマンドの役割を説明します。
Make ターゲットは主に以下の単位で整理されています。

- `.makefiles/github` : GitHub 初期設定 / リリース / ラベル / ルール設定
- `.makefiles/tools` : 開発ツールの管理関連
- `.makefiles/security` : シークレット / 依存脆弱性のスキャン

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

リポジトリの初期化処理をまとめて実行します。
以下を順に行います。

- `gh` ログイン
- 初期タグ `v0.0.0` の作成と push
- `develop` / `staging` / `production` ブランチの作成
- GitHub デフォルトブランチの設定
- ブランチルールセット適用
- ラベル初期化

新規リポジトリを boilerplate として立ち上げる際の初期セットアップ用コマンドです。

#### セットアップ補助コマンド

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make setup-replace-license-copyright COPYRIGHT_HOLDER=<name> [COPYRIGHT_YEAR=<year>]` | LICENSE の著作権表記を更新します。 | 年は省略可能です。 |

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
| `make install-tools` | `mise.toml` に基づき Node.js / pnpm / gitleaks / Trivy をインストールします。 | mise の事前インストールが必要。詳細は [docs/adr/0003-version-manager.md](../docs/adr/0003-version-manager.md) 参照 |

## `.makefiles/security` 系

シークレットの混入と脆弱な依存をローカルで検知するためのスキャンです。いずれも pre-push hook から実行され、CI 側のゲートと同じコマンドを呼びます。

抑止は `.gitleaks.toml` / `.gitleaksignore` / `.trivyignore.yaml` に限定し、各ファイル冒頭の抑止ポリシーに従って理由付きで記録します。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make secret-scan` | push 予定のコミット範囲を gitleaks でスキャンします。 | 対象は「HEAD から辿れてどのリモートにも無いコミット」。検出時は exit 1 で失敗します（fail-closed）。検出値は `--redact` で出力しません。 |
| `make secret-scan-history` | コミット履歴全体を gitleaks でスキャンします。 | マージ済み履歴に埋もれた秘密を拾う用途。コミット数に比例して伸びるため hook には載せません。 |
| `make trivy-fs` | 依存ライブラリの脆弱性を Trivy fs でスキャンします。 | 修正版のあるものだけを報告し、exit code では落としません。厳格判定は昇格ゲートが CI 側で持ちます。 |
