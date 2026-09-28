/**
 * 伏せる項目の名前。
 *
 * @remarks
 * **名前で伏せます。値の形は見ません。** 値から秘密を見分けようとすると、見分けられなかったものが
 * 素通りし、見分けられたつもりのものが偽の安心になります。名前は自分たちが付けるものなので、
 * ここに挙げた名前で持ち回る限り確実に効きます。
 *
 * ログと span の双方がこの表を見ます。増やすときは、名前を持ち回っている側も併せて直します。
 */
export const REDACTED_FIELD_NAMES: readonly string[] = [
  "authorization",
  "cookie",
  "password",
  "token",
];

/** 伏せた値の代わりに置く文字列。 */
export const REDACTED = "[REDACTED]";

/**
 * 構造化ログのフィールド名の表。
 *
 * @remarks
 * 同じ意味の項目が呼び出し側ごとに別の名前で載ると、backend で 1 つの問いとして引けなくなります。
 * 表に無い名前も渡せますが、公式 semconv に名前がある項目はその名前を使います。
 */
export const LogFieldKey = {
  TRACE_ID: "trace_id",
  SPAN_ID: "span_id",
  REQUEST_ID: "request_id",
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  LATENCY_MS: "latency_ms",
  CAUSE: "cause",
} as const;

/**
 * 構造化ログへ付与する追加フィールドです。
 *
 * @remarks
 * `trace_id` / `span_id` は渡せません。logger が実行中の span から付けます。
 *
 * `cause` を文字列に限るのは、`Error` をそのまま置くと OTLP sink で `{}` になるためです。
 */
export type LogFields = Readonly<{
  [LogFieldKey.TRACE_ID]?: never;
  [LogFieldKey.SPAN_ID]?: never;
  [LogFieldKey.REQUEST_ID]?: string;
  [LogFieldKey.ERROR_CODE]?: string;
  [LogFieldKey.ERROR_MESSAGE]?: string;
  [LogFieldKey.LATENCY_MS]?: number;
  [LogFieldKey.CAUSE]?: string;
}> &
  Readonly<Record<string, unknown>>;

/** 出力先へ渡す、trace 相関を添えて伏せ終えたフィールドです。 */
type LogRecordFields = Readonly<Record<string, unknown>>;

/** アプリケーション logger が扱うログレベルの値型です。 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** アプリケーション logger が扱うログレベルです。 */
export const LogLevel: Readonly<Record<Uppercase<LogLevel>, LogLevel>> = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};

/** logger が出力先へ渡す、正規化済みのログレコードです。 */
type LogRecord = Readonly<{
  level: LogLevel;
  message: string;
  fields: LogRecordFields;
}>;

/** stdout 以外の出力先へログレコードを渡す注入境界です。 */
export type LogRecordSink = (record: LogRecord) => void;

/** アクティブな trace から抽出するログ相関情報です。 */
type TraceContext = Readonly<{
  traceId: string;
  spanId: string;
}>;

/** logging へ注入する trace 相関情報の抽出器です。 */
export type TraceContextExtractor = () => TraceContext | undefined;

/** アプリケーションが依存する構造化 logger の公開契約です。 */
export interface Logger {
  /**
   * debug レベルでログを書き出す。
   *
   * @param message - ログメッセージ
   * @param fields - 追加の構造化フィールド
   */
  debug(message: string, fields?: LogFields): void;
  /**
   * info レベルでログを書き出す。
   *
   * @param message - ログメッセージ
   * @param fields - 追加の構造化フィールド
   */
  info(message: string, fields?: LogFields): void;
  /**
   * warn レベルでログを書き出す。
   *
   * @param message - ログメッセージ
   * @param fields - 追加の構造化フィールド
   */
  warn(message: string, fields?: LogFields): void;
  /**
   * error レベルでログを書き出す。
   *
   * @param message - ログメッセージ
   * @param fields - 追加の構造化フィールド
   */
  error(message: string, fields?: LogFields): void;
}
