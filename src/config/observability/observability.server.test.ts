import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubValidEnvironment } from "../environment.fixture";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  stubValidEnvironment();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getObservabilityConfig", () => {
  // ----- 正常系 -----
  it("環境変数から OTLP の送信先と signal ごとの有効・無効を組み立てる", async () => {
    const { getObservabilityConfig } = await import("./observability.server");

    expect(getObservabilityConfig()).toMatchObject({
      otlpEndpoint: "https://otel.example.test/v1/traces",
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
    });
  });

  it("同じ singleton を返す", async () => {
    const { getObservabilityConfig } = await import("./observability.server");

    expect(getObservabilityConfig()).toBe(getObservabilityConfig());
  });

  // ----- 異常系 -----
  it("送信先が http(s) でなければ組み立てを断る", async () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "ftp://otel.example.test");
    const { getObservabilityConfig } = await import("./observability.server");

    expect(() => getObservabilityConfig()).toThrow("OTEL_EXPORTER_OTLP_ENDPOINT");
  });
});
