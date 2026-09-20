import "server-only";

import { type AnyValue, type AnyValueMap, logs, SeverityNumber } from "@opentelemetry/api-logs";

type OtlpLogSink = (
  record: Readonly<{
    level: keyof typeof severityNumbers;
    message: string;
    fields: Readonly<Record<string, unknown>>;
  }>,
) => void;

const severityNumbers = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
} satisfies Readonly<Record<string, SeverityNumber>>;

/**
 * OTel Logs API に構造化ログを渡す注入用 sink を生成する。
 *
 * @param serviceName - OTel の logger 名として使う service 名
 * @returns 生成した sink
 */
export function createOtlpLogSink(serviceName: string): OtlpLogSink {
  const logger = logs.getLogger(serviceName);

  return ({ level, message, fields }) => {
    logger.emit({
      severityNumber: severityNumbers[level],
      severityText: level,
      body: message,
      attributes: toOtlpAttributes(fields),
    });
  };
}

/**
 * ログフィールドを OTel が受け入れる属性だけの map に変換する。
 *
 * @param fields - 変換対象のログフィールド
 * @returns OTel が受け入れる属性の map
 */
function toOtlpAttributes(fields: Readonly<Record<string, unknown>>): AnyValueMap {
  const attributes: AnyValueMap = {};

  for (const [key, value] of Object.entries(fields)) {
    const attribute = toOtlpValue(value);
    if (attribute !== undefined) {
      attributes[key] = attribute;
    }
  }

  return attributes;
}

/**
 * 任意の値を OTLP 属性に安全に載せられる値へ再帰的に正規化する。
 *
 * @param value - 正規化対象の値
 * @returns 正規化した値。載せられない値は `undefined`
 */
function toOtlpValue(value: unknown): AnyValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (Array.isArray(value)) {
    const values = value.map(toOtlpValue);
    return values.every((item) => item !== undefined) ? values : undefined;
  }

  if (isRecord(value)) {
    return toOtlpAttributes(value);
  }

  return undefined;
}

/**
 * unknown から得た object がログフィールドとして列挙可能かを判定する。
 *
 * @param value - 判定対象の値
 * @returns 列挙可能な object であれば `true`
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
  );
}
