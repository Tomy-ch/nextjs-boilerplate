import { isSpanContextValid, trace } from "@opentelemetry/api";

/** OTel から抽出した trace 相関情報です。 */
export type ActiveTraceContext = Readonly<{
  traceId: string;
  spanId: string;
}>;

/** 現在アクティブな span から、ログ相関に使う識別子を抽出する。 */
export function extractActiveTraceContext(): ActiveTraceContext | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();

  if (spanContext === undefined || !isSpanContextValid(spanContext)) {
    return undefined;
  }

  return { traceId: spanContext.traceId, spanId: spanContext.spanId };
}
