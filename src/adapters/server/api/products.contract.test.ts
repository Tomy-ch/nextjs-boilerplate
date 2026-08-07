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
};

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => environment) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getProducts } from "./products";

describe("正常系", () => {
  describe("getProducts", () => {
    it("契約から生成したハンドラの応答を検証して受け取る", async () => {
      const page = await getProducts({ keyword: "契約駆動" });

      expect(Array.isArray(page.products)).toBe(true);
    });
    it("生成ハンドラの応答が表示用の型を満たす", async () => {
      const [product] = (await getProducts({ keyword: "型の確認" })).products;

      expect(product).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(String),
        quantity: expect.any(Number),
        status: { id: expect.any(String), name: expect.any(String) },
        category: { id: expect.any(String), name: expect.any(String) },
      });
    });
  });
});
