> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# nextjs-boilerplate

**Next.js / React のプレゼンテーションレイヤーのアプリケーション基盤**。バックエンド（DB / 認証 /
ビジネスロジック）は別リポジトリまたはサービスが持ち、本リポジトリはプレゼンテーションレイヤーだけを
受け持って PaaS または静的 CDN へデプロイします（Docker は採らない —
[ADR 0011](docs/adr/0011-no-docker.ja.md)）。

ツールチェーン、lint / format、git hook、セキュリティスキャン、ドキュメント運用は配線済みで、規約は
暗黙知にせずすべて ADR として明文化しています。

採用しているのは **Next.js 16 / React 19** です。API・規約・ファイル構成は少し前の Next.js と食い違い、
とくにレンダリングモデルは古い前提がそのまま誤りになります（`"use client"` はバンドル境界であって
「クライアントでレンダリングせよ」ではありません）。用語と、それが招く誤りの一覧は
[docs/design/rendering.md](docs/design/rendering.ja.md) にあります。

> この README は意図的に最小限です。canonical はそれが規定する対象の隣にあり、各トピックはそれを
> 所有するドキュメントへのリンクに委ねています（[ドキュメントマップ](#ドキュメントマップ)を参照）。
> このページはエントリポイントにすぎません。

## 配線済みのもの

各項目は拡張するためのシームです。決定とその規約はリンク先にあります。

- **pnpm のみ**（lockfile はコミット必須）— [ADR 0001](docs/adr/0001-package-manager.ja.md)
- **ツールバージョンの SSOT は mise**（[`mise.toml`](mise.toml)）— [ADR 0003](docs/adr/0003-version-manager.ja.md)
- **biome 優先の lint / format**（ESLint は biome で表現できない検査のみ）— [ADR 0002](docs/adr/0002-formatter-linter.ja.md)
- **lefthook による git hook**（pre-commit / commit-msg / pre-push）— [ADR 0151](docs/adr/0151-git-hooks.ja.md)
- **ローカルのセキュリティスキャン**（gitleaks / Trivy）と抑止ポリシー — [ADR 0110](docs/adr/0110-security-operations.ja.md)
- **GitHub Actions 定義の lint**（actionlint + shellcheck）— [ADR 0153](docs/adr/0153-ci-configuration.ja.md)
- **story 単位の visual regression**（digest 固定した Playwright コンテナで撮る）— [ADR 0091](docs/adr/0091-test-verification-methods.ja.md) / [`vrt/README.md`](vrt/README.ja.md) / [機構](docs/design/vrt.ja.md)
- **ブランチ / コミット / リリース運用** — [ADR 0150](docs/adr/0150-git-workflow.ja.md)
- **リポジトリ運用の make ターゲット** — [`.makefiles/README.md`](.makefiles/README.ja.md)

## スコープと対象外

このリポジトリがどのチームとどのシステムに向けて設計されているか、そして想定していない用途は
[docs/project/scope.md](docs/project/scope.ja.md) が述べています。

**意図的に含めていないもの**は [docs/project/out-of-scope.md](docs/project/out-of-scope.ja.md) が
列挙しています。別ドメイン（バックエンドやインフラ）の責務であるもの、持たない非機能のツール選択、
用途に依存してここでは判断しないもの、です。どれも意図した境界であって、欠けではありません。

## 前提ツール

- [mise](https://mise.jdx.dev) — ツール / ランタイムのバージョン管理（**必須**。シェルで activate しておくこと。`make` ターゲットは mise 経由でツールを解決します）
- GitHub CLI（`gh`）— リポジトリ運用系ターゲット（`make setup-repo`、リリース系）が必要とします

## クイックスタート

```bash
git clone https://github.com/Tomy-ch/nextjs-boilerplate.git
cd nextjs-boilerplate

# 1. mise を導入し (https://mise.jdx.dev/getting-started.html)、シェルで activate する。
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc   # bash の場合は ~/.bashrc へ `mise activate bash` を追記
# 新しいターミナルを開き、mise の shim を PATH に載せる。

# 2. 固定バージョンのツールチェーン・依存・git hook を導入する。
make install-tools
pnpm install
pnpm exec lefthook install   # 自動では入らない。clone 後に 1 度だけ実行する

# 3. （任意）AI コーディングアシスタント向けの資産を導入する。開発・ビルドの必須経路ではない。
pnpm exec tsx scripts/bootstrap-plugins           # 公式プラグイン
pnpm exec tsx scripts/bootstrap-external-skills   # 外部スキル（graphify）

# 4. 開発サーバーを起動する。
pnpm dev
```

<http://localhost:3000> を開くと表示されます。`src/app/page.tsx` を編集すると自動で反映されます。

<!-- boilerplate-only:begin -->
## テンプレートとして使う

**Use this template** で新規プロジェクトを作る場合は
[`docs/get-started/setup-repository.md`](docs/get-started/setup-repository.ja.md) を上から辿ってください。
そこが持つのは順序と人手が要る箇所だけで、各手順の中身はそれが指す先のドキュメントが所有します。

このリポジトリが上流のテンプレートである間しか成り立たない記述と、スクリプトがそれを取り除くための
マーカーは [`docs/get-started/boilerplate-only-conventions.md`](docs/get-started/boilerplate-only-conventions.ja.md)
にあります。

<!-- boilerplate-only:end -->
## 導入時に見直すデフォルト

ここが供給しているデフォルトのうち、**別のバックエンド・別の組織・別の意匠であれば必ず偽になるもの**の
インデックスです。デフォルト値と変更手順は、それぞれを所有するドキュメントが持ちます。立ち上げの順序と
人手が要る箇所は [`docs/get-started/setup-repository.md`](docs/get-started/setup-repository.ja.md) が持ちます。

| 分類 | 何を | 参照先 |
| --- | --- | --- |
| 契約 | バックエンド契約の取得座標と、生成の入出力 | [openapi](openapi/README.ja.md#boilerplate-導入時の変更点) |
| 契約 | 契約から読めない値域と、エンドポイントをまたぐ参照の配線 | [mocks](mocks/README.ja.md#boilerplate-導入時の変更点) |
| 環境 | API・IdP・画像配信・テレメトリの接続先、秘密値、経路上の上限 | [env](env/README.ja.md#boilerplate-導入時の変更点) |
| 外部接続 | IdP の差し替え点 | [adapters/server/auth](src/adapters/server/auth/README.ja.md#差し替え点) |
| 外部接続 | 外向きの往復に許す時間・試行回数・遮断の条件 | [adapters/server/http](src/adapters/server/http/README.ja.md#boilerplate-導入時の変更点) |
| 外部接続 | 配信ヘッダが許す第三者 origin | [config](src/config/README.ja.md#boilerplate-導入時の変更点) |
| 外部接続 | バックエンドエラーが持つ追加情報の形 | [errors](src/errors/README.ja.md#boilerplate-導入時の変更点) |
| 運用 | 必須チェックの集合、保護するブランチ、通知の宛先、定期実行、資格情報を要する検査の取捨 | [.github/workflows](.github/workflows/README.ja.md#boilerplate-導入時の変更点) |
| 運用 | VRT ベースライン画像の置き場と、CI がそこへ書き込む資格 | [vrt](vrt/README.ja.md#boilerplate-導入時の変更点) |
| デザイン | 色・余白・形・書体と、配色と系統の軸 | [tokens](tokens/README.ja.md#boilerplate-導入時の変更点) |
| デザイン | サイトの名乗り（名前・説明・アイコン） | [app](src/app/README.ja.md#boilerplate-導入時の変更点) |
| デザイン | UI コンポーネント。参考実装であり、置き換えてよい | [components](src/components/README.ja.md#ここにあるものは参考実装です) |
| 認可 | 保護するルートと、そこへ入れる役割 | [model](src/model/README.ja.md#boilerplate-導入時の変更点) |
| 同梱サンプル | 破棄すると画面横断のテストから何が消えるか | [e2e](e2e/README.ja.md#同梱サンプルを破棄すると何が消えるか) <!-- sample:line --> |

**この表はデフォルト値を持ちません。** 値を 2 か所に置くと片方が遅れるためで、canonical はどれもリンク先です
（[ADR 0140](docs/adr/0140-documentation-operations.ja.md)）。

## 運用が普通と違うところ

ほとんどは見たままですが、**手順を知らないと詰まる**ところがいくつかあります。ここは名前とリンク
だけを置きます。

- **CI のツールチェーンは digest で照合される** — mise 自身のバージョンは `mise.toml` に書けないため
  [`.github/actions/setup-mise`](.github/actions/setup-mise/action.yaml) がバージョンと SHA256 を持ち、
  実行前に照合します。上げ方は [`.github/workflows/README.md`](.github/workflows/README.ja.md#mise-の導入)
- **VRT のベースライン画像は別リポジトリにある** — `baseline/images` はサブモジュールで、実体は画像だけを
  持つ置き場にあります。自分の置き場を用意するまで撮り直しは通りません（上記）。理由と運用は
  [`vrt/README.md`](vrt/README.ja.md)

詰まったときの引き先は [`.claude/skills/repo-ops`](.claude/skills/repo-ops/SKILL.ja.md) です。

## 開発ワークフロー

アプリケーション側のコマンドは `package.json` の scripts を pnpm から実行します。リポジトリ運用と
ツールチェーン整備は `make` ターゲットが受け持ちます。

```bash
pnpm dev / build / start        # 開発 / ビルド / 本番起動（build と start は APP_ENV を指定する）
pnpm lint / lint:ci / fix       # biome — エディタ相当 / 完全版 / 自動修正
pnpm typecheck                  # tsc --noEmit
pnpm lint:md                    # markdownlint + mermaid 構文検査

make help                       # 全 make ターゲットとその説明
```

`make help` が一覧の出所です。`.makefiles/**` の全ターゲットを列挙し、説明コメントの無いものを警告します。
各ターゲットの内容は [`.makefiles/README.md`](.makefiles/README.ja.md) にあります。

## ドキュメントマップ

ここを起点に、目的のトピックを所有するリンクを辿ってください。

### コア

- [docs/get-started/](docs/get-started/) — テンプレートから作成して動かすまでの手順（順序と、人手が要る箇所）
- [AGENTS.md](AGENTS.ja.md) — AI コーディングエージェント向けの運用ルール。規約そのものは持たず、どの文書が何を所有するかを指します
- [docs/README.md](docs/README.ja.md) — 設計知識をどの文書へ置くかを決める振り分け
- [docs/adr/README.md](docs/adr/README.ja.md) — アーキテクチャ決定記録（ADR）の台帳。1 行要約つきの全件一覧はここだけにあります
- [docs/rules.md](docs/rules.ja.md) — すべての変更を縛る実装規約（レイヤー境界 / データ分類 / フォーム / コメント / 作業の進め方）
- [docs/testing-conventions.md](docs/testing-conventions.ja.md) — テストの規約
- [docs/spec/README.md](docs/spec/README.ja.md) — 仕様書。実装が約束していること
- [docs/project/README.md](docs/project/README.ja.md) — このリポジトリが何であり、何でないか。スコープ、対象外、方針、バージョン、方向性
- [docs/reference/README.md](docs/reference/README.ja.md) — コードと歩調を合わせて変わるインベントリ

### 設計

- [docs/design/](docs/design/README.ja.md) — 個別のケースをどう決めるかの基準（レンダリング / データ取得 / 認証 / 可観測性ほか）
- [docs/playbook.md](docs/playbook.ja.md) — 実装したいことから、それをどこに置きどう検証するかを引く
- [docs/tutorial/](docs/tutorial/README.ja.md) — レイヤーを順に登って、動くものを組み立てる 1 本の道筋

### レイヤー README

- [app](src/app/README.ja.md) · [features](src/features/README.ja.md) · [components](src/components/README.ja.md) · [model](src/model/README.ja.md) · [adapters](src/adapters/README.ja.md)
- [capabilities](src/capabilities/README.ja.md) · [stores](src/stores/README.ja.md) · [config](src/config/README.ja.md) · [errors](src/errors/README.ja.md) · [logging](src/logging/README.ja.md) · [observability](src/observability/README.ja.md)

### 契約・データ・ツール

- [openapi/README.md](openapi/README.ja.md) — バックエンドの API 契約の取り込み
- [mocks/README.md](mocks/README.ja.md) — 契約から生成する、契約駆動のモック
- [env/README.md](env/README.ja.md) — 環境ごとの環境変数
- [tokens/README.md](tokens/README.ja.md) — デザイントークンの SSOT
- [e2e/README.md](e2e/README.ja.md) — 実ブラウザでの、画面を通した検証
- [vrt/README.md](vrt/README.ja.md) — ベースライン画像と比べる、story 単位の visual regression
- [scripts/README.md](scripts/README.ja.md) — リポジトリを検査・生成・操作するツール
- [.makefiles/README.md](.makefiles/README.ja.md) — 全 `make` ターゲット
- [.github/workflows/README.md](.github/workflows/README.ja.md) — CI / CD のワークフロー定義
- [docs-viewer/README.md](docs-viewer/README.ja.md) — ドキュメントポータルのビューア
- [.claude/README.md](.claude/README.ja.md) — Claude Code 向けの設定資産（スキル / エージェント / 権限境界 / 外部スキル）

## スタック

直接依存は、それぞれが担う単一の責務ごとにまとめて
[docs/reference/dependencies.md](docs/reference/dependencies.ja.md) がインベントリにしています。バージョンは
`package.json` が正です。依存を採用する基準は [ADR 0004](docs/adr/0004-library-management.ja.md) です。

## ブランチ戦略

本プロジェクトは Semantic Versioning に従います。バージョンはリリースブランチ `release/v<X.Y.Z>` の名前で
表し、タグは `production` の HEAD に打ちます — [docs/project/versioning.md](docs/project/versioning.ja.md)。
ブランチ・コミット・リリースの運用は [ADR 0150](docs/adr/0150-git-workflow.ja.md) です。

## セキュリティ

**脆弱性の報告** — 公開 issue は立てないでください。[SECURITY.md](SECURITY.ja.md) の説明に沿って GitHub の
Private Vulnerability Reporting を使ってください。対応の流れも同じファイルにあります。

## ライセンス

**MIT License** で公開しています — [LICENSE](LICENSE) を参照してください。
