---
imports-allowed: []
forbidden: [business-logic, direct-config-access]
test-requirement: unit
---

# observability

OTel を用いた server-side の trace、metrics、logs のためのカーネルです。設定値は import せず、起動側から注入されます。

## 受け入れるもの

- OTel SDK の初期化、trace、signal 別の有効化

## 受け入れないもの

- 業務ロジック、config の直接参照、特定 RUM SaaS への固定

## 構成

- `initialize.server.ts` は Node.js runtime の `NodeSDK` をプロセスごとに一度だけ初期化する。resource には公式 semantic convention の `service.name` を設定し、W3C Trace Context と W3C Baggage を伝播する。HTTP instrumentation は受信 HTTP request の trace を作り、Undici instrumentation は許可された API origin への server-side `fetch` へ trace context を注入する。伝播が働くのは signal のいずれかが有効で SDK が構築されたときだけである。Undici の外向き span からは `url.query` を落とし、`url.full` も query の無い形にする。
- `trace-context.ts` は現在の有効な span から trace ID と span ID を抽出する。logging にはこの関数を起動境界で注入する。
- `otlp-log-sink.server.ts` は logging が渡す正規化済みレコードを OTel Logs API へ変換する。OTLP 属性へ変換できない値は送出しない。

## signal の有効化

`OTEL_EXPORTER_OTLP_ENDPOINT` は OTLP HTTP の base endpoint を、`OBS_TRACES_EXPORTER`、`OBS_METRICS_EXPORTER`、`OBS_LOGS_EXPORTER` は signal ごとの有効化を表す。各値は `otlp`、`none`、または空文字列であり、`otlp` だけが有効である。base endpoint には各 signal の `/v1/traces`、`/v1/metrics`、`/v1/logs` を自動付与する。無効な signal は exporter、batch processor、metric reader を生成しない。変数の一覧と環境別の供給方法は [env/README.md](../../env/README.md) を参照する。

## 実行機序

Next.js は Node.js サーバーを準備すると `src/instrumentation.ts` の `register()` を自動実行する。そこで Config を bootstrap し、signal 構成を `initializeObservability()` へ注入する。続いて `OBS_LOGS_EXPORTER=otlp` の場合だけ OTLP Logs sink を logging に注入する。Edge runtime と browser ではこの SDK を初期化しない。browser telemetry は P6-1 で BFF 中継 seam として扱う。

## 運用

- OTLP と公式 semconv のみを使用する
- 実装時に設定値を注入し、vendor 固定を避ける
- local 開発では go 側 compose の `observability` が公開する OTLP HTTP `http://localhost:4318` と Grafana `http://localhost:3000` を使う
- fork 先のバックエンドや collector に合わせて endpoint、`service.name`(`OBS_SERVICE_NAME`)、signal 有効化を設定する。`service.name` は同じ trace に載る他サービスと異なる値にする。Grafana、Sentry、Faro などの SDK をこのカーネルへ直接固定しない
- Next.js が自前で張る `fetch` span は、span 名に query 付きの URL をそのまま載せる。このカーネルの redaction は及ばないため、query に利用者の入力を乗せる口を持つなら `NEXT_OTEL_FETCH_DISABLED=1` で抑止する。同じ外向き通信は Undici instrumentation の span が redaction 済みで覆う
