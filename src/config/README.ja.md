> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# config

型付き設定を目的別に提供するカーネルです。各 config は `#` private field と getter
だけを公開する不変の ESM singleton です。

## 受け入れるもの

- 環境変数の検証、目的別 config、設定値の不変な公開面

## 受け入れないもの

- UI、fetch、業務ロジック

## config 一覧

| モジュール | 用途 | 種別 | 利用者 |
| --- | --- | --- | --- |
| `application-environment.ts` | `APP_ENV` の解決と、環境変数だけから決まる判定（開発専用のエンドポイントを開けてよい環境か）。Node API を使わないので `proxy.ts` から辿れる | server + build 境界 | `environment.ts` / `load-environment.ts` / `next.config.ts` / `adapters/server/auth` |
| `load-environment.ts` | `env/.env.<環境>` の一度きりの読込。`dotenv` と `node:path` を使うため、起動 / ビルド境界だけが呼ぶ | server + build 境界 | `bootstrap.server.ts` / `next.config.ts` / build script / `playwright.e2e.config.ts` |
| `environment.ts` | 全 purpose の validator を束ねた全量検証と、その結果のプロセス内キャッシュ | server + build 境界 | 各 `*.server.ts` / `next.config.ts` |
| `environment.fixture.ts` | 検証を通る環境変数一式（テスト専用。並びを書く唯一の場所） | test | このカーネルのテストと、`getEnvironment` を差し替える読み手のテスト |
| `validate-environment.server.ts` | import されると全 server Config の getter を一度ずつ呼ぶ起動用の集約エントリポイント | server | `bootstrap.server.ts` だけ |
| `bootstrap.server.ts` | 起動時の ENV 読込と全 config 検証 | server | `src/instrumentation.ts` |
| `api/api.schema.ts` / `api/api.server.ts` | API base URL と接続モードの schema / Config | server | `adapters/server` と起動・ビルド境界 |
| `auth/auth.schema.ts` / `auth/auth.server.ts` | OIDC と BFF session の schema / Config。schema は https で配信されているかの判定（`isServedOverTls`）も持つ | server | `adapters/server` と起動・ビルド境界 |
| `clock/clock.schema.ts` / `clock/clock.server.ts` | 画面が読む「いま」の schema / Config | server | `app` と起動・ビルド境界 |
| `maintenance/maintenance.schema.ts` / `maintenance/maintenance.server.ts` | 配信を止めているかの schema / Config | server | `proxy` と起動・ビルド境界 |
| `media/media.schema.ts` / `media/media.server.ts` | media origin の schema / Config | server | `adapters/server` と起動・ビルド境界 |
| `observability/observability.schema.ts` / `observability/observability.server.ts` | service 名・OTLP endpoint・signal 別 exporter の schema / Config | server | 起動・ビルド境界 |
| `http/http.schema.ts` / `http/http.server.ts` / `http/http.client.ts` | リクエスト URL とアップロードに許すバイト数の上限、BFF を別 origin から呼ばせる相手の schema / Config | server + client | `adapters/server` / `adapters/client` / `src/proxy.ts` と起動・ビルド境界 |
| `site/site.schema.ts` / `site/site.server.ts` | 外から見た origin と、インデックスさせてよいかの schema / Config | server | `app`（root layout の metadata / `sitemap.ts` / `robots.ts`）と起動・ビルド境界 |
| `analytics/analytics.schema.ts` / `analytics/analytics.client.ts` | 同意ゲートの裏で読み込むタグマネージャのコンテナ ID の schema / Config。**空は「読み込まない」という指定**で、Google への依存を外す口になる | client | `app` の client island |
| `security-headers/security-headers.ts` | 全経路に付ける配信ヘッダ（CSP と同伴ヘッダ）の組み立て | build 境界 | `next.config.ts` |

