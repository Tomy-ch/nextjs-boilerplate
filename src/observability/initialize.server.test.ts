import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  nodeSdk: vi.fn(),
}));

function MockNodeSdk() {
  return { start: mocks.start };
}

vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: mocks.nodeSdk,
}));

import { getSignalEndpoint, OtelSignal } from "./initialize.server";

describe("initializeObservability", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.start.mockReset();
    mocks.nodeSdk.mockReset();
    mocks.nodeSdk.mockImplementation(MockNodeSdk);
  });

  it("trace が無効なら SDK を構築しない", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: false,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "nextjs-boilerplate",
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
      serviceName: "nextjs-boilerplate",
    });
    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
      serviceName: "nextjs-boilerplate",
    });

    expect(mocks.nodeSdk).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.nodeSdk.mock.calls[0]?.[0]).toMatchObject({
      textMapPropagator: expect.anything(),
      instrumentations: expect.any(Array),
    });
  });

  it("metrics と logs だけが有効でも SDK を開始する", async () => {
    const { initializeObservability } = await import("./initialize.server");

    initializeObservability({
      otlpEndpoint: "http://localhost:4318",
      tracesEnabled: false,
      metricsEnabled: true,
      logsEnabled: true,
      serviceName: "nextjs-boilerplate",
    });

    expect(mocks.nodeSdk).toHaveBeenCalledOnce();
    expect(mocks.start).toHaveBeenCalledOnce();
  });

  it("OTLP HTTP endpoint に signal ごとの resource path を付与する", async () => {
    const { getSignalEndpoint, OtelSignal } = await import("./initialize.server");

    expect(getSignalEndpoint("http://localhost:4318", OtelSignal.TRACES)).toBe(
      "http://localhost:4318/v1/traces",
    );
    expect(getSignalEndpoint("http://localhost:4318/", OtelSignal.METRICS)).toBe(
      "http://localhost:4318/v1/metrics",
    );
    expect(getSignalEndpoint("https://otel.example.test/base", OtelSignal.LOGS)).toBe(
      "https://otel.example.test/base/v1/logs",
    );
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
