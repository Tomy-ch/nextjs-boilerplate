# 環境変数

環境別の実体は `env/.env.<環境>` に置きます。`src/config/load-environment.ts` が Next.js の
起動・build 前に選択したファイルを読み込みます。

`APP_ENV` が選択子であり、**指定は必須です**。未指定のまま起動すると、読み込むファイルを
選べないものとして落とします。5 つ以外の値も同じく落とします。既定を持たせない理由は
[ADR 0030](../docs/adr/0030-environment-variable-management.md) が持ちます。`APP_ENV` を直に
読むのは `src/config/application-environment.ts` だけで、同梱の秘密値を許すか・開発専用の口を開くか・
開発専用の route を build の束に載せるかの判定も、この 1 か所の解決を経由します。

CI と PaaS は環境設定で `APP_ENV` をそれぞれ `ci`、`dev`、`stg`、`prd` に設定します。ファイルは
1 プロセスにつき一度だけ読み込まれ、**すでに `process.env` にある値は上書きしません** —— PaaS / CI
が注入した値がファイルの値より優先されます。手元の開発では `pnpm dev` / `pnpm storybook` /
`pnpm build-storybook` が `local` を既定として渡すため、clone 直後はそのまま動きます。明示した
`APP_ENV` はその既定に勝ちます。配信物を作る `pnpm build` と `pnpm start` は既定を持たないので、
`APP_ENV=local pnpm build` のように指定します。

**`APP_API_BASE_URL` は build 時にも使われます。** リクエストをまたいで残す取得
（[ADR 0071](../docs/adr/0071-bff-api-integration.md) の `use cache`）は、キャッシュの中身を作るために
build 中にも呼ばれます。`APP_API_MODE=live` で取得先へ到達できない場所から `pnpm build` を回すと、
そこで落ちます。

**`mock` のときは `pnpm build` が取得先を自分で立てます**（[mocks/serve.ts](../mocks/serve.ts)）。
`src/instrumentation.ts` の interception はそれを立てたプロセスにしか効かず、プリレンダーは別の worker
プロセスで走るため、HTTP の口として立てないと届きません。`APP_API_BASE_URL` はその待ち受け先になります。

`next.config.ts` も build 時に検証済みの値を読み、`next/image` の許可 host（`MEDIA_ORIGIN`）、配信
ヘッダが許す origin（`APP_API_BASE_URL` / `MEDIA_ORIGIN` / `AUTH_ISSUER` / 容器 ID）、https で配信して
いるか（`AUTH_REDIRECT_URI` の scheme）、要求本体の上限（`NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES`）を
決めます。これらは `pnpm build` と `pnpm start` に同じ値を渡します。

## ファイルの書き方

5 つのファイルは同じ変数を同じ順序で持ち、順序は下の変数表と揃えます。ある環境に無関係な
変数でも行は消さず、行の形で「誰が値を与えるか」を表します。例外は下に挙げる 2 種類（検証のための
上書きと開発専用の口）だけで、それらは配信する環境のファイルに行を持ちません。

| 行の形 | 意味 | 例 |
| --- | --- | --- |
| `NAME=value` | このファイルが値を与える。`local` / `ci` の基本形 | `APP_API_MODE=mock` |
| `NAME=` | Optional の変数を「指定なし」のまま在庫として残す。未設定と空文字が同じ意味であること（[ADR 0030](../docs/adr/0030-environment-variable-management.md)）が前提 | `CLOCK_FIXED_NOW=` |
| `# NAME=` | 値は PaaS の環境設定か secret store が与える。ファイルは名前だけを持つ | `# AUTH_SESSION_SECRET=` |
| `# NAME=候補` | 同上。入れるなら通常この値、という候補を添える | `# AUTH_SCOPES=openid profile email api.read api.write` |
| `# NAME=on` | Code default が止まる側にある切り替え。行頭の `#` を外すのが「入れる」操作 | `# APP_MAINTENANCE_MODE=on` |

配信する環境（`dev` / `stg` / `prd`）のファイルが値を持つ行は 2 種類だけです。配備によらず同じで
秘密でもない値（接続モード、service 名）と、その環境だけが宣言する方針値（索引の可否）です。接続先と
秘密値は名前だけを持ち、実値は供給側に任せます —— 平文で commit しない
（[ADR 0030](../docs/adr/0030-environment-variable-management.md)）。