各 `config/<purpose>/<purpose>.schema.ts` が自分の目的に属する Zod validator を、対応する
`<purpose>.server.ts` が不変 Config を所有します。`environment.ts` は validator を呼んで全量検証を
実行するだけで、個別の変数規則を持ちません。`next.config.ts` が build 時に、
`src/instrumentation.ts` がサーバー起動時に検証を実行します。

## 目的別 module の形

purpose は値を読む側の**サブシステム**の単位で、読み手が引きます。変数名の接頭辞
（[0028](../../docs/adr/0028-naming-convention.ja.md) の `{SUBSYSTEM}_{NAME}`）は命名の単位で purpose とは独立し、同じ接頭辞の
変数が読み手の違いで別の purpose に分かれることも、外部の標準名をそのまま使う変数が purpose に
属することもあります。1 つの purpose は次の 3 種のファイルから成り、全 purpose が同じ形をとります。

### `<purpose>.schema.ts` —— 変数ごとの validator

- 変数 1 つにつき validator を返す関数を 1 つ export する（`<name>Validator()`）。`environment.ts` が
  変数名をキーにこれを並べる。
- purpose の変数を変数名そのままのキーで持つ型 `<Purpose>Environment` を export する。値の型は
  `z.infer<ReturnType<typeof <name>Validator>>` で validator から導き、型を二重に書かない。
  `<purpose>.server.ts` の `fromValues()` はこの型で受ける。
- **import するのは validator ライブラリだけ。** `process.env` も `APP_ENV` も読まない。環境に依る
  条件（同梱の秘密値を許すか）は validator の**引数**にし、渡すのは `environment.ts` の責務にする。
  schema が環境を読むと、validator 単体のテストが実行環境に左右される。
- 読み手が要る純関数（`isServedOverTls` のような、検証済みの値から別の事実を導くもの）も schema に
  置く。`server-only` を持たないので、build 境界も読める。

### `<purpose>.server.ts` —— 不変 Config と singleton

- 先頭に `import "server-only"`。
- `class <Purpose>Config` は `readonly #field` + `private constructor` + `static fromValues(values:
  <Purpose>Environment)` + getter だけを持ち、**class は export しない**。
- module 変数 `let <purpose>Config: <Purpose>Config | undefined` と
  `export function get<Purpose>Config()` の 1 組で singleton を作る。中身は
  `??= <Purpose>Config.fromValues(getEnvironment())` の 1 行で、ENV の読み直しも parse も
  ここでは起きない。
- getter は**読み手の問いに答える形**で公開する。on / off のつまみは boolean の問いに畳み
  （`isStopped` / `isIndexable` / `tracesEnabled`）、生の `on` / `off` を配らない。名前のある選択肢
  （接続モード、認可の開始先）はそのまま返す（`mode`）。`forbidden: business-logic` との線は
  「その変数だけで決まる問い」までで、それを超える判定は読み手が持つ。
- 環境変数**だけ**から決まる判定はこのカーネルが持ち（開発専用のエンドポイントを開けてよい環境か、https で
  配信されているか）、**他の状態と併せる判定は読み手が持つ**。認可の開始先が `dev` でも、実際に
  開発用の経路を選ぶかは環境と併せて `adapters/server/auth` が決める。config はその値を運ぶだけで、
  「この値だけでは効かない」ことを getter の文書に書く。
- 呼ぶたびに新しい値を返すアクセサは、返す実体を共有しない。固定された「いま」も `now()` は毎回新しい
  `Date` を返す —— 同じ実体を配ると、受け取った側の破壊的な操作が次の呼び出し元へ伝わる。

### `<purpose>.client.ts` —— `NEXT_PUBLIC_` の typed view

- `export const NAME: type = <変換>(process.env["NEXT_PUBLIC_..."])` の形だけを持つ。変数名は文字列
  リテラルで名指し、検証はしない（build 時に置換されるのは検証を通った値そのもの）。
