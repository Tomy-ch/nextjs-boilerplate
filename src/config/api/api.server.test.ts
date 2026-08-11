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

describe("getApiConfig", () => {
  // ----- 正常系 -----
  it("環境変数から API の接続先と動作 mode を組み立てる", async () => {
    const { getApiConfig } = await import("./api.server");

    expect(getApiConfig()).toMatchObject({
      baseUrl: "https://api.example.test",
      mode: "mock",
    });
  });

  it("同じ singleton を返す", async () => {
    const { getApiConfig } = await import("./api.server");

    expect(getApiConfig()).toBe(getApiConfig());
  });

  // ----- 異常系 -----
  it("接続先が欠落していれば組み立てを断る", async () => {
    vi.stubEnv("APP_API_BASE_URL", undefined);
    const { getApiConfig } = await import("./api.server");

    expect(() => getApiConfig()).toThrow("APP_API_BASE_URL");
  });
});
