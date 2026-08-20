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
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: 8000,
  NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES: 4194304,
};

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => environment) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getProductCategories, getProductStatuses, PRODUCT_MASTERS_TAG } from "./product-masters";

const wireCategories = [
  { id: "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b21", name: "雑貨", code: 20, displaySort: 1 },
  { id: "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b22", name: "書籍", code: 10, displaySort: 2 },
];

const wireStatuses = [
  { id: "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b31", name: "在庫あり", code: 1 },
  { id: "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b32", name: "在庫切れ", code: 2 },
];

const CATEGORIES_URL = `${environment.APP_API_BASE_URL}/v1/products/categories`;
const STATUSES_URL = `${environment.APP_API_BASE_URL}/v1/products/statuses`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getProductCategories", () => {
  // ----- 正常系 -----
  it("契約の応答から ID・コード・表示名だけを取り出す", async () => {
    serveJson(CATEGORIES_URL, wireCategories);

    await expect(getProductCategories()).resolves.toEqual([
      { id: wireCategories[0]?.id, code: 20, name: "雑貨" },
      { id: wireCategories[1]?.id, code: 10, name: "書籍" },
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

describe("getProductStatuses", () => {
  // ----- 正常系 -----
  it("契約の応答から ID・コード・表示名を取り出す", async () => {
    serveJson(STATUSES_URL, wireStatuses);

    await expect(getProductStatuses()).resolves.toEqual([
      { id: wireStatuses[0].id, name: "在庫あり", code: 1 },
      { id: wireStatuses[1].id, name: "在庫切れ", code: 2 },
    ]);
  });

  it("契約が返した並びをそのまま保つ", async () => {
    serveJson(STATUSES_URL, [wireStatuses[1], wireStatuses[0]]);

    const statuses = await getProductStatuses();

    expect(statuses.map((status) => status.name)).toEqual(["在庫切れ", "在庫あり"]);
  });

  it("状態のマスタへ問い合わせる", async () => {
    const requests = serveJson(STATUSES_URL, wireStatuses);

    await getProductStatuses();

    expect(requests[0]?.url).toBe(STATUSES_URL);
  });

  it("キャッシュとマスタの再検証タグを指定する", async () => {
    serveJson(STATUSES_URL, wireStatuses);
    const fetchImpl = vi.spyOn(globalThis, "fetch");

    await getProductStatuses();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      cache: "force-cache",
      next: { tags: [PRODUCT_MASTERS_TAG] },
    });
  });

  it("マスタが空でも空の一覧を返す", async () => {
    serveJson(STATUSES_URL, []);

    await expect(getProductStatuses()).resolves.toEqual([]);
  });
});
