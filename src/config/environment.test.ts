import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "./environment";

const validEnvironment = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "otlp",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
} satisfies Environment;

function stubValidEnvironment(): void {
  vi.stubEnv("APP_API_BASE_URL", validEnvironment.APP_API_BASE_URL);
  vi.stubEnv("APP_API_MODE", validEnvironment.APP_API_MODE);
  vi.stubEnv("MEDIA_ORIGIN", validEnvironment.MEDIA_ORIGIN);
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", validEnvironment.OTEL_EXPORTER_OTLP_ENDPOINT);
  vi.stubEnv("OBS_TRACES_EXPORTER", validEnvironment.OBS_TRACES_EXPORTER);
  vi.stubEnv("OBS_METRICS_EXPORTER", validEnvironment.OBS_METRICS_EXPORTER);
  vi.stubEnv("OBS_LOGS_EXPORTER", validEnvironment.OBS_LOGS_EXPORTER);
  vi.stubEnv("AUTH_ISSUER", validEnvironment.AUTH_ISSUER);
  vi.stubEnv("AUTH_CLIENT_ID", validEnvironment.AUTH_CLIENT_ID);
  vi.stubEnv("AUTH_REDIRECT_URI", validEnvironment.AUTH_REDIRECT_URI);
  vi.stubEnv("AUTH_SCOPES", validEnvironment.AUTH_SCOPES);
  vi.stubEnv("AUTH_SESSION_SECRET", validEnvironment.AUTH_SESSION_SECRET);
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  stubValidEnvironment();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getEnvironment", () => {
  // ----- 正常系 -----
  it("検証済みの環境変数を同じ singleton として返す", async () => {
    const { getEnvironment, validateEnvironment } = await import("./environment");

    const first = getEnvironment();
    const second = getEnvironment();

    expect(first).toBe(second);
    expect(first).toEqual(validEnvironment);
    expect(() => validateEnvironment()).not.toThrow();
  });
});

describe("validateEnvironment", () => {
  // ----- 正常系 -----
  it("purpose ごとの Config getter が対応する値を返す", async () => {
    const [{ getApiConfig }, { getAuthConfig }, { getMediaConfig }, { getObservabilityConfig }] =
      await Promise.all([
        import("./api/api.server"),
        import("./auth/auth.server"),
        import("./media/media.server"),
        import("./observability/observability.server"),
      ]);

    expect(getApiConfig()).toMatchObject({
      baseUrl: validEnvironment.APP_API_BASE_URL,
      mode: validEnvironment.APP_API_MODE,
    });
    expect(getAuthConfig()).toMatchObject({
      issuer: validEnvironment.AUTH_ISSUER,
      clientId: validEnvironment.AUTH_CLIENT_ID,
      redirectUri: validEnvironment.AUTH_REDIRECT_URI,
      scopes: validEnvironment.AUTH_SCOPES,
      sessionSecret: validEnvironment.AUTH_SESSION_SECRET,
    });
    expect(getMediaConfig()).toMatchObject({ origin: validEnvironment.MEDIA_ORIGIN });
    expect(getObservabilityConfig()).toMatchObject({
      otlpEndpoint: validEnvironment.OTEL_EXPORTER_OTLP_ENDPOINT,
      tracesEnabled: true,
      metricsEnabled: false,
      logsEnabled: false,
    });
  });

  it("起動 bootstrap が全 server Config を評価する", async () => {
    const { bootstrapConfig } = await import("./bootstrap.server");

    await expect(bootstrapConfig()).resolves.toBeUndefined();
  });

  // ----- 異常系 -----
  it("必須の環境変数が欠落すると検証に失敗する", async () => {
    vi.stubEnv("AUTH_SESSION_SECRET", undefined);
    const { validateEnvironment } = await import("./environment");

    expect(() => validateEnvironment()).toThrow("AUTH_SESSION_SECRET");
  });

  it("不正な URL・空文字・短い secret を拒否する", async () => {
    vi.stubEnv("APP_API_BASE_URL", "ftp://api.example.test");
    vi.stubEnv("MEDIA_ORIGIN", "ftp://media.example.test");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "ftp://otel.example.test");
    vi.stubEnv("AUTH_ISSUER", "ftp://id.example.test");
    vi.stubEnv("AUTH_CLIENT_ID", "");
    vi.stubEnv("AUTH_REDIRECT_URI", "ftp://app.example.test/auth/callback");
    vi.stubEnv("AUTH_SCOPES", "   ");
    vi.stubEnv("AUTH_SESSION_SECRET", "short");
    const { validateEnvironment } = await import("./environment");

    expect(() => validateEnvironment()).toThrow(
      "APP_API_BASE_URL, MEDIA_ORIGIN, OTEL_EXPORTER_OTLP_ENDPOINT, AUTH_ISSUER, AUTH_CLIENT_ID, AUTH_REDIRECT_URI, AUTH_SCOPES, AUTH_SESSION_SECRET",
    );
  });

  it("未対応の APP_ENV を拒否する", async () => {
    vi.stubEnv("APP_ENV", "unsupported");
    const { loadEnvironment } = await import("./load-environment");

    expect(() => loadEnvironment()).toThrow(
      "APP_ENV は local, ci, dev, stg, prd のいずれかを指定してください",
    );
  });
});
