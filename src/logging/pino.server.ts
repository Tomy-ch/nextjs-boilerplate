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
 * trace 抽出器は起動境界で注入するため、logging は observability を import しない。
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

/** stdout と外部 sink の出力前に秘匿フィールドを置換する。 */
function redactFields(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      REDACTED_FIELD_NAMES.includes(key.toLowerCase()) ? REDACTED : value,
    ]),
  );
}