- 検証のためだけの上書き（時計の固定）は `ci` にだけ値を置き、配信する環境のファイルには行を置きません。
  書くと検証の都合が本番の起動条件に混ざり、`# NAME=` の形でも「供給側が与える」と読まれます
  （[ADR 0030](../docs/adr/0030-environment-variable-management.md)）。
- 開発専用の口に属する変数（`AUTH_MODE`）は、それが効く環境（`local` / `ci`）のファイルにしか
  書きません。配信する環境のファイルに行があると、効かないはずの値を入れる招きになります。効く
  環境を決めるのは `APP_ENV` です（[ADR 0030](../docs/adr/0030-environment-variable-management.md)）。

## サブシステム別の変数

節はサブシステムの prefix（`{SUBSYSTEM}_{NAME}`、[ADR 0028](../docs/adr/0028-naming-convention.md)）
に対応します。外部 SDK が標準名で直接読む変数（`OTEL_*`）はその標準名のまま置き、ブラウザへ出す
値だけが `NEXT_PUBLIC_` を名乗ります。

Notes 列のラベルは次の意味です（[ADR 0030](../docs/adr/0030-environment-variable-management.md)）。

- **Required** —— 欠落は build / 起動の失敗。
- **Code default `x`** —— 省略でき、スキーマが `x` を補う。
- **Optional** —— 省略でき、既定は「指定なし」。未設定と空文字は同じ。
- **Secret management required** —— 本番は secret store から供給し、平文で commit しない。
  `NEXT_PUBLIC_` を名乗らない。

Type 列の `URL` は http / https だけを、`origin` はパス無し（`new URL(v).origin === v` が成り立つ
形）だけを通します。検証は build 時と起動時に一度ずつ走り、要求経路とブラウザでは走りません。

### Application

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `APP_API_BASE_URL` | BFF が接続する API の base URL | URL | `http://localhost:8080` | Required。環境ごとの API 接続先 |
| `APP_API_MODE` | API 接続モード | `live` / `mock` | `live` | Required。`mock` は local / CI のみで用いる |
| `APP_MAINTENANCE_MODE` | 配信を止めているか | `off` / `on` | `on` | Code default `off`。`on` で全ルートを停止画面へ差し替える。切り替えには起動し直しが要る |

### Clock

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `CLOCK_FIXED_NOW` | 画面が「いま」として読む瞬間の固定 | ISO 8601 の日時 | `2026-01-01T00:00:00.000Z` | Optional。未設定・空文字なら実時計。検証の環境だけが指定する |

暦日で区切る画面は、区切りを要求のクエリへ載せます。クエリが実時計から導かれると、契約から応答を
組み立てるモックの seed も一緒に動くため、その画面の基準画像は撮った暦日のあいだしか一致しません。
`env/.env.ci` だけが値を持つのはこのためで、配信する環境は未設定のまま実時計で動きます。

### Media

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `MEDIA_ORIGIN` | バックエンドが返すオブジェクトキーの配信 origin | URL | `https://media.example.com` | Required。この値だけが `next/image` の許可 host と CSP の `img-src` を決める（[0045](../docs/adr/0045-fonts-and-images.md) / [0111](../docs/adr/0111-csp-security-headers.md)）。配信元が host 名でバケットを解決する形式なら、その host を含めた origin を置く |

### Observability

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `OBS_SERVICE_NAME` | テレメトリの発信元を表す service 名 | string | `Boilerplate Web` | Required。trace / metrics / logs の resource に `service.name` として載る。backend と同じ trace の中で発信元を見分けるため、相方のサービスと異なる値にする |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP の base endpoint | URL | `http://localhost:4318` | Required。OpenTelemetry 標準名をそのまま使う。各 signal は `/v1/traces` などを自動付与する |
| `OBS_TRACES_EXPORTER` | trace exporter の有効化値 | string | `otlp` / `none` | Code default `none`。空文字列または `none` は無効。`otlp` は OTLP exporter を構築する |
| `OBS_METRICS_EXPORTER` | metrics exporter の有効化値 | string | `otlp` / `none` | Code default `none`。空文字列または `none` は無効。`otlp` は OTLP exporter を構築する |
| `OBS_LOGS_EXPORTER` | logs exporter の有効化値 | string | `otlp` / `none` | Code default `none`。空文字列または `none` は無効。`otlp` は OTLP exporter を構築する |
| `OBS_RENDER_SPANS` | 描画を span に載せる範囲 | `none` / `screen` / `part` | `screen` | Code default `screen`。`screen` は画面の最上位（`page-content` / `view`）、`part` は feature が持つ部品まで。`part` は 1 描画の span が描く部品の数だけ増えるため、調査のときに開ける。trace 自体が無効なら効かない |

