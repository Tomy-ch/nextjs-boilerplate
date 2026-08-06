/** 構造化ログへ付与する追加フィールドです。 */
export type LogFields = Readonly<Record<string, unknown>>;

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
export type LogRecord = Readonly<{
  level: LogLevel;
  message: string;
  fields: LogFields;
}>;

/** stdout 以外の出力先へログレコードを渡す注入境界です。 */
export type LogRecordSink = (record: LogRecord) => void;

/** アクティブな trace から抽出するログ相関情報です。 */
export type TraceContext = Readonly<{
  traceId: string;
  spanId: string;
}>;

/** logging へ注入する trace 相関情報の抽出器です。 */
export type TraceContextExtractor = () => TraceContext | undefined;

/** アプリケーションが依存する構造化 logger の公開契約です。 */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}
