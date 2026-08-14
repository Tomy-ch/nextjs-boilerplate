import { afterEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "@/config/environment";
import { serveJson } from "../../../../vitest.setup";

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

import { getProductCategories, PRODUCT_MASTERS_TAG } from "./product-masters";

const wireCategories = [
  { id: "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b21", name: "雑貨", code: 20, sortKey: 1 },
  { id: "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b22", name: "書籍", code: 10, sortKey: 2 },
];

const CATEGORIES_URL = `${environment.APP_API_BASE_URL}/v1/products/categories`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getProductCategories", () => {
  // ----- 正常系 -----
  it("契約の応答から ID と表示名だけを取り出す", async () => {
    serveJson(CATEGORIES_URL, wireCategories);

    await expect(getProductCategories()).resolves.toEqual([
      { id: wireCategories[0]?.id, name: "雑貨" },
      { id: wireCategories[1]?.id, name: "書籍" },
    ]);
  });

  it("契約が返した並びをそのまま保つ", async () => {
    serveJson(CATEGORIES_URL, wireCategories);

    const categories = await getProductCategories();

    expect(categories.map(({ name }) => name)).toEqual(["雑貨", "書籍"]);
  });

  it("カテゴリのマスタへ問い合わせる", async () => {
    const requests = serveJson(CATEGORIES_URL, wireCategories);

    await getProductCategories();

    expect(requests[0]?.url).toBe(CATEGORIES_URL);
  });

  it("キャッシュとマスタの再検証タグを指定する", async () => {
    serveJson(CATEGORIES_URL, wireCategories);
    // キャッシュ指定は要求として送出されないため、HTTP 境界からは観測できない。応答は
    // 差し替えず、`fetch` へ渡された指定だけを見る。
    const fetchImpl = vi.spyOn(globalThis, "fetch");

    await getProductCategories();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      cache: "force-cache",
      next: { tags: [PRODUCT_MASTERS_TAG] },
    });
  });

  it("マスタが空でも空の一覧を返す", async () => {
    serveJson(CATEGORIES_URL, []);

    await expect(getProductCategories()).resolves.toEqual([]);
  });
});
