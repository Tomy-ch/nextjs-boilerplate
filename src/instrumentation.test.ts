import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel } from "./logging/logger";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("register", () => {
  // ----- 正常系 -----
  it("Edge runtime では Config bootstrap を呼ばない", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const bootstrapConfig = vi.fn();
    vi.doMock("./config/bootstrap.server", () => ({ bootstrapConfig }));
    const { register } = await import("./instrumentation");

    await register();

    expect(bootstrapConfig).not.toHaveBeenCalled();
  });

  it("Node.js runtime では Config bootstrap を呼ぶ", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const bootstrapConfig = vi.fn();
    const initializeObservability = vi.fn();
    const initializeLogger = vi.fn();
    const getLogger = vi.fn();
    const createOtlpLogSink = vi.fn();
    const extractActiveTraceContext = vi.fn();
    vi.doMock("./config/bootstrap.server", () => ({ bootstrapConfig }));
    vi.doMock("./config/api/api.server", () => ({ getApiConfig: () => ({ mode: "live" }) }));
    vi.doMock("./config/observability/observability.server", () => ({
      getObservabilityConfig: () => ({
        serviceName: "Boilerplate Web",
        otlpEndpoint: "http://localhost:4318",
        tracesEnabled: false,
        metricsEnabled: false,
        logsEnabled: false,
      }),
    }));
    vi.doMock("./observability/initialize.server", () => ({ initializeObservability }));
    vi.doMock("./logging/logging.server", () => ({ getLogger, initializeLogger }));
    vi.doMock("./observability/otlp-log-sink.server", () => ({ createOtlpLogSink }));
    vi.doMock("./observability/trace-context", () => ({ extractActiveTraceContext }));
    const { register } = await import("./instrumentation");

    await register();

    expect(bootstrapConfig).toHaveBeenCalledOnce();
    expect(initializeObservability).toHaveBeenCalledOnce();
    expect(initializeLogger).toHaveBeenCalledWith({
      level: LogLevel.INFO,
      traceContextExtractor: extractActiveTraceContext,
    });
    expect(createOtlpLogSink).not.toHaveBeenCalled();
    expect(getLogger).not.toHaveBeenCalled();
  });

  it("logs が有効なら OTLP sink を logger へ注入する", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const bootstrapConfig = vi.fn();
    const initializeLogger = vi.fn();
    const getLogger = vi.fn();
    const createOtlpLogSink = vi.fn(() => vi.fn());
    const extractActiveTraceContext = vi.fn();
    vi.doMock("./config/bootstrap.server", () => ({ bootstrapConfig }));
    vi.doMock("./config/api/api.server", () => ({ getApiConfig: () => ({ mode: "live" }) }));
    vi.doMock("./config/observability/observability.server", () => ({
      getObservabilityConfig: () => ({
        serviceName: "Boilerplate Web",
        otlpEndpoint: "http://localhost:4318",
        tracesEnabled: false,
        metricsEnabled: false,
        logsEnabled: true,
      }),
    }));
    vi.doMock("./observability/initialize.server", () => ({ initializeObservability: vi.fn() }));
    vi.doMock("./logging/logging.server", () => ({ getLogger, initializeLogger }));
    vi.doMock("./observability/otlp-log-sink.server", () => ({ createOtlpLogSink }));
    vi.doMock("./observability/trace-context", () => ({ extractActiveTraceContext }));
    const { register } = await import("./instrumentation");

    await register();

    expect(createOtlpLogSink).toHaveBeenCalledWith("Boilerplate Web");
    expect(initializeLogger).toHaveBeenCalledWith({
      level: LogLevel.INFO,
      traceContextExtractor: extractActiveTraceContext,
      logRecordSink: expect.any(Function),
    });
  });

  it("trace と logs が有効なら相関付きの起動ログを出力する", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const info = vi.fn();
    const end = vi.fn();
    const getLogger = vi.fn(() => ({ info }));
    const startActiveSpan = vi.fn((_: string, callback: (span: { end: () => void }) => void) =>
      callback({ end }),
    );
    vi.doMock("./config/bootstrap.server", () => ({ bootstrapConfig: vi.fn() }));
    vi.doMock("./config/observability/observability.server", () => ({
      getObservabilityConfig: () => ({
        serviceName: "Boilerplate Web",
        otlpEndpoint: "http://localhost:4318",
        tracesEnabled: true,
        metricsEnabled: false,
        logsEnabled: true,
      }),
    }));
    vi.doMock("./observability/initialize.server", () => ({ initializeObservability: vi.fn() }));
    vi.doMock("./logging/logging.server", () => ({ getLogger, initializeLogger: vi.fn() }));
    vi.doMock("./observability/otlp-log-sink.server", () => ({ createOtlpLogSink: vi.fn() }));
    vi.doMock("./observability/trace-context", () => ({ extractActiveTraceContext: vi.fn() }));
    vi.doMock("@opentelemetry/api", () => ({ trace: { getTracer: () => ({ startActiveSpan }) } }));
    const { register } = await import("./instrumentation");

    await register();

    expect(startActiveSpan).toHaveBeenCalledWith("observability.initialize", expect.any(Function));
    expect(info).toHaveBeenCalledWith("observability を初期化しました", {
      traces_enabled: true,
      metrics_enabled: false,
      logs_enabled: true,
    });
    expect(end).toHaveBeenCalledOnce();
  });

  it("mock モードでは API の interception を立てる", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const listen = vi.fn();
    vi.doMock("./config/bootstrap.server", () => ({ bootstrapConfig: vi.fn() }));
    vi.doMock("./config/api/api.server", () => ({ getApiConfig: () => ({ mode: "mock" }) }));
    vi.doMock("../mocks/node", () => ({ mockServer: { listen } }));
    vi.doMock("./config/observability/observability.server", () => ({
      getObservabilityConfig: () => ({
        serviceName: "Boilerplate Web",
        otlpEndpoint: "http://localhost:4318",
        tracesEnabled: false,
        metricsEnabled: false,
        logsEnabled: false,
      }),
    }));
    vi.doMock("./observability/initialize.server", () => ({ initializeObservability: vi.fn() }));
    vi.doMock("./logging/logging.server", () => ({
      getLogger: vi.fn(),
      initializeLogger: vi.fn(),
    }));
    vi.doMock("./observability/otlp-log-sink.server", () => ({ createOtlpLogSink: vi.fn() }));
    vi.doMock("./observability/trace-context", () => ({ extractActiveTraceContext: vi.fn() }));
    const { register } = await import("./instrumentation");

    await register();

    expect(listen).toHaveBeenCalledWith({ onUnhandledRequest: "bypass" });
  });
});
