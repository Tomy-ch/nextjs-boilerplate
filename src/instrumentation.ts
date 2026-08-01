/**
 * Next.js がサーバーインスタンスの準備時に自動実行する起動フック。
 *
 * Edge runtime ではファイル読込を行わず、Node.js runtime に限って server Config の bootstrap を委譲する。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [
      { bootstrapConfig },
      { getObservabilityConfig },
      { getLogger, initializeLogger },
      { LogLevel },
      { initializeObservability },
      { createOtlpLogSink },
      { extractActiveTraceContext },
    ] = await Promise.all([
      import("./config/bootstrap.server"),
      import("./config/observability/observability.server"),
      import("./logging/logging.server"),
      import("./logging/logger"),
      import("./observability/initialize.server"),
      import("./observability/otlp-log-sink.server"),
      import("./observability/trace-context"),
    ]);

    await bootstrapConfig();

    const config = getObservabilityConfig();
    initializeObservability({
      otlpEndpoint: config.otlpEndpoint,
      tracesEnabled: config.tracesEnabled,
      metricsEnabled: config.metricsEnabled,
      logsEnabled: config.logsEnabled,
      serviceName: "nextjs-boilerplate",
    });
    initializeLogger({
      level: LogLevel.INFO,
      traceContextExtractor: extractActiveTraceContext,
      ...(config.logsEnabled ? { logRecordSink: createOtlpLogSink("nextjs-boilerplate") } : {}),
    });

    if (config.tracesEnabled && config.logsEnabled) {
      const { trace } = await import("@opentelemetry/api");
      trace.getTracer("nextjs-boilerplate").startActiveSpan("observability.initialize", (span) => {
        getLogger().info("observability を初期化しました", {
          traces_enabled: config.tracesEnabled,
          metrics_enabled: config.metricsEnabled,
          logs_enabled: config.logsEnabled,
        });
        span.end();
      });
    }
  }
}