### Authentication

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `AUTH_MODE` | 認可の開始先 | `idp` / `dev` | `idp` | Code default `idp`。`dev` は IdP を立てずに `/dev/session` から session を発行させる。開発専用の口が開く環境（`local` / `ci`）でしか効かない |
| `AUTH_ISSUER` | OIDC issuer と Discovery の起点 | URL | `https://idp.example.com/realms/main` | Required。**同梱の `local` / `ci` が指すのは開発用の IdP**で、最初に自分の IdP へ差し替える |
| `AUTH_CLIENT_ID` | Authorization Code + PKCE の public client ID | string | `<IdP が発行した public client ID>` | Required。client secret は不要。同梱の値は開発用の IdP に登録されたものなので、自分の IdP へ登録し直した ID に差し替える |
| `AUTH_REDIRECT_URI` | OIDC callback URL | URL | `http://localhost:3000/api/auth/callback` | Required。IdP 登録値と完全一致させる |
| `AUTH_SCOPES` | 認可リクエストの space-delimited scope | string | `openid profile email api.read api.write` | Required |
| `AUTH_SESSION_SECRET` | BFF session cookie を保護する秘密値 | string | `local-development-session-secret-change-before-production` | **Secret management required**。32 文字以上。`local` / `ci` に同梱している値は公開リポジトリに載っているため、それ以外の環境では起動時に拒否される |

