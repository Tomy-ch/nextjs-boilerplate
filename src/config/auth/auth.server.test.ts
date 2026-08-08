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

describe("getAuthConfig", () => {
  // ----- 正常系 -----
  it("環境変数から OIDC の接続情報を組み立てる", async () => {
    const { getAuthConfig } = await import("./auth.server");

    expect(getAuthConfig()).toMatchObject({
      issuer: "https://id.example.test",
      clientId: "nextjs-boilerplate",
      redirectUri: "https://app.example.test/auth/callback",
      scopes: "openid profile",
      sessionSecret: "01234567890123456789012345678901",
    });
  });

  it("同じ singleton を返す", async () => {
    const { getAuthConfig } = await import("./auth.server");

    expect(getAuthConfig()).toBe(getAuthConfig());
  });

  // ----- 異常系 -----
  it("session secret が短ければ組み立てを断る", async () => {
    vi.stubEnv("AUTH_SESSION_SECRET", "short");
    const { getAuthConfig } = await import("./auth.server");

    expect(() => getAuthConfig()).toThrow("AUTH_SESSION_SECRET");
  });
});
