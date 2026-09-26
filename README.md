# nextjs-boilerplate

**Next.js / React の表示層アプリケーション基盤**。バックエンド（DB / 認証 / ビジネスロジック）は別リポジトリ
またはサービスが持ち、本リポジトリは表示層だけを受け持って PaaS または静的 CDN へデプロイします
（Docker は採らない — [ADR 0011](docs/adr/0011-no-docker.md)）。

ツールチェーン、lint / format、git hook、セキュリティスキャン、ドキュメント運用は配線済みで、規約は
暗黙知にせずすべて ADR として明文化しています。

採用しているのは **Next.js 16 / React 19** です。API・規約・ファイル構成は少し前の Next.js と食い違い、
とくに描画モデルは古い前提がそのまま誤りになります（`"use client"` はバンドル境界であって「クライアント
で描画せよ」ではありません）。用語と、それが招く誤りの一覧は [docs/design/rendering.md](docs/design/rendering.md)
にあります。

> この README は意図的に最小限です。正はそれが規定する対象の隣にあり、各トピックはそれを所有する
> ドキュメントへのリンクに委ねています（[ドキュメントマップ](#ドキュメントマップ)を参照）。このページは
> 入口にすぎません。

## 配線済みのもの

各項目は拡張するための seam です。決定とその規約はリンク先にあります。

- **pnpm のみ**（lockfile はコミット必須）— [ADR 0001](docs/adr/0001-package-manager.md)
- **ツール版数の SSOT は mise**（[`mise.toml`](mise.toml)）— [ADR 0003](docs/adr/0003-version-manager.md)
- **biome 優先の lint / format**（ESLint は biome で表現できない検査のみ）— [ADR 0002](docs/adr/0002-formatter-linter.md)
- **lefthook による git hook**（pre-commit / commit-msg / pre-push）— [ADR 0151](docs/adr/0151-git-hooks.md)
- **ローカルのセキュリティスキャン**（gitleaks / Trivy）と抑止ポリシー — [ADR 0110](docs/adr/0110-security-operations.md)
- **GitHub Actions 定義の lint**（actionlint + shellcheck）— [ADR 0153](docs/adr/0153-ci-configuration.md)
- **story 単位の visual regression**（digest 固定した Playwright コンテナで撮る）— [ADR 0091](docs/adr/0091-test-verification-methods.md) / [`vrt/README.md`](vrt/README.md) / [機構](docs/design/vrt.md)
- **ブランチ / コミット / リリース運用** — [ADR 0150](docs/adr/0150-git-workflow.md)
- **リポジトリ運用の make ターゲット** — [`.makefiles/README.md`](.makefiles/README.md)

## 運用が普通と違うところ

ほとんどは見たままですが、**手順を知らないと詰まる**ところがいくつかあります。ここは名前とリンク
だけを置きます。

- **CI のツールチェーンは digest で照合される** — mise 自身の版は `mise.toml` に書けないため
  [`.github/actions/setup-mise`](.github/actions/setup-mise/action.yaml) が版と SHA256 を持ち、
  実行前に照合します。上げ方は [`.github/workflows/README.md`](.github/workflows/README.md#mise-の導入)
- **VRT の基準画像は別リポジトリにある** — `baseline/images` はサブモジュールで、実体は画像だけを
  持つ置き場にあります。自分の置き場を用意するまで撮り直しは通りません（下記）。理由と運用は
  [`vrt/README.md`](vrt/README.md)

詰まったときの引き先は [`.claude/skills/repo-ops`](.claude/skills/repo-ops/SKILL.ja.md) です。

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

# 2. 固定版のツールチェーン・依存・git hook を導入する。
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

**Use this template** で新規プロジェクトを作る場合は [`docs/get-started/setup-repository.md`](docs/get-started/setup-repository.md) を上から辿ってください。 <!-- boilerplate-only:line -->

## 導入時に見直す既定

ここが供給している既定のうち、**別のバックエンド・別の組織・別の意匠であれば必ず偽になるもの**の
索引です。既定値と変更手順は、それぞれを所有するドキュメントが持ちます。立ち上げの順序と人手が
要る箇所は [`docs/get-started/setup-repository.md`](docs/get-started/setup-repository.md) が持ちます。

| 分類 | 何を | 参照先 |
| --- | --- | --- |
| 契約 | バックエンド契約の取得座標と、生成の入出力 | [openapi](openapi/README.md#boilerplate-導入時の変更点) |
| 契約 | 契約から読めない値域と、口をまたぐ参照の配線 | [mocks](mocks/README.md#boilerplate-導入時の変更点) |
| 環境 | API・IdP・画像配信・テレメトリの接続先、秘密値、経路上の上限 | [env](env/README.md#boilerplate-導入時の変更点) |
| 外部接続 | IdP の差し替え点 | [adapters/server/auth](src/adapters/server/auth/README.md#差し替え点) |
| 外部接続 | 外向きの往復に許す時間・試行回数・遮断の条件 | [adapters/server/http](src/adapters/server/http/README.md#boilerplate-導入時の変更点) |
| 外部接続 | 配信ヘッダが許す第三者 origin | [config](src/config/README.md#boilerplate-導入時の変更点) |
| 外部接続 | バックエンドエラーが持つ追加情報の形 | [errors](src/errors/README.md#boilerplate-導入時の変更点) |
| 運用 | 必須チェックの集合、保護するブランチ、通知の宛先、定期実行、資格情報を要する検査の取捨 | [.github/workflows](.github/workflows/README.md#boilerplate-導入時の変更点) |
| 運用 | VRT 基準画像の置き場と、CI がそこへ書き込む資格 | [vrt](vrt/README.md#boilerplate-導入時の変更点) |
| 意匠 | 色・余白・形・書体と、配色と系統の軸 | [tokens](tokens/README.md#boilerplate-導入時の変更点) |
| 意匠 | サイトの名乗り（名前・説明・アイコンの印） | [app](src/app/README.md#boilerplate-導入時の変更点) |
| 意匠 | UI 部品。参考実装であり、置き換えてよい | [components](src/components/README.md#ここにあるものは参考実装です) |
| 認可 | 保護する経路と、そこへ入れる役割 | [model](src/model/README.md#boilerplate-導入時の変更点) |
| 同梱サンプル | 破棄すると画面横断のテストから何が消えるか | [e2e](e2e/README.md#同梱サンプルを破棄すると何が消えるか) <!-- sample:line --> |

**この表は既定値を持ちません。** 値を 2 か所に置くと片方が遅れるためで、正はどれもリンク先です
（[ADR 0140](docs/adr/0140-documentation-operations.md)）。

## コマンド

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
各ターゲットの内容は [`.makefiles/README.md`](.makefiles/README.md) にあります。

## ドキュメントマップ

ここを起点に、目的のトピックを所有するリンクを辿ってください。

- [docs/get-started/](docs/get-started/) — テンプレートから作成して動かすまでの手順（順序と、人手が要る箇所）
- [AGENTS.md](AGENTS.md) — AI コーディングエージェント向けの運用ルール。規約そのものは持たず、どの文書が何を所有するかを指します（日本語訳は [AGENTS.ja.md](AGENTS.ja.md)）
- [docs/adr/README.md](docs/adr/README.md) — アーキテクチャ決定記録（ADR）の台帳。1 行要約つきの全件一覧はここだけにあります
- [docs/rules.md](docs/rules.md) — すべての変更を縛る実装規約（層境界 / データ分類 / フォーム / コメント / 作業の進め方）
- [docs/design/](docs/design/README.md) — 個別のケースをどう決めるかの基準（描画 / データ取得 / 認証 / 可観測性ほか）
- [docs/testing-conventions.md](docs/testing-conventions.md) — テストの規約
- [.makefiles/README.md](.makefiles/README.md) — 全 `make` ターゲット
- [.claude/README.md](.claude/README.md) — Claude Code 向けの設定資産（スキル / エージェント / 権限境界 / 外部スキル）
