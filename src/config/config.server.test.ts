import { describe, expect, it, vi } from "vitest";

const { getEnvironment } = vi.hoisted(() => ({
  getEnvironment: vi.fn(() => ({
    APP_API_BASE_URL: "https://api.example.test",
    APP_API_MODE: "mock" as const,
    MEDIA_ORIGIN: "https://media.example.test",
    OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
    AUTH_ISSUER: "https://id.example.test",
    AUTH_CLIENT_ID: "nextjs-boilerplate",
    AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
    AUTH_SCOPES: "openid profile",
    AUTH_SESSION_SECRET: "01234567890123456789012345678901",
  })),
}));

vi.mock("./environment", () => ({ getEnvironment }));

import { getApiConfig } from "./api/api.server";
import { getAuthConfig } from "./auth/auth.server";
import { getMediaConfig } from "./media/media.server";
import { getObservabilityConfig } from "./observability/observability.server";

describe("server Config", () => {
  it("API Config を検証済み ENV から一度だけ生成する", () => {
    const first = getApiConfig();
    const second = getApiConfig();

    expect(first).toBe(second);
    expect(first).toMatchObject({ baseUrl: "https://api.example.test", mode: "mock" });
  });

  it("Auth Config を検証済み ENV から一度だけ生成する", () => {
    const first = getAuthConfig();
    const second = getAuthConfig();

    expect(first).toBe(second);
    expect(first).toMatchObject({
      issuer: "https://id.example.test",
      clientId: "nextjs-boilerplate",
      redirectUri: "https://app.example.test/auth/callback",
      scopes: "openid profile",
      sessionSecret: "01234567890123456789012345678901",
    });
  });

  it("Media Config を検証済み ENV から一度だけ生成する", () => {
    const first = getMediaConfig();
    const second = getMediaConfig();

    expect(first).toBe(second);
    expect(first).toMatchObject({ origin: "https://media.example.test" });
  });

  it("Observability Config を検証済み ENV から一度だけ生成する", () => {
    const first = getObservabilityConfig();
    const second = getObservabilityConfig();

    expect(first).toBe(second);
    expect(first).toMatchObject({ otlpEndpoint: "https://otel.example.test/v1/traces" });
    expect(getEnvironment).toHaveBeenCalledTimes(4);
  });
});
