> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# logging

構造化ログを提供するカーネルです。設定値と observability は import せず、起動境界から注入されます。この README はカーネルの窓口で、書く側の契約と、実装を消しても残す形を持つ。起動境界の結線順、ブラウザからサーバ、collector までの 1 本の線、registered symbol で注入を渡す機序は [観測](../../docs/design/observability.ja.md) が持つ。

## 受け入れるもの

- context に基づく logger、`trace_id` の付与、構造化ログ、redaction

## 受け入れないもの

- 業務ロジック、config の直接参照

## 構成

- `logger.ts` はアプリケーションが依存する `Logger`、追加フィールド、trace 抽出器、出力 sink の契約だけを定義する。**`server-only` を名乗らない** —— 契約と名前の表だけを持ち、Pino の型を出さないので、ブラウザ側のバンドルに入ってよい。
- `logger.ts` は伏せる項目の名前（`authorization` / `cookie` / `password` / `token`）も持つ。**ログと span の双方がこの 1 つの表を見る** —— [0081](../../docs/adr/0081-observability-logging.ja.md) が両方へ同じ redaction を求めており、表が 2 つに割れると片方だけが緩む。span 側で掛けるのは `adapters/server/telemetry` の中継である。
- `pino.server.ts` は Pino による JSON stdout 出力を実装する。上の表に当たるフィールドを、大文字小文字を区別せず `[REDACTED]` に置換する。Pino を知るのはこのファイルだけである。
- `logging.server.ts` は起動境界から注入された設定で、プロセス内 singleton を一度だけ初期化する。アプリケーションの server 側コードは `getLogger()` を使い、Pino を直接 import しない。記録の失敗を呼び出し元へ持ち出さない `reportQuietly()` もここが持つ（下記「書く側の形」）。

ログ呼出し時に注入済みの trace 抽出器が有効な span を返すと、`trace_id` と `span_id` を構造化フィールドへ自動付与する。**呼び出し側はこの 2 つを渡せない** —— `LogFields` が型で拒む。相関は実行文脈から取るもので、caller が明示的に渡すものではない（[0081](../../docs/adr/0081-observability-logging.ja.md) の ctx-native）。同じ正規化済みレコードは、必要なら注入済み sink にも渡す。OTLP Logs への送出はこの sink を observability 側が実装し、logging から observability への依存は作らない。

### フィールド名の表

構造化フィールドの名前は `logger.ts` の `LogFieldKey` が 1 か所で持つ（[0081](../../docs/adr/0081-observability-logging.ja.md) が求めるログキーの表）。同じ意味の項目が呼び出し側ごとに別の名前で載ると、backend で 1 つの問いとして引けなくなるためである。`LogFields` は表の名前に型を付ける。

- `trace_id` / `span_id` は渡せない。logger が実行中の span から付ける
- `cause` は文字列だけを受ける（理由は下記「書く側の形」）
- `latency_ms` は数値を受ける
- 例外の内容は OpenTelemetry semconv の名前（`exception.type` / `exception.message` / `exception.stacktrace`）で載せ、いずれも文字列を受ける。独自の名前（`error_message` 等）を立てない

表に無い名前も渡せる。ただし公式 semconv に名前がある項目はその名前を使う。

### レコードの形

1 行が持つのは、Pino が付ける `level` / `time` / `msg`、呼び出し側のフィールド、trace 相関（`trace_id` / `span_id`）である。Pino のデフォルトの `pid` / `hostname` は載せない（`base: undefined`）。sink が受け取るのは stdout と同じ正規化済みのレコード —— 伏せた後の `fields` に `level` と `message` を添えたもの —— で、sink が生の値を見る経路は無い。

### レベルの語は 3 か所で同じ

`LogLevel` の値（`debug` / `info` / `warn` / `error`）は、`Logger` の method 名であると同時に、Pino の method 名の引き先（`this.#logger[level]`）であり、OTLP sink が severity を引くキーでもある。レベルの集合は [0081](../../docs/adr/0081-observability-logging.ja.md) が 4 つと決めており、語を変えるなら 3 か所が同じ語で揃っていることが前提になる。

## 書く側の形

**記録の失敗で、記録の対象になった処理まで失敗させない。** `getLogger()` は起動境界を通っていない実行（テスト、`instrumentation.ts` を経ない script）では投げる。記録は後から辿るための手段であって利用者へ見せる結果ではないので、**成否が利用者へ見える処理（画面のレンダリング、Server Action、Route Handler、adapter の取得）の中の記録は `reportQuietly()` で包む**。

縮退して続ける取得はこの形になる。

```ts
try {
  return await read();
} catch (cause) {
  reportQuietly(() => getLogger().warn("<何>を読めませんでした", { cause: String(cause) }));

  return null;
}
```