- server と client の両側が同じ変数を読む値（リクエスト URL / アップロードの上限）は、しきい値の宣言を env の
  1 行に閉じるための形である。**client 側の判定は根拠にしない** —— ブラウザ側は送信者が差し替え
  られるので、受信エンドポイントが同じ値で再び確かめる（[0075](../../docs/adr/0075-file-upload-seam.ja.md)）。
- ブラウザへ出て困らない値だけを置く。「困らない」の根拠（コンテナ ID はタグを読み込む URL に現れる）を
  module の文書に書く。

### purpose か変数を足すとき

1. `<purpose>.schema.ts` に validator 関数と `<Purpose>Environment` のキーを足す。
2. `environment.ts` の `environmentSchema` に変数名で登録する。束ねる場所はここだけである。
3. `<purpose>.server.ts` の field / `fromValues()` / getter、または `<purpose>.client.ts` の定数を足す。
4. 新しい purpose なら `validate-environment.server.ts` に getter の呼出しを足す。忘れると起動時の
   検証から漏れ、最初のリクエストで落ちる。
5. `environment.fixture.ts` の `VALID_ENVIRONMENT` と `PARSED_ENVIRONMENT` の両方に足す。前者は
   `satisfies Record<keyof Environment, string>` で、漏れを型検査が拾う。
6. `<purpose>.schema.test.ts` と `<purpose>.server.test.ts` を置く（下記「テスト」）。
7. `env/.env.*` と [`env/README.md`](../../env/README.md) の変数表（変数の存在の正）、この README の
   一覧（設定値の意味の正）を更新する。分担は [0030](../../docs/adr/0030-environment-variable-management.ja.md)。
8. 読み手を `adapters/server` か起動 / ビルド境界に置く。読み手を増やす判断の正は「運用」を見る。

`/new-env` がこの手順を辿る。

## 検証の語彙

validator は**変数の形**を検証し、値の意味は判定しません。同じ形は同じ書き方で揃えます。

| 形 | 書き方 | 使う変数 |
| --- | --- | --- |
| http / https の URL | `z.url()` に protocol の `refine` | 接続先・issuer・callback・OTLP endpoint |
| origin（scheme + host + port、パス無し） | `new URL(value).origin === value` を `refine` | `Origin` ヘッダと完全一致で比べる値、絶対 URL の base |
| 選択肢 | `z.enum([...])` | 接続モード・認可の開始先 |
| 省略できる選択肢 | `z.string().trim().optional().transform(空 → デフォルト).pipe(z.enum([...]))` | on / off のつまみ |
| 省略できる自由値 | `.optional()` + `refine` + `transform(空 → undefined)`、または `.default("")` に空を許す `refine` | 固定する「いま」・コンテナ ID |
| バイト数 | `z.coerce.number().int().positive()` | 上限 |
| カンマ区切りの一覧 | `.default("")` → split / trim / 空要素を除去 → 各要素を `refine` | 許可 origin |

- **origin と URL を区別する。** 絶対 URL の base にする値（外から見た origin）にパスを許すと、
  `new URL("/path", base)` がそのパスを捨てて意図と結果が食い違う。`Origin` ヘッダと比べる値も
  同じ形でなければ完全一致にならない。CSP へ載せる origin は組み立て側が `new URL(value).origin`
  に落とすので、URL として受けた値のパスやポートの有無は載る形に影響しない。
- **省略できる変数は、未設定と空文字を同じ「指定なし」として扱う**（[0030](../../docs/adr/0030-environment-variable-management.ja.md)）。配信する環境の env ファイルはプラットフォームが与える変数だけを並べ、検証や運用のための
  つまみの行は持たない。