### HTTP

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` | 1 つの要求 URL に許すバイト数の上限 | integer | `8000` | Required。ブラウザ / CDN / リバースプロキシ / backend のうち、経路上で最も小さい上限を入れる。既定値はどれも持たない |
| `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` | 中継する 1 件のアップロードに許すバイト数の上限 | integer | `4194304` | Required。配備先が要求本体に課す上限より内側に取る。外側の値は配備先が先に打ち切るため効かない |
| `HTTP_ALLOWED_ORIGINS` | BFF（`/api/*`）を別 origin から呼ばせる相手 | origin のカンマ区切り | `https://admin.example.com,https://app.example.com` | Optional。空なら同一 origin だけ。挙げた origin は CORS で開き、状態を変える要求の送信元としても信頼する（[0111](../docs/adr/0111-csp-security-headers.md)）。パス付き・`*` は不可 |

### Site

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `SITE_PUBLIC_ORIGIN` | 外から見たこのサイトの origin | origin（パス無し） | `https://www.example.com` | Required。canonical / `sitemap.xml` / OG 画像の絶対 URL はこの値へ経路を足して組み立てる。要求の `Host` からは採らない（配信面を挟むと公開名と一致しない） |
| `SITE_INDEXABLE` | 検索エンジンに索引させてよいか | `off` / `on` | `on` | Code default `off`。`on` で `robots.txt` が巡回を許し、画面から `noindex` が外れる。**索引させてよい環境（通常は `prd`）だけが `on` を宣言する**（[`docs/rules.md#config`](../docs/rules.md#config)） |

**この 2 つは build 時にも読まれる。** 静的に描かれる画面の metadata と `robots.txt` はプリレンダーに
焼き込まれるため、`pnpm build` と `pnpm start` に同じ値を渡す。起動時の差し替えだけでは効かない。

### Analytics

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID` | 同意ゲートの裏で読み込むタグマネージャの容器 ID | string | `GTM-ABC1234` | Optional。**空は「未設定」ではなく「読み込まない」** —— Google への依存を外す口がこれで、外した状態でも画面は成立する（[0131](../docs/adr/0131-cookie-consent.md)）。secret ではない（容器 ID はタグを読む URL に現れるため、使っているサイトでは常に公開されている）。値を入れる配備は、`script-src` / `connect-src` / `img-src` が Google の origin を許し、`Cross-Origin-Embedder-Policy` が降りることを受け入れる |

## boilerplate 導入時の変更点

`local` と `ci` に入っている接続先は、本リポジトリの相方として開発されたバックエンドと、その隣に
立てる開発用 IdP を指しています。**どれも自分の置き場には実在しないので、値を入れ替えるまで
手元は繋がりません。** `dev` / `stg` / `prd` は接続先と秘密値を名前だけで持つので、値は PaaS か
secret store へ入れます。

| 何を | 既定 | 変更する箇所 |
| --- | --- | --- |
| API の接続先 | `APP_API_BASE_URL` が手元の相方を指す | `.env.local` / `.env.ci` と、配信する環境の設定。**build 時にも読まれる**（上記） |
| IdP | `AUTH_ISSUER` / `AUTH_CLIENT_ID` が開発用 IdP とそこへ登録した client を指す | 同上。`AUTH_REDIRECT_URI` は IdP 登録値と完全一致させる |
| session の秘密値 | `AUTH_SESSION_SECRET` は `local` / `ci` の値が公開リポジトリに載っており、他の環境では起動時に拒否される | 配信する環境ごとに secret store から供給する |
| 画像の配信元 | `MEDIA_ORIGIN` が手元の置き場を指す。**画像を 1 枚も置かない間も必須**で、この値だけが `next/image` の許可 host と CSP の `img-src` を決める | 同上 |
| テレメトリの送信先 | `OTEL_EXPORTER_OTLP_ENDPOINT` が手元の collector を、`OBS_SERVICE_NAME` が既定の service 名を指す | 送信先と、相方のサービスと重ならない名前へ |
| 公開 origin | `SITE_PUBLIC_ORIGIN` が手元の口を指す。canonical / `sitemap.xml` / OG 画像の絶対 URL がこれを起点にする | 外から見た自分の origin へ |
| 索引の可否 | `SITE_INDEXABLE` は Code default `off` | 索引させてよい環境だけが `on` を宣言する |
| URL と本体の上限 | `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` / `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` は既定を持たない | 経路上で最も小さい上限を測って入れる |
| 別 origin からの BFF 呼び出し | `HTTP_ALLOWED_ORIGINS` は空（同一 origin だけ） | 開く相手があるときだけ |
| タグマネージャ | `NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID` は空（読み込まない） | 使うときだけ容器 ID を入れる。CSP の許可 origin も一緒に動く |

各変数の意味・型・必須かどうかは上の表が持ちます。ここが挙げているのは**入れ替えないと偽になる
もの**だけで、それ以外の既定は触らずに動きます。

配信ヘッダが持つ第三者 origin の固定値は
[`src/config/README.md`](../src/config/README.md#what-to-change-when-adopting) が、外向き通信の
timeout と再試行は
[`src/adapters/server/http/README.md`](../src/adapters/server/http/README.md#what-to-change-when-adopting)
が持ちます。どちらも環境変数ではありません。

## 運用

- config を経由して利用する変数は `src/config/` のスキーマで、ビルド時とサーバー起動時に検証される。
- `NEXT_PUBLIC_` 変数にはブラウザへ露出してよい公開値だけを置く。secret を置いてはならない。
- `NEXT_PUBLIC_` はビルド時にリテラルへ置換されるため、値の変更には再ビルドが要る。起動時の差し替えは効かない。
- 新しい変数を追加する前に、利用目的・server/client 境界・required/default・secret 管理ラベルを確認する。追加はユーザ確認を要する（[ADR 0030](../docs/adr/0030-environment-variable-management.md)）。
- 追加の手順はスキル `new-env` が持つ（[ADR 0030](../docs/adr/0030-environment-variable-management.md) 補足）。手で行うなら、サブシステムの節へ変数表の行を足し、5 つのファイルへ「ファイルの書き方」の形で 1 行ずつ置く。config 経由で読む変数は、さらに `src/config/<purpose>/<purpose>.schema.ts` の validator、`environment.ts` の登録、`environment.fixture.ts` の stub、runtime module の getter を同時に足す（[`src/config/README.md`](../src/config/README.md)）。config を経由しない変数（外部 SDK が標準名で直接読むもの）も、表と 5 つのファイルには載せる。