- **失敗の原因は `cause` に文字列で載せる。** `Error` をそのまま置くと OTLP sink では `{}` になる（理由は [観測](../../docs/design/observability.ja.md#error-や-date-をそのままフィールドに載せると空になる)「`Error` や `Date` をそのままフィールドに載せると空になる」）。公式 semconv に名前がある項目（`exception.type` / `exception.message` / `exception.stacktrace` / `http.route`）はその名前を使う。
- **レベルは [0080](../../docs/adr/0080-error-handling.ja.md) の線で選び、同じ失敗は境界で 1 回だけ記録する。**
- **フィールドは平らに持つ。** 伏せるのは最上位のフィールド名だけで、ネストした object の中の名前は見ない。一方 sink はネストを再帰的に送る。秘密を持ち回る名前は最上位に置く。
- **`console.*` は使わない。** biome の `noConsole` が見る（[0002](../../docs/adr/0002-formatter-linter.ja.md)）。

## 実行機序

`src/instrumentation.ts` が Node.js サーバー起動時に `initializeLogger()` を呼ぶ。ここで stdout 用 Pino logger が必ず初期化され、レベルと trace 抽出器はここで注入され、`OBS_LOGS_EXPORTER=otlp` のときだけ OTLP sink も注入される。リクエストごとの再初期化は行わない。

注入した logger の置き場はモジュール変数ではなく、`Symbol.for` の registered symbol をキーにした `globalThis` である。読む側は別のモジュールインスタンスが書いた値として、`Logger` の形を確かめてから使う。同じファイルが 1 プロセスで 2 回インスタンス化される事情と、モジュール変数で足りる場合との線引きは [観測](../../docs/design/observability.ja.md#注入は-registered-symbol-で渡す)「注入は registered symbol で渡す」が持つ。

## 運用

- 出力先・レベル・有効化の設定は注入で受け取る
- ログに secret や個人情報を残さない
- **伏せる名前を増やすときは `logger.ts` の表へ足す。** Pino の `redact`、sink へ渡す前の正規化、span の中継は同じ表を読むので、他に直す場所は無い。表は名前で効くので、その名前で秘密を持ち回る側を揃えるまでが 1 組である。効き目は `pino.server.test.ts` が stdout と sink の双方で固定する
- **表の名前は小文字で書く。** 突き合わせは key を小文字化して行うので、大文字を含む項目は永遠に当たらない。Pino の `redact` は大文字小文字を区別するが、渡る前に正規化が済んでいる

## テスト

- singleton の置き場は realm の registered symbol なので、**`vi.resetModules()` では消えない**。ケースの前に `Reflect.deleteProperty(globalThis, Symbol.for("nextjs-boilerplate.logging.logger"))` で捨てる
- `createLogger()` の `destination` は出力を読むための注入口である。`PassThrough` を渡し、書き出された JSON を読んで固定する。stdout を捕まえない
- 利用側のテストは `@/logging/logging.server` を module ごと差し替える。`getLogger` は spy を返す関数に、`reportQuietly` は渡された関数をそのまま呼ぶ関数にし、**2 つとも供給する** —— 片方を落とすと import が `undefined` になり、記録の行で落ちる

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: business-logic` — 業務ロジックを持たない | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) のカーネル受入基準の 4 つ目 |
| `forbidden: direct-config-access` — `config` を import せず、`process.env` を読まない。設定は起動境界から注入で受ける | violation | [0081](../../docs/adr/0081-observability-logging.ja.md) の禁止事項。機械: ESLint boundaries と `architecture.ts` の `NODE_RUNTIME_ACCESS` |
| アプリケーションの server 側コードは `getLogger()` を使い、Pino を直に import しない | `pino.server.ts` の外で `pino` を import していれば violation | この README「構成」 |
| 伏せる項目の名前の表は `logger.ts` の 1 つだけで、ログと span の双方がそれを見る | 別の場所に伏せる名前の表を持っていれば violation | この README「構成」/ [0081](../../docs/adr/0081-observability-logging.ja.md) |
| 成否が利用者へ見える処理の中の記録は `reportQuietly()` で包む | suggestion（処理の成否が利用者へ見えるかは呼び出しの形から決まらない） | この README「書く側の形」/ [観測](../../docs/design/observability.ja.md#getlogger-は初期化前に投げる)「`getLogger()` は初期化前に投げる」 |
| 起動境界からの注入をモジュール変数に置かない | suggestion（代入元の経路は宣言の形から決まらない） | [0081](../../docs/adr/0081-observability-logging.ja.md) の禁止事項 |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.ja.md) — config を import せず起動境界から注入を受けるレイヤーの線
- [0080](../../docs/adr/0080-error-handling.ja.md) — エラーログのレベル（5xx = error / 4xx = warn）と、境界で 1 回だけ記録すること
- [0081](../../docs/adr/0081-observability-logging.ja.md) — 構造化ログ・redaction・OTLP へ寄せるベンダ中立の方針