- **デフォルトは、設定を忘れた環境が踏んで困らない側に置く** —— 止めない・インデックスさせない・読み込まない・
  同一 origin だけ・固定しない・IdP へ向かう。逆側をデフォルトにすると、変数を注入し忘れた環境が全ルート
  停止で立ち上がる、preview が検索結果に並ぶ、外したはずの第三者への依存が開く。デフォルトが「何かを
  する」側にあってよいのは、その値が環境によらず正しいとき（レンダリング span の範囲）だけで、その根拠を
  validator の文書に書く（[docs/rules.ja.md](../../docs/rules.ja.md#config) の「根拠を言えない
  設定値を置かない」という規則）。
- **省略を許すかの基準は「デフォルトが環境によらず正しいか」。** 正しいなら必須にしない —— 全環境へ
  必須にすると、実環境の設定に「開発用ではない」と書くだけの行が増える。環境ごとに変わる値は
  必須にし、欠落を起動 / ビルドの失敗にする。
- **綴りを検証するのは、誤った値が別の効果を伴って出ていくとき。** コンテナ ID の形を見るのは、値が
  違えばタグは読めないのに配信ヘッダの許可だけが開いたままになるからで、形の検証はその副作用を
  止めるために置く。
- **同梱の秘密値は schema がその綴りを知り、`local` / `ci` 以外では拒否する。** 設定し忘れは「値が
  無い」ではなく「既知の値が入っている」形で現れるので、長さの検証では通り抜ける。判定は起動時に
  置き、cookie を 1 枚でも発行する前に止める。許すかどうかは `environment.ts` が `APP_ENV` から
  決めて引数で渡す。
- **同じ事実を 2 つの変数で持たない。** https で配信されているかは IdP の callback URL（自分の
  origin）から導き、cookie の `secure` と HSTS / `upgrade-insecure-requests` が同じ 1 つの判定を読む
  （[0030](../../docs/adr/0030-environment-variable-management.ja.md)）。
- **検証の失敗は 1 つの Error にまとめ、欠けた / 不正な変数名を列挙する。** 読み手のテストは変数名で
  失敗を突き合わせる。

## 実行機序と評価タイミング

Config の評価はリクエストごとに行いません。ENV を一度だけ読み込み、検証済みの値から目的別の
singleton を作り、以後は import で配線します。

```text
build / Next.js 初期化
  next.config.ts
    ├─ loadEnvironment()
    │    └─ APP_ENV (指定必須) から env/.env.<環境> を選択
    ├─ validateEnvironment()
    │    └─ getEnvironment() で全 ENV を一度だけ検証
    └─ getEnvironment() の検証済みの値と schema の純関数を読み、
       配信ヘッダ / 画像の許可 host / 本体上限 / 開発専用 route の採否を組み立てる

Node.js サーバーインスタンスの起動
  Next.js → src/instrumentation.ts の register()
    └─ config/bootstrap.server.ts の bootstrapConfig()
         ├─ loadEnvironment()
         └─ validate-environment.server.ts を import
              └─ 全 purpose の get*Config() を呼び singleton を初期化
    └─ API config から接続モードを読み、mock なら interception を立てる（検証より後）
    └─ observability Config から signal 構成を読み、OTel SDK と logger を初期化

リクエスト処理
  adapters/server → 目的別 Config singleton を import
  （ENV 読込・schema parse は再実行しない）
```

| 時点 | 実行するもの | 評価内容 | 回数 |
| --- | --- | --- | --- |
| Next.js の設定評価 | `next.config.ts` | 選択済み env ファイルの読込と全 ENV の形式検証、検証済みの値からの build 設定の組み立て | build / dev 起動ごと |
| Node.js サーバー起動 | `src/instrumentation.ts` → `bootstrap.server.ts` | server Config singleton の生成 | 新しいサーバーインスタンスごと |
| Config singleton の生成 | `getApiConfig()` など | `getEnvironment()` の共有済み評価結果を private field へコピーする | getter の初回呼出し時、プロセスごとに一度 |
| 通常のリクエスト | `adapters/server` | singleton の getter を読む | リクエストごと。ただし parse なし |
| unit test | `vi.stubEnv()` と `vi.resetModules()` | env スタブを設定して Config module を再評価する | テスト呼出しごと |

`loadEnvironment()` は `override: false` で読み込むため、CI / PaaS がすでに注入した変数を
上書きしません。`env/.env.dev`・`.env.stg`・`.env.prd` が値を持つのはデプロイによらず同じ値と
その環境の方針値だけで、接続先と秘密値は名前だけを置き、実値は PaaS の環境設定または secret
store から供給します（行の形は [`env/README.md`](../../env/README.md) の「ファイルの書き方」）。

`APP_ENV` の未指定は `null` で返し、デフォルトへ落としません。ファイルの選択、同梱の秘密値の許可、
開発専用のエンドポイントの開閉がすべてこの選択子を見るため、デフォルトを持つと「未設定」を安全側へ倒せなく
なります（[0030](../../docs/adr/0030-environment-variable-management.ja.md)）。開発専用のエンドポイントを
開けてよい環境の一覧は `application-environment.ts` の 1 か所にだけ置き、build（開発専用 route をバンドルに
含めるか）と実行時（エンドポイントを開けるか）が同じ判定を読みます —— 一覧が 2 か所にあると、片方だけを
広げた変更が黙って通ります。

`src/instrumentation.ts` は Next.js の規約ファイルであり、`register()` はサーバーインスタンスの
準備時に Next.js が自動実行します。Edge runtime では Node.js のファイル読込を行えないため、
Node.js runtime だけが `bootstrapConfig()` を呼びます。bootstrap 後は observability Config を読んで
OTel SDK と logger へ値を注入します。Config 自身は logger / observability を import しません。

**一度だけ評価する、は運用のつまみにも及びます。** 配信を止める / 戻すはどちらもデプロイ先の環境設定を
変えて立ち上げ直す操作で、実行中のプロセスへ効かせるエンドポイントはありません。再デプロイなしで変えたい値は
env に置きません（[0030](../../docs/adr/0030-environment-variable-management.ja.md) 周辺ルール）。

**プリレンダーへ焼き込まれる値は build と start に同じ ENV を渡します。** 静的にレンダリングされる画面の
metadata と `robots.txt` は build 時に読まれるため、配信物は環境ごとに build する前提です
（[env/README.md](../../env/README.md)）。

## Config の配線

- `next.config.ts` は build 境界として `loadEnvironment()` と `validateEnvironment()` を直接呼ぶ。
  そのうえで読むのは `getEnvironment()` の検証済みの値と schema の純関数であって、`*.server.ts` の
  singleton ではない —— `server-only` を持つ module は react-server 条件の外で評価されると throw する
  ため、build 境界からは import できない。
- 配信物を作る script（`pnpm build`）も、`process.env` を読む前に `loadEnvironment()` を呼ぶ。
- `src/instrumentation.ts` は起動境界として `bootstrapConfig()` だけを呼ぶ。**接続モードで分岐する
  処理（mock の interception）は `bootstrapConfig()` の後に置く** —— 検証より前に置くと、未検証の値で
  本番の接続先を差し替えうる。
- `bootstrap.server.ts` は `validate-environment.server.ts` を import し、全 server Config getter を一度呼ぶ。
- `adapters/server` と `proxy.ts` は必要な目的の `get*Config()` だけを import し、feature / model / component は Config を import しない。`app` が直に読む server config は、**Next.js の規約が route segment に置くことを要求する値だけ**である（下記「運用」）。
- 内側のロジックへ設定値が必要な場合は、adapter が getter から取り出した値を引数で渡す。
- Config class と ENV parser は module 外へ export しない。通常コードが任意の ENV から Config を再生成する経路を持たせない。
- unit test は `vi.stubEnv()` と `vi.resetModules()` で module cache を再評価し、公開 singleton を検証する。

## 運用

- `process.env` の直読はこのカーネルだけに置く（`src/` では biome `noProcessEnv` の override がこのカーネルと `src/instrumentation.ts` だけを外す）。
- server config は `import "server-only"` で保護する。読み手は `adapters/server`・起動 / ビルド境界・エントリポイントの `proxy.ts` が主で、**`app` は Next.js の規約が route segment に置くことを要求する値だけ**を直に読む（root layout と metadata が読む `config/site`、画面が「いま」として読む `config/clock`）。**本番のバンドルに載らない開発専用画面**（`dev/**` の `page.dev.tsx`）が `config/api` / `config/auth` を直読する形も実在する（[0025](../../docs/adr/0025-app-layer-elements.ja.md) の element 表が記録している）。**読み手の正はここではなく [0021](../../docs/adr/0021-frontend-responsibility.ja.md) のレイヤー定義マッピングと [0025](../../docs/adr/0025-app-layer-elements.ja.md) の禁止事項**で、ここが述べるのはその形だけである —— 読み手を増やす判断はそちらを先に動かす。`adapters` を経由させると、値の置き場が規約で決まっているのに取得エンドポイントだけを増やすことになる。
- client config は `NEXT_PUBLIC_` 変数を文字列リテラルで名指す参照だけを持つ `*.client.ts` に置く。ここで検証はしない（ブラウザは検証の実行点ではない）。server config の値を props として client へ渡さない。client config は runtime object ではなく公開定数なので import 境界の制限を受けず、client 側のレイヤーも `app` も読める（[0030](../../docs/adr/0030-environment-variable-management.ja.md)）。
- 環境変数の一覧・テンプレート・secret 管理ラベルは [env/README.md](../../env/README.md) を正とする。
- proxy から辿れる config は ENV ファイルを読まない。辿れる範囲は `environment.ts` → `application-environment.ts` で止まり、`dotenv` / `node:path` を使う `load-environment.ts` へは届かない。ENV ファイルは起動 / ビルド境界が先に読み込んでいる（[0043](../../docs/adr/0043-middleware-policy.ja.md) の Edge 互換。`scripts/proxy-edge.gate.test.ts` が辿れるグラフを見る）。

## 配信ヘッダの組み立て

`security-headers/security-headers.ts` はヘッダの**内容**の根拠を持ちません（[0111](../../docs/adr/0111-csp-security-headers.ja.md)）。
ここが持つのは組み立ての形です。

- **入力は検証済みの ENV の生値と配信の条件**（https か / 開発サーバーか）で、`next.config.ts` が
  `getEnvironment()` から渡す。ENV 由来の origin をここへ直接書くと、環境変数と設定の 2 か所が
  別々に動く。
- **値の意味づけは 1 か所で行う。** 「空は読み込まない」を呼び出し側で真偽値へ潰さず、コンテナ ID を
  文字列のまま受けて組み立て側が判定する。同じ意味づけが渡す側と受ける側の 2 か所に現れない。
- **URL として受けた値は `new URL(value).origin` に落としてから載せる。** パスやポートの有無で
  載る形が変わらない。
- **条件で変わる部分だけに理由を持つ**: `'unsafe-eval'` は開発サーバーだけ（React が server 側の
  エラースタックを組み直すのに使う）、HSTS と `upgrade-insecure-requests` は https で配信して
  いるときだけ（http の開発環境で出すと副資源まで書き換えられて取得できない）、第三者の配信元は
  コンテナ ID を宣言したデプロイだけ（読み込まないもののために攻撃面だけが残る）。
- **リクエストに依らないヘッダは `next.config.ts` の `headers()` に置く。** `src/proxy.ts` で足すと
  proxy が処理する経路にしか載らず、静的に配れる応答が漏れる。リクエストに依るヘッダは `src/proxy.ts` が持つ。
- **配信構成の判断は含めない。** HSTS の `includeSubDomains` / `preload` は配信構成が決めるので付けず、
  期間だけを preload list の下限に揃える。
- **許可の一覧はワイルドカードだけを挙げる。** ワイルドカードが含む代表的なホストを別に並べても
  増えるのは行数だけである。

## boilerplate 導入時の変更点

環境変数から来る値はこのカーネルが検証するだけで、**値そのものは
[`env/README.md`](../../env/README.md#boilerplate-導入時の変更点) が持ちます。** ここに書くのは、
環境変数を通らずにコードへ焼いてあるデフォルトです。

| 何を | デフォルト | 変更する箇所 |
| --- | --- | --- |
| 配信ヘッダが許す第三者 origin | タグマネージャを読み込むデプロイ向けに、Google の配信元と計測の送り先を `script-src` / `connect-src` / `img-src` へ載せる分岐を持つ | `security-headers/security-headers.ts`。別のタグマネージャへ替えるなら、この origin と読み込み箇所（`src/app/analytics.tsx`）の両方を動かす |
| `script-src` 以下のデフォルト | 上記以外の第三者 origin を許さない。リクエストに依らないヘッダは配信側が付ける | 同上。足すときは [0111](../../docs/adr/0111-csp-security-headers.ja.md) の判断に従う |

`security-headers` は build 境界の持ち物で、`next.config.ts` が読みます。目的別 config と違って
リクエストにも環境変数にも依らないため、差し替えはコードの変更になります。

## テスト

- **検証を通る一式は `environment.fixture.ts` だけが持つ。** schema は全 purpose をまとめて検証する
  ので、purpose を 1 つ確かめるテストも一式を要る。各テストが自分のぶんだけを stub すると、他の
  purpose の欠落で落ちて検査したい判定へ到達しない。`VALID_ENVIRONMENT` は受理される形を敢えて
  散らした生の値、`PARSED_ENVIRONMENT` は観測が信号を出さないよう exporter を落とした検証後の値で、
  **後者は前者を parse した結果ではない**。`getEnvironment` を差し替える境界のテストは後者を読む。
- **`*.server.test.ts` の形**: `beforeEach` で `vi.resetModules()` → `vi.unstubAllEnvs()` →
  `stubValidEnvironment()`、`afterEach` で `vi.unstubAllEnvs()`。対象は stub のあとに
  `await import()` で読む。1 つの変数を変えるケースは `vi.stubEnv()` を上書きし、欠落は
  `vi.stubEnv(name, undefined)` で表す。失敗は変数名で突き合わせる（`toThrow("VAR_NAME")`）。
  singleton であることは同一性（`toBe`）で確かめる。
- **`*.schema.test.ts` の形**: validator を直接呼び、`safeParse().success` か `parse()` の結果で
  受理 / 拒否を確かめる。ENV も module cache も触らない。
- **実行環境の `APP_ENV` を前提にしない。** CI は workflow で `ci` を宣言しているため、「未指定の
  とき」を確かめるケースは `vi.stubEnv("APP_ENV", undefined)` で明示的に外す。
- **ファイル読込は `vi.doMock("dotenv")` で差し替える。** 読み込む path・`override: false`・
  一度きりであることを、呼出しの引数と回数で固定する。
- 時計を読むケースは `vi.useFakeTimers()` + `vi.setSystemTime()` で実時計を固定し、`afterEach` で
  `vi.useRealTimers()` に戻す。

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: ui` — 画面をレンダリングしない | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md)（各カーネルの責務）。機械: `project-rules/no-markup-outside-ui-layers` |
| `forbidden: fetch` — `fetch` などの外部 IO を持たない。持つのは環境変数の検証と、検証した値の公開だけ | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md)（各カーネルの責務） |
| `forbidden: business-logic` — 業務ロジックを持たない。値の意味の判定は読み手の側に置く | violation。検証の規則か業務の判定かが読み分けられないときは suggestion | [0021](../../docs/adr/0021-frontend-responsibility.ja.md)（各カーネルの責務） |
| `*.server.ts` を import するのは、`adapters/server`、起動 / ビルド境界（`src/instrumentation.ts` / `next.config.ts` / `src/proxy.ts`）、`app/metadata`、Next.js の規約が route segment に置くことを要求する値（`config/site` / `config/clock`）を読む route segment だけ。本番のバンドルに載らない `page.dev.tsx` の直読は 0025 が記録する既知の形で、対象外 | 許可の外からの import は violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) 依存マトリクスと Enforcement / [0025](../../docs/adr/0025-app-layer-elements.ja.md) 禁止事項 / この README「運用」。機械は `config` をレイヤーの粒度でしか見ない |
| `*.client.ts` が持つのは `NEXT_PUBLIC_` 変数を文字列リテラルで名指す参照だけ —— 動的アクセス（文字列リテラル以外の添字）・分割代入・`NEXT_PUBLIC_` 以外の変数・検証の呼び出しを持たない | violation | [0030](../../docs/adr/0030-environment-variable-management.ja.md) の client config の置き方と禁止事項 / [docs/rules.ja.md](../../docs/rules.ja.md#config) |
| `*.schema.ts` は `process.env` も `APP_ENV` の判定も読まない。環境に依る条件は validator の引数で受け、渡すのは `environment.ts` である | violation | この README「目的別 module の形」 |
| secret を `NEXT_PUBLIC_` に置かない | [`env/README.md`](../../env/README.md) で secret 管理のラベルを持つ変数が `NEXT_PUBLIC_` を名乗っていれば violation。ラベルは無いが署名鍵・資格情報として使われている値が `NEXT_PUBLIC_` を名乗っていれば suggestion | [0030](../../docs/adr/0030-environment-variable-management.ja.md) 禁止事項 / [docs/rules.ja.md](../../docs/rules.ja.md#config) |
| server config の値を props として client component へ渡さない。client が要る値は最初から `NEXT_PUBLIC_` の client config に置く | violation | [0030](../../docs/adr/0030-environment-variable-management.ja.md) の禁止則 / この README「運用」 |
| Config class と ENV parser を module の外へ export しない | violation | [docs/rules.ja.md](../../docs/rules.ja.md#config) / この README「Config の配線」 |
| 省略できる変数のデフォルトが、設定を忘れた環境が踏んで困る側（止める・インデックスさせる・第三者を読み込む・別 origin を許す）にある | デフォルトが環境によらず正しい根拠を validator の文書が持たなければ suggestion | この README「検証の語彙」/ [0030](../../docs/adr/0030-environment-variable-management.ja.md)（任意の変数の扱い） / [docs/rules.ja.md](../../docs/rules.ja.md#config) |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.ja.md) — 設定を読めるのがどのレイヤーまでかという線
- [0028](../../docs/adr/0028-naming-convention.ja.md) — 環境変数の命名（`{SUBSYSTEM}_{NAME}` / `NEXT_PUBLIC_`）。purpose の単位はこの接頭辞
- [0030](../../docs/adr/0030-environment-variable-management.ja.md) — `env/` の構成、目的別 config、`NEXT_PUBLIC_` の境界、secret の扱い、code default の位置付け、`APP_ENV` の必須化
- [0075](../../docs/adr/0075-file-upload-seam.ja.md) — アップロードの経路と、中継に許すバイト数をどこより内側に取るか
- [0076](../../docs/adr/0076-payment-ui-seam.ja.md) — 決済 UI の seam。`payment` をデフォルトで閉じる根拠
- [0079](../../docs/adr/0079-auth-frontend-seam.ja.md) — 認証モードと session の front 側の持ち分
- [0111](../../docs/adr/0111-csp-security-headers.ja.md) — CSP と同伴ヘッダの内容、リクエストに依らないヘッダを配信側へ置く判断、別 origin から BFF を呼ばせる条件、タグマネージャを読み込むデプロイで `Cross-Origin-Embedder-Policy` を降ろす判断
- [0131](../../docs/adr/0131-cookie-consent.ja.md) — 同意管理を採らない決定と、タグマネージャをデフォルトで読み込まない指定
