import "server-only";

import pino, { type DestinationStream, type Logger as PinoLogger } from "pino";
import {
  type LogFields,
  type Logger,
  LogLevel,
  type LogRecordSink,
  REDACTED,
  REDACTED_FIELD_NAMES,
  type TraceContextExtractor,
} from "./logger";

/** Pino 実装へ起動境界から注入する構成です。 */
type CreateLoggerOptions = Readonly<{
  level: LogLevel;
  traceContextExtractor?: TraceContextExtractor;
  logRecordSink?: LogRecordSink;
  destination?: DestinationStream;
}>;

class PinoStructuredLogger implements Logger {
  readonly #logger: PinoLogger;
  readonly #traceContextExtractor: TraceContextExtractor | undefined;
  readonly #logRecordSink: LogRecordSink | undefined;

  /**
   * 依存を注入して構築する。
   *
   * @param logger - Pino が生成した logger 実体
   * @param traceContextExtractor - trace 相関を抽出する注入
   * @param logRecordSink - 正規化済みレコードを渡す注入先
   */
  constructor(
    logger: PinoLogger,
    traceContextExtractor: TraceContextExtractor | undefined,
    logRecordSink: LogRecordSink | undefined,
  ) {
    this.#logger = logger;
    this.#traceContextExtractor = traceContextExtractor;
    this.#logRecordSink = logRecordSink;
  }

  debug(message: string, fields: LogFields = {}): void {
    this.write(LogLevel.DEBUG, message, fields);
  }

  info(message: string, fields: LogFields = {}): void {
    this.write(LogLevel.INFO, message, fields);
  }

  warn(message: string, fields: LogFields = {}): void {
    this.write(LogLevel.WARN, message, fields);
  }

  error(message: string, fields: LogFields = {}): void {
    this.write(LogLevel.ERROR, message, fields);
  }

  /**
   * レベル別 API から渡された内容を正規化し、trace 相関を添えて出力する。
   *
   * @param level - ログレベル
   * @param message - ログメッセージ
   * @param fields - 追加の構造化フィールド
   */
  private write(level: LogLevel, message: string, fields: LogFields): void {
    const traceContext = this.#traceContextExtractor?.();
    const normalizedFields = redactFields({
      ...fields,
      ...(traceContext === undefined
        ? {}
        : { trace_id: traceContext.traceId, span_id: traceContext.spanId }),
    });
    this.#logRecordSink?.({ level, message, fields: normalizedFields });
    this.#logger[level](normalizedFields, message);
  }
}

/**
 * Pino を詳細から隠した構造化 logger を生成する。
 *
 * @remarks
 * trace 抽出器は起動境界で注入するため、logging は observability を import しない。
 *
 * @returns 生成した {@link Logger}
 */
export function createLogger({
  level,
  traceContextExtractor,
  logRecordSink,
  destination,
}: CreateLoggerOptions): Logger {
  return new PinoStructuredLogger(
    pino(
      {
        level,
        base: undefined,
        redact: { paths: [...REDACTED_FIELD_NAMES], censor: REDACTED },
      },
      destination,
    ),
    traceContextExtractor,
    logRecordSink,
  );
}

/**
 * stdout と外部 sink の出力前に秘匿フィールドを置換する。
 *
 * @param fields - 置換前のフィールド
 * @returns 秘匿フィールドを置換したフィールド
 */
function redactFields(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      REDACTED_FIELD_NAMES.includes(key.toLowerCase()) ? REDACTED : value,
    ]),
  );
}
