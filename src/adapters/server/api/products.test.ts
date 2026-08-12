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

import { getProduct, getProducts, PRODUCTS_TAG, toProduct, toProductPage } from "./products";

const wireProduct = {
  id: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11",
  name: "商品",
  description: "<p>説明</p>",
  price: "19.99",
  quantity: 3,
  stockWarningThreshold: 2,
  status: { id: "1f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b12", name: "公開" },
  category: { id: "2f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b13", name: "雑貨" },
  publishedAt: "2026-08-07T00:00:00.000Z",
  imagePath: "products/abc.png",
  version: 1,
};

const wirePage = { products: [wireProduct], nextCursor: "next", hasNext: true };

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

describe("toProduct", () => {
  // ----- 正常系 -----
  it("契約の商品を表示用の型へ写す", () => {
    expect(toProduct(wireProduct)).toEqual({
      id: wireProduct.id,
      name: "商品",
      description: "<p>説明</p>",
      price: "19.99",
      quantity: 3,
      stockWarningThreshold: 2,
      status: { id: wireProduct.status.id, name: "公開" },
      category: { id: wireProduct.category.id, name: "雑貨" },
      publishedAt: new Date("2026-08-07T00:00:00.000Z"),
      imagePaths: ["products/abc.png"],
    });
  });

  it("公開日時が無い商品を null のまま持つ", () => {
    expect(toProduct({ ...wireProduct, publishedAt: null }).publishedAt).toBeNull();
  });

  it("価格を decimal 文字列のまま持つ", () => {
    expect(toProduct({ ...wireProduct, price: "0.001" }).price).toBe("0.001");
  });

  it("画像が無い商品の画像を空配列にする", () => {
    expect(toProduct({ ...wireProduct, imagePath: null }).imagePaths).toEqual([]);
  });

  it("在庫警告の境界が無い商品を null のまま持つ", () => {
    expect(
      toProduct({ ...wireProduct, stockWarningThreshold: null }).stockWarningThreshold,
    ).toBeNull();
  });
});

describe("toProductPage", () => {
  // ----- 正常系 -----
  it("次ページのカーソルを引き継ぐ", () => {
    expect(toProductPage(wirePage).nextCursor).toBe("next");
  });

  it("最終ページのカーソルを null にする", () => {
    expect(toProductPage({ ...wirePage, nextCursor: null }).nextCursor).toBeNull();
  });
});

describe("getProducts", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用の一覧にして返す", async () => {
    stubFetch(wirePage);

    const page = await getProducts({ keyword: "本", first: 20 });

    expect(page.products[0]?.name).toBe("商品");
  });

  it("取得条件をクエリへ載せる", async () => {
    const fetchImpl = stubFetch(wirePage);

    await getProducts({ keyword: "鞄", first: 20 });

    expect(fetchImpl.mock.calls[0]?.[0]).toContain("first=20");
  });

  it("再検証のタグを付ける", async () => {
    const fetchImpl = stubFetch(wirePage);

    await getProducts({ keyword: "靴" });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ next: { tags: [PRODUCTS_TAG] } });
  });

  it("条件を省略しても取得できる", async () => {
    stubFetch(wirePage);

    await expect(getProducts()).resolves.toMatchObject({ nextCursor: "next" });
  });
});

describe("getProduct", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用の商品にして返す", async () => {
    stubFetch(wireProduct);

    const product = await getProduct(wireProduct.id);

    expect(product.name).toBe("商品");
  });

  it("ID をパスへ載せる", async () => {
    const fetchImpl = stubFetch(wireProduct);

    await getProduct(wireProduct.id);

    expect(fetchImpl.mock.calls[0]?.[0]).toContain(`/v1/products/${wireProduct.id}`);
  });

  it("再検証のタグを付ける", async () => {
    const fetchImpl = stubFetch(wireProduct);

    await getProduct(wireProduct.id);

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ next: { tags: [PRODUCTS_TAG] } });
  });

  it("ID をパスへ載せる前に URL として安全な形へ変換する", async () => {
    const fetchImpl = stubFetch(wireProduct);

    await getProduct("a/../b");

    expect(fetchImpl.mock.calls[0]?.[0]).toContain("a%2F..%2Fb");
  });
});
