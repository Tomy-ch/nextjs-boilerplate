import { afterEach, describe, expect, it, vi } from "vitest";
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

import {
  getProduct,
  getProductListPage,
  getProducts,
  getProductTotalCount,
  PRODUCTS_TAG,
  parseProductQuery,
  toProduct,
  toProductPage,
} from "./products";

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
  images: [{ imagePath: "products/abc.png", sortKey: 1 }],
  version: 1,
};

const wirePage = { products: [wireProduct], nextCursor: "next", hasNext: true };

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseProductQuery", () => {
  // ----- 正常系 -----
  it("契約に載る条件を取得条件へ写す", () => {
    const result = parseProductQuery({
      after: "cursor-1",
      first: "20",
      categoryId: wireProduct.category.id,
      statusId: wireProduct.status.id,
      keyword: "本",
      sort: "publishedAt",
    });

    expect(result).toEqual({
      ok: true,
      query: {
        after: "cursor-1",
        first: 20,
        categoryId: wireProduct.category.id,
        statusId: wireProduct.status.id,
        keyword: "本",
        sort: "publishedAt",
      },
    });
  });

  it("文字列の件数を数値へ写す", () => {
    const result = parseProductQuery({ first: "20" });

    expect(result).toMatchObject({ ok: true, query: { first: 20 } });
  });

  it("省略した条件を契約の既定値で埋める", () => {
    const result = parseProductQuery({});

    expect(result).toEqual({ ok: true, query: { first: 50, sort: "-publishedAt" } });
  });

  // ----- 異常系 -----
  it("契約に無い並び順を写さず、外れたキーを返す", () => {
    const result = parseProductQuery({ sort: "price" });

    expect(result).toEqual({ ok: false, invalidKeys: ["sort"] });
  });

  it("上限を超えた件数を写さず、外れたキーを返す", () => {
    const result = parseProductQuery({ first: "201" });

    expect(result).toEqual({ ok: false, invalidKeys: ["first"] });
  });

  it("数値でない件数を写さず、外れたキーを返す", () => {
    const result = parseProductQuery({ first: "たくさん" });

    expect(result).toEqual({ ok: false, invalidKeys: ["first"] });
  });

  it("外れたキーが複数あればすべて返す", () => {
    const result = parseProductQuery({ first: "0", sort: "price" });

    expect(result).toEqual({ ok: false, invalidKeys: ["first", "sort"] });
  });

  it("同じキーが複数の規則に外れてもキーを 1 つだけ返す", () => {
    const result = parseProductQuery({ categoryId: "zz" });

    expect(result).toEqual({ ok: false, invalidKeys: ["categoryId"] });
  });
});

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
    expect(toProduct({ ...wireProduct, images: [] }).imagePaths).toEqual([]);
  });

  it("複数の画像を契約の順序のまま持つ", () => {
    const images = [
      { imagePath: "products/first.png", sortKey: 1 },
      { imagePath: "products/second.png", sortKey: 5 },
    ];

    expect(toProduct({ ...wireProduct, images }).imagePaths).toEqual([
      "products/first.png",
      "products/second.png",
    ]);
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

    expect(page.items[0]?.name).toBe("商品");
  });

  it("取得条件をクエリへ載せる", async () => {
    const fetchImpl = stubFetch(wirePage);

    await getProducts({
      after: "cursor-1",
      first: 20,
      categoryId: wireProduct.category.id,
      statusId: wireProduct.status.id,
      keyword: "鞄",
      sort: "publishedAt",
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `https://api.example.test/v1/products?after=cursor-1&first=20&categoryId=${wireProduct.category.id}&statusId=${wireProduct.status.id}&keyword=%E9%9E%84&sort=publishedAt`,
    );
  });

  it("指定しなかった条件はクエリへ載せない", async () => {
    const fetchImpl = stubFetch(wirePage);

    await getProducts({ keyword: "鞄" });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/v1/products?keyword=%E9%9E%84",
    );
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

describe("getProductListPage", () => {
  // ----- 正常系 -----
  it("一覧に要る値だけを持つ 1 件へ落とす", async () => {
    stubFetch(wirePage);

    const page = await getProductListPage({ first: 20 });

    expect(page.items[0]).toEqual({
      id: wireProduct.id,
      name: "商品",
      price: "19.99",
      quantity: 3,
      categoryName: "雑貨",
      statusName: "公開",
      imageUrl: "https://media.example.test/products/abc.png",
    });
  });

  it("取得条件を一覧の取得へ渡す", async () => {
    const fetchImpl = stubFetch(wirePage);

    await getProductListPage({
      first: 20,
      statusId: wireProduct.status.id,
      keyword: "靴",
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `https://api.example.test/v1/products?first=20&statusId=${wireProduct.status.id}&keyword=%E9%9D%B4`,
    );
  });

  it("次ページのカーソルを引き継ぐ", async () => {
    stubFetch(wirePage);

    await expect(getProductListPage({ first: 20 })).resolves.toMatchObject({ nextCursor: "next" });
  });

  it("最終ページのカーソルを null にする", async () => {
    stubFetch({ ...wirePage, nextCursor: null, hasNext: false });

    await expect(getProductListPage({ first: 20 })).resolves.toMatchObject({ nextCursor: null });
  });

  it("画像が無い商品の URL を null にする", async () => {
    stubFetch({ ...wirePage, products: [{ ...wireProduct, images: [] }] });

    const page = await getProductListPage({ first: 20 });

    expect(page.items[0]?.imageUrl).toBeNull();
  });

  it("条件を省略しても取得できる", async () => {
    stubFetch(wirePage);

    const page = await getProductListPage();

    expect(page.items[0]?.name).toBe("商品");
  });
});

describe("getProductTotalCount", () => {
  // ----- 正常系 -----
  it("総数を返す取得口が生えるまでの暫定値を返す", async () => {
    await expect(getProductTotalCount()).resolves.toBe(10);
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
