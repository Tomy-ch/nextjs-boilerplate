import { describe, expect, it, vi } from "vitest";
import type { Environment } from "@/config/environment";

const environment: Environment = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "none",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "none",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: 8000,
};

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => environment) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getProductCategories } from "./product-masters";

describe("getProductCategories", () => {
  // ----- 正常系 -----
  it("契約から生成したハンドラの応答を検証して受け取る", async () => {
    const categories = await getProductCategories();

    expect(categories.length).toBeGreaterThan(0);
  });

  it("生成ハンドラの応答から表示に使う項目だけを残す", async () => {
    const [category] = await getProductCategories();

    expect(category).toEqual({
      id: expect.any(String),
      code: expect.any(Number),
      name: expect.any(String),
    });
  });
});
