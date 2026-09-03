import { CompositePropagator } from "@opentelemetry/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ignoreRequestHook: vi.fn<(request: { origin: string }) => boolean>(),
  start: vi.fn(),
  nodeSdk: vi.fn(),
  undiciInstrumentation: vi.fn(),
}));

function MockNodeSdk() {
  return { start: mocks.start };
}

function MockUndiciInstrumentation(config: {
  ignoreRequestHook: (request: { origin: string }) => boolean;
}) {
  mocks.ignoreRequestHook.mockImplementation(config.ignoreRequestHook);

  return {};
}

vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: mocks.nodeSdk,
}));

vi.mock("@opentelemetry/instrumentation-undici", () => ({
  UndiciInstrumentation: mocks.undiciInstrumentation,
}));

import { getSignalEndpoint, OtelSignal } from "./initialize.server";

describe("initializeObservability", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.start.mockReset();
    mocks.nodeSdk.mockReset();
    mocks.nodeSdk.mockImplementation(MockNodeSdk);
    mocks.ignoreRequestHook.mockReset();
    mocks.undiciInstrumentation.mockReset();
    mocks.undiciInstrumentation.mockImplementation(MockUndiciInstrumentation);
  });

  // ----- 正常系 -----
  it("trace が無効なら SDK を構築しない", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: false,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test/v1"],
    });

    expect(mocks.nodeSdk).not.toHaveBeenCalled();
  });

  it("trace が有効なら SDK を一度だけ開始する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test/v1"],
    });
    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test/v1"],
    });

    expect(mocks.nodeSdk).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });

  it("trace が有効なら trace exporter だけを構成に載せる", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test/v1"],
    });

    const config = mocks.nodeSdk.mock.calls[0]?.[0];
    expect(config.traceExporter).toBeDefined();
    expect(config).not.toHaveProperty("metricReaders");
    expect(config).not.toHaveProperty("logRecordProcessors");
  });

  it("W3C TraceContext と Baggage を合成した propagator を載せる", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test/v1"],
    });

    expect(mocks.nodeSdk.mock.calls[0]?.[0].textMapPropagator).toBeInstanceOf(CompositePropagator);
  });

  it("受信計装と Undici 計装の 2 本を登録する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test/v1"],
    });

    expect(mocks.nodeSdk.mock.calls[0]?.[0].instrumentations).toHaveLength(2);
    expect(mocks.undiciInstrumentation).toHaveBeenCalledWith({
      requireParentforSpans: true,
      ignoreRequestHook: expect.any(Function),
    });
  });

  it("許可 origin にだけ trace context を注入する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test/v1"],
    });

    expect(mocks.ignoreRequestHook({ origin: "https://api.example.test" })).toBe(false);
    expect(mocks.ignoreRequestHook({ origin: "https://api.example.test:8443" })).toBe(true);
    expect(mocks.ignoreRequestHook({ origin: "https://idp.example.test" })).toBe(true);
  });

  it("許可 origin が複数あればいずれにも注入する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test", "https://media.example.test"],
    });

    expect(mocks.ignoreRequestHook({ origin: "https://api.example.test" })).toBe(false);
    expect(mocks.ignoreRequestHook({ origin: "https://media.example.test" })).toBe(false);
    expect(mocks.ignoreRequestHook({ origin: "https://idp.example.test" })).toBe(true);
  });

  it("metrics と logs だけが有効でも SDK を開始する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: false,
      metricsEnabled: true,
      logsEnabled: true,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test"],
    });

    expect(mocks.nodeSdk).toHaveBeenCalledOnce();
    expect(mocks.start).toHaveBeenCalledOnce();

    const config = mocks.nodeSdk.mock.calls[0]?.[0];
    expect(config).not.toHaveProperty("traceExporter");
    expect(config.metricReaders).toBeDefined();
    expect(config.logRecordProcessors).toBeDefined();
    expect(mocks.undiciInstrumentation).toHaveBeenCalledOnce();
  });

  it("metrics だけが有効でも SDK を開始する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: false,
      metricsEnabled: true,
      logsEnabled: false,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test"],
    });

    expect(mocks.nodeSdk).toHaveBeenCalledOnce();
  });

  it("logs だけが有効でも SDK を開始する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: false,
      metricsEnabled: false,
      logsEnabled: true,
      serviceName: "Boilerplate Web",
      tracePropagationOrigins: ["https://api.example.test"],
    });

    expect(mocks.nodeSdk).toHaveBeenCalledOnce();
  });
});

describe("getSignalEndpoint", () => {
  // ----- 正常系 -----
  it("signal ごとの送信先を組み立てる", () => {
    expect(getSignalEndpoint("https://otel.example.test", OtelSignal.TRACES)).toBe(
      "https://otel.example.test/v1/traces",
    );
    expect(getSignalEndpoint("https://otel.example.test", OtelSignal.METRICS)).toBe(
      "https://otel.example.test/v1/metrics",
    );
    expect(getSignalEndpoint("https://otel.example.test", OtelSignal.LOGS)).toBe(
      "https://otel.example.test/v1/logs",
    );
  });

  it("末尾のスラッシュを重ねない", () => {
    expect(getSignalEndpoint("https://otel.example.test/", OtelSignal.TRACES)).toBe(
      "https://otel.example.test/v1/traces",
    );
  });
});
