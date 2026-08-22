# 環境変数

環境別の実体は `env/.env.<環境>` に置きます。`src/config/load-environment.ts` が Next.js の
起動・build 前に選択したファイルを読み込みます。

`APP_ENV` が選択子であり、**指定は必須です**。未指定のまま起動すると、読み込むファイルを
選べないものとして落とします。既定を持たせると、設定を忘れた実環境が同梱の `env/.env.local`
を読み、注入し忘れた変数だけが手元向けの値で埋まった状態で起動します。

CI と PaaS は環境設定で `APP_ENV` をそれぞれ `ci`、`dev`、`stg`、`prd` に設定します。PaaS の
環境変数はファイルの値より優先されます。手元の開発では `pnpm dev` / `pnpm storybook` /
`pnpm build-storybook` が `local` を渡すため、clone 直後はそのまま動きます。配信物を作る
`pnpm build` と `pnpm start` は既定を持たないので、`APP_ENV=local pnpm build` のように指定します。

`dev` / `stg` / `prd` の required 値は PaaS の環境設定または secret store から供給します。
そのため、これらのファイルは変数名と既定値候補だけをコメントで保持します。

## サブシステム別の変数

### Application

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `APP_API_BASE_URL` | BFF が接続する API の base URL | URL | `http://localhost:8080` | Required。環境ごとの API 接続先 |
| `APP_API_MODE` | API 接続モード | `live` / `mock` | `live` | Required。`mock` は local / CI のみで用いる |

### Media

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `MEDIA_ORIGIN` | バックエンドが返すオブジェクトキーの配信 origin | URL | `http://gobp-local.web.garage.localhost:3902` | Required。Garage は virtual-host 形式を使う |

### Observability

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP の base endpoint | URL | `http://localhost:4318` | Required。OpenTelemetry 標準名をそのまま使う。各 signal は `/v1/traces` などを自動付与する |
| `OBS_TRACES_EXPORTER` | trace exporter の有効化値 | string | `otlp` / `none` | 空文字列または `none` は無効。`otlp` は OTLP exporter を構築する |
| `OBS_METRICS_EXPORTER` | metrics exporter の有効化値 | string | `otlp` / `none` | 空文字列または `none` は無効。`otlp` は OTLP exporter を構築する |
| `OBS_LOGS_EXPORTER` | logs exporter の有効化値 | string | `otlp` / `none` | 空文字列または `none` は無効。`otlp` は OTLP exporter を構築する |

### Authentication

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `AUTH_MODE` | 認可の開始先 | `idp` / `dev` | `idp` | Code default `idp`。`dev` は IdP を立てずに `/dev/session` から session を発行させる。開発専用の口が開く環境（`local` / `ci`）でしか効かない |
| `AUTH_ISSUER` | OIDC issuer と Discovery の起点 | URL | `http://localhost:2010/default` | Required。local は go-boilerplate の開発用 IdP |
| `AUTH_CLIENT_ID` | Authorization Code + PKCE の public client ID | string | `go-boilerplate-client` | Required。client secret は不要 |
| `AUTH_REDIRECT_URI` | OIDC callback URL | URL | `http://localhost:3000/api/auth/callback` | Required。IdP 登録値と完全一致させる |
| `AUTH_SCOPES` | 認可リクエストの space-delimited scope | string | `openid profile email api.read api.write` | Required |
| `AUTH_SESSION_SECRET` | BFF session cookie を保護する秘密値 | string | `local-development-session-secret-change-before-production` | **Secret management required**。32 文字以上。`local` / `ci` に同梱している値は公開リポジトリに載っているため、それ以外の環境では起動時に拒否される |

### HTTP

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` | 1 つの要求 URL に許すバイト数の上限 | integer | `8000` | Required。ブラウザ / CDN / リバースプロキシ / backend のうち、経路上で最も小さい上限を入れる。既定値はどれも持たない |
| `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` | 中継する 1 件のアップロードに許すバイト数の上限 | integer | `4194304` | Required。配備先が要求本体に課す上限より内側に取る。外側の値は配備先が先に打ち切るため効かない |

## 運用

- config を経由して利用する変数は `src/config/` のスキーマで、ビルド時とサーバー起動時に検証される。
- `NEXT_PUBLIC_` 変数にはブラウザへ露出してよい公開値だけを置く。secret を置いてはならない。
- `NEXT_PUBLIC_` はビルド時にリテラルへ置換されるため、値の変更には再ビルドが要る。起動時の差し替えは効かない。
- 新しい変数を追加する前に、利用目的・server/client 境界・required/default・secret 管理ラベルを確認する。
