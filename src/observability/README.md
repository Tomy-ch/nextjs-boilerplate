---
imports-allowed: []
forbidden: [business-logic, direct-config-access]
test-requirement: unit
---

# observability

OTel を用いた server-side の trace、metrics、logs のためのカーネルです。設定値は import せず、起動側から注入されます。

## 受け入れるもの

- OTel SDK の初期化、trace、signal 別の有効化
- 描画を span へ載せる口（`features` から呼ぶ唯一の公開面）

## 受け入れないもの

- 業務ロジック、config の直接参照、特定 RUM SaaS への固定

## 構成

- `initialize.server.ts` は Node.js runtime の `NodeSDK` をプロセスごとに一度だけ初期化する。resource には公式 semantic convention の `service.name` を設定し、W3C Trace Context と W3C Baggage を伝播する。HTTP instrumentation は受信 HTTP request の trace を作り、Undici instrumentation は許可された API origin への server-side `fetch` へ trace context を注入する。伝播が働くのは signal のいずれかが有効で SDK が構築されたときだけである。Undici の外向き span からは `url.query` を落とし、`url.full` も query の無い形にする。
- `trace-context.ts` は現在の有効な span から trace ID と span ID を抽出する。logging にはこの関数を起動境界で注入する。
- `render-span.ts` は描画を span にする。載せる範囲は起動境界から注入で受ける。対象と読み方は下記「描画の計装」が持つ。
- `otlp-log-sink.server.ts` は logging が渡す正規化済みレコードを OTel Logs API へ変換する。OTLP 属性へ変換できない値は送出しない。

## 描画の計装

`withScreenSpan(name, render)` と `withPartSpan(name, render)` は、渡されたコンポーネントを span で包んだ同じ形のコンポーネントを返す。span 名は `render <name>` で、`name` には `src/` からのモジュールパスを渡す。tracer の scope 名は `render` である。**span 名に利用者の入力を混ぜてはならない**（span 名の redaction は [0081](../../docs/adr/0081-observability-logging.md)）。

2 つは載せる対象が違う。`withScreenSpan` は**画面の最上位**（`features/<name>/<screen>/` の `page-content` と `view`）、`withPartSpan` は **feature が持つ部品**（`ui/`）である。装備の手順と対象の線引きは [features/README.md](../features/README.md) が持つ。`components` は横断 UI であり画面ごとの帰属を持たないので対象にせず、route segment は Next.js が `render route (app)` を張るので二重に持たない。

### 載せる範囲

範囲は `configureRenderSpans({ screens, parts })` で**起動境界から注入する**。既定はどちらも無効で、注入を受けない実行（テスト・Storybook）では span を作らない。

**SDK の有無を無効化の代わりに使えない。** `OBS_TRACES_EXPORTER=none` にしても、logs か metrics が有効なら `NodeSDK` は tracer provider を立てるため、span は記録されたうえで捨てられる —— 成果物だけがゼロになり、計装のコストは残る。だから範囲を独立した軸として持つ。

供給は `OBS_RENDER_SPANS`（`none` / `screen` / `part`、既定 `screen`）で、`tracesEnabled` との合成は起動境界が行う。`part` を開けると 1 描画の span が描く部品の数だけ増えるので、常用ではなく調査のときに開ける。

### span が覆う範囲

覆うのは**そのコンポーネント自身の実行だけ**である。子は戻り値を React が受け取った後に描画されるため、子の span はこの span の中に入らず、同じ親（`render route (app)`）の下に兄弟として並ぶ。したがって **span の時間は部分木の合計ではない**。画面ぜんぶの所要は `render route (app)` が持ち、最上位の span が答えるのは「そこまで到達したか」と「自分の本体で何を待ったか」である。

入れ子にするには、子を要素として返す代わりに関数として呼ぶしかない。その部分木は Suspense 境界・streaming の単位・reconciliation を失う。**描画モデルを捨てる対価に見合わないので入れ子にしない。** React の context で親の実行文脈を配る方法は Server Component が context を持たないため採れず、`AsyncLocalStorage` も子がレンダラのタスクから呼ばれるため届かない。

### 何が中に入るか

**本体で待つ取得は中に入る。** 外向きの `fetch` がどの画面のどの合成から出たのかは、この入れ子で辿れる。取得を `layout` や app shell が持つ場合、その通信は最上位の span の外に出る —— 呼んでいるのが feature ではないためである。

### 失敗

描画が投げると span を `ERROR` にし、`Error` であれば例外として記録して投げ直す。**Next.js が制御に使う throw（`notFound` / `redirect` など）は失敗として扱わない。** 判定は `unstable_rethrow` に委ね、framework の内部表現を読み取らない。

### 記録しない実行

範囲が無効な呼び出しでは span を作らず、包んだコンポーネントをそのまま呼ぶ。ブラウザでの描画も同じで、注入を受けないため何も作らない。

## signal の有効化

`OTEL_EXPORTER_OTLP_ENDPOINT` は OTLP HTTP の base endpoint を、`OBS_TRACES_EXPORTER`、`OBS_METRICS_EXPORTER`、`OBS_LOGS_EXPORTER` は signal ごとの有効化を表す。各値は `otlp`、`none`、または空文字列であり、`otlp` だけが有効である。base endpoint には各 signal の `/v1/traces`、`/v1/metrics`、`/v1/logs` を自動付与する。無効な signal は exporter、batch processor、metric reader を生成しない。描画の範囲を決める `OBS_RENDER_SPANS` は signal ではないので、この gate とは別に効く（trace 自体が無効なら描画 span も出ない）。変数の一覧と環境別の供給方法は [env/README.md](../../env/README.md) を参照する。

## 実行機序

Next.js は Node.js サーバーを準備すると `src/instrumentation.ts` の `register()` を自動実行する。そこで Config を bootstrap し、signal 構成を `initializeObservability()` へ注入する。続いて `OBS_LOGS_EXPORTER=otlp` の場合だけ OTLP Logs sink を logging に注入する。Edge runtime と browser ではこの SDK を初期化しない。browser telemetry は P6-1 で BFF 中継 seam として扱う。

## 運用

- OTLP と公式 semconv のみを使用する
- 実装時に設定値を注入し、vendor 固定を避ける
- local 開発では go 側 compose の `observability` が公開する OTLP HTTP `http://localhost:4318` と Grafana `http://localhost:3000` を使う
- fork 先のバックエンドや collector に合わせて endpoint、`service.name`(`OBS_SERVICE_NAME`)、signal 有効化を設定する。`service.name` は同じ trace に載る他サービスと異なる値にする。Grafana、Sentry、Faro などの SDK をこのカーネルへ直接固定しない
- Next.js が自前で張る `fetch` span は、span 名に query 付きの URL をそのまま載せる。このカーネルの redaction は及ばないため、query に利用者の入力を乗せる口を持つなら `NEXT_OTEL_FETCH_DISABLED=1` で抑止する。同じ外向き通信は Undici instrumentation の span が redaction 済みで覆う
