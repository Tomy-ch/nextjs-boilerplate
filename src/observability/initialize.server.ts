import "server-only";

import type { Attributes } from "@opentelemetry/api";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_URL_FULL,
  ATTR_URL_QUERY,
} from "@opentelemetry/semantic-conventions";

/** 起動境界が observability SDK へ注入する構成です。 */
type ObservabilityInitialization = Readonly<{
  otlpEndpoint: string;
  tracesEnabled: boolean;
  metricsEnabled: boolean;
  logsEnabled: boolean;
  serviceName: string;
  /** W3C trace context を外向きの `fetch` へ注入してよい接続先。path は無視して origin で照合する。 */
  tracePropagationOrigins: readonly string[];
}>;

export type OtelSignal = "traces" | "metrics" | "logs";

export const OtelSignal: Readonly<Record<Uppercase<OtelSignal>, OtelSignal>> = {
  TRACES: "traces",
  METRICS: "metrics",
  LOGS: "logs",
};

let sdk: NodeSDK | undefined;

/**
 * Node runtime 用の OTel trace SDK を一度だけ初期化する。
 *
 * signal ごとに無効なら exporter・batcher・reader を構築しない。
 */
export function initializeObservability({
  otlpEndpoint,
  tracesEnabled,
  metricsEnabled,
  logsEnabled,
  serviceName,
  tracePropagationOrigins,
}: ObservabilityInitialization): void {
  if ((!tracesEnabled && !metricsEnabled && !logsEnabled) || sdk !== undefined) {
    return;
  }

  const allowedOrigins = new Set(tracePropagationOrigins.map((origin) => new URL(origin).origin));

  sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    textMapPropagator: new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation({
        requireParentforSpans: true,
        // 許可 origin 以外へは伝播しない（伝播先の方針は [0081](../../docs/adr/0081-observability-logging.md)）。
        ignoreRequestHook: ({ origin }) => !allowedOrigins.has(new URL(origin).origin),
        startSpanHook: redactUrlQuery,
      }),
    ],
    ...(tracesEnabled
      ? {
          traceExporter: new OTLPTraceExporter({
            url: getSignalEndpoint(otlpEndpoint, OtelSignal.TRACES),
          }),
        }
      : {}),
    ...(metricsEnabled
      ? {
          metricReaders: [
            new PeriodicExportingMetricReader({
              exporter: new OTLPMetricExporter({
                url: getSignalEndpoint(otlpEndpoint, OtelSignal.METRICS),
              }),
            }),
          ],
        }
      : {}),
    ...(logsEnabled
      ? {
          logRecordProcessors: [
            new BatchLogRecordProcessor({
              exporter: new OTLPLogExporter({
                url: getSignalEndpoint(otlpEndpoint, OtelSignal.LOGS),
              }),
            }),
          ],
        }
      : {}),
  });
  sdk.start();
}

/**
 * 外向き HTTP span の URL 属性から query 文字列を落とす。
 *
 * @remarks
 * Undici instrumentation は既定で `url.full` と `url.query` を span 属性へ載せます。query を落とす
 * 方針は [0081](../../docs/adr/0081-observability-logging.md)。`url.path` はどの口を叩いたかを示す
 * だけなので残します。
 *
 * `undefined` を返した属性は span へ記録されません。
 */
export function redactUrlQuery({ origin, path }: { origin: string; path: string }): Attributes {
  const queryIndex = path.indexOf("?");

  return {
    [ATTR_URL_FULL]: `${origin}${queryIndex === -1 ? path : path.slice(0, queryIndex)}`,
    [ATTR_URL_QUERY]: undefined,
  };
}

/** OTLP HTTP の base endpoint から signal 固有の resource endpoint を組み立てる。 */
export function getSignalEndpoint(otlpEndpoint: string, signal: OtelSignal): string {
  return `${otlpEndpoint.endsWith("/") ? otlpEndpoint : `${otlpEndpoint}/`}v1/${signal}`;
}
