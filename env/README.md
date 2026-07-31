# 環境変数

環境別の実体は `env/.env.<環境>` に置きます。`src/config/load-environment.ts` が Next.js の
起動・build 前に選択したファイルを読み込みます。

`APP_ENV` が選択子であり、未指定時は `local` です。CI と PaaS は環境設定で `APP_ENV` を
それぞれ `ci`、`dev`、`stg`、`prd` に設定します。PaaS の環境変数はファイルの値より優先
されます。

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
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP exporter の送信先 | URL | `http://localhost:4318` | Required。OpenTelemetry 標準名をそのまま使う |

### Authentication

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `AUTH_ISSUER` | OIDC issuer と Discovery の起点 | URL | `http://localhost:4000` | Required。local は go-boilerplate の mock auth server |
| `AUTH_CLIENT_ID` | Authorization Code + PKCE の public client ID | string | `go-boilerplate-client` | Required。client secret は不要 |
| `AUTH_REDIRECT_URI` | OIDC callback URL | URL | `http://localhost:3000/api/auth/callback` | Required。IdP 登録値と完全一致させる |
| `AUTH_SCOPES` | 認可リクエストの space-delimited scope | string | `openid profile email api.read api.write` | Required |
| `AUTH_SESSION_SECRET` | BFF session cookie を保護する秘密値 | string | `local-development-session-secret-change-before-production` | **Secret management required**。32 文字以上。production 値をテンプレートへ書かない |

## 運用

- config を経由して利用する変数は `src/config/` のスキーマで、ビルド時とサーバー起動時に検証される。
- `NEXT_PUBLIC_` 変数は現時点で定義しない。必要になった場合も secret を置いてはならない。
- 新しい変数を追加する前に、利用目的・server/client 境界・required/default・secret 管理ラベルを確認する。
