import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
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

import {
  getProduct,
  getProductCount,
  getProductListPage,
  getProductRanking,
  getProducts,
  PRODUCTS_TAG,
  parseProductQuery,
  RANKING_PERIOD,
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

const PRODUCTS_URL = `${environment.APP_API_BASE_URL}/v1/products`;
const PRODUCT_URL = `${PRODUCTS_URL}/:id`;
const RANKING_URL = `${PRODUCTS_URL}/ranking`;
const COUNT_URL = `${PRODUCTS_URL}/count`;

/**
 * `fetch` の呼び出しを記録する。**応答は差し替えない。**
 *
 * @remarks
 * Next.js のキャッシュ指定（`cache` / `next.tags`）は要求として送出されないため、HTTP 境界からは
 * 観測できません。ここで見るのはその指定だけで、応答は MSW のハンドラが返したものが通ります。
 */
function watchFetch(): MockInstance<typeof fetch> {
  return vi.spyOn(globalThis, "fetch");
}

afterEach(() => {
  vi.restoreAllMocks();
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
      minPrice: "10",
      maxPrice: "50.5",
      minQuantity: "1",
      maxQuantity: "9",
      sort: "publishedAt",
    });

    expect(result).toEqual({
      ok: true,
      query: {
        after: "cursor-1",
        first: 20,
        categoryId: [wireProduct.category.id],
        statusId: wireProduct.status.id,
        keyword: "本",
        minPrice: "10",
        maxPrice: "50.5",
        minQuantity: 1,
        maxQuantity: 9,
        sort: "publishedAt",
      },
    });
  });

  it("繰り返された分類をそのまま並びとして写す", () => {
    const another = "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b14";

    const result = parseProductQuery({ categoryId: [wireProduct.category.id, another] });

    expect(result).toMatchObject({
      ok: true,
      query: { categoryId: [wireProduct.category.id, another] },
    });
  });

  it("1 つだけの分類も並びへ揃える", () => {
    const result = parseProductQuery({ categoryId: wireProduct.category.id });

    expect(result).toMatchObject({ ok: true, query: { categoryId: [wireProduct.category.id] } });
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

  it("並びの中に契約を外れた分類が 1 つでもあれば写さない", () => {
    const result = parseProductQuery({ categoryId: [wireProduct.category.id, "zz"] });

    expect(result).toEqual({ ok: false, invalidKeys: ["categoryId"] });
  });

  it("十進の形を外れた価格を写さず、外れたキーを返す", () => {
    const result = parseProductQuery({ minPrice: "やすい" });

    expect(result).toEqual({ ok: false, invalidKeys: ["minPrice"] });
  });

  it("負の在庫数を写さず、外れたキーを返す", () => {
    const result = parseProductQuery({ minQuantity: "-1" });

    expect(result).toEqual({ ok: false, invalidKeys: ["minQuantity"] });
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
    serveJson(PRODUCTS_URL, wirePage);

    const page = await getProducts({ keyword: "本", first: 20 });

    expect(page.items[0]?.name).toBe("商品");
  });

  it("取得条件をクエリへ載せる", async () => {
    const requests = serveJson(PRODUCTS_URL, wirePage);

    await getProducts({
      after: "cursor-1",
      first: 20,
      categoryId: [wireProduct.category.id],
      statusId: wireProduct.status.id,
      keyword: "鞄",
      minPrice: "10",
      maxPrice: "50",
      minQuantity: 1,
      maxQuantity: 9,
      sort: "publishedAt",
    });

    expect(requests[0]?.url).toBe(
      `${PRODUCTS_URL}?categoryId=${wireProduct.category.id}&statusId=${wireProduct.status.id}&keyword=%E9%9E%84&minPrice=10&maxPrice=50&minQuantity=1&maxQuantity=9&after=cursor-1&first=20&sort=publishedAt`,
    );
  });

  it("複数の分類を同じキーの繰り返しで載せる", async () => {
    const requests = serveJson(PRODUCTS_URL, wirePage);
    const another = "3f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b14";

    await getProducts({ categoryId: [wireProduct.category.id, another] });

    expect(requests[0]?.url).toBe(
      `${PRODUCTS_URL}?categoryId=${wireProduct.category.id}&categoryId=${another}`,
    );
  });

  it("指定しなかった条件はクエリへ載せない", async () => {
    const requests = serveJson(PRODUCTS_URL, wirePage);

    await getProducts({ keyword: "鞄" });

    expect(requests[0]?.url).toBe(`${PRODUCTS_URL}?keyword=%E9%9E%84`);
  });

  it("再検証のタグを付ける", async () => {
    serveJson(PRODUCTS_URL, wirePage);
    const fetchImpl = watchFetch();

    await getProducts({ keyword: "靴" });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ next: { tags: [PRODUCTS_TAG] } });
  });

  it("条件を省略しても取得できる", async () => {
    serveJson(PRODUCTS_URL, wirePage);

    await expect(getProducts()).resolves.toMatchObject({ nextCursor: "next" });
  });
});

describe("getProductListPage", () => {
  // ----- 正常系 -----
  it("一覧に要る値だけを持つ 1 件へ落とす", async () => {
    serveJson(PRODUCTS_URL, wirePage);

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
    const requests = serveJson(PRODUCTS_URL, wirePage);

    await getProductListPage({
      first: 20,
      statusId: wireProduct.status.id,
      keyword: "靴",
    });

    expect(requests[0]?.url).toBe(
      `${PRODUCTS_URL}?statusId=${wireProduct.status.id}&keyword=%E9%9D%B4&first=20`,
    );
  });

  it("次ページのカーソルを引き継ぐ", async () => {
    serveJson(PRODUCTS_URL, wirePage);

    await expect(getProductListPage({ first: 20 })).resolves.toMatchObject({ nextCursor: "next" });
  });

  it("最終ページのカーソルを null にする", async () => {
    serveJson(PRODUCTS_URL, { ...wirePage, nextCursor: null, hasNext: false });

    await expect(getProductListPage({ first: 20 })).resolves.toMatchObject({ nextCursor: null });
  });

  it("画像が無い商品の URL を null にする", async () => {
    serveJson(PRODUCTS_URL, { ...wirePage, products: [{ ...wireProduct, images: [] }] });

    const page = await getProductListPage({ first: 20 });

    expect(page.items[0]?.imageUrl).toBeNull();
  });

  it("条件を省略しても取得できる", async () => {
    serveJson(PRODUCTS_URL, wirePage);

    const page = await getProductListPage();

    expect(page.items[0]?.name).toBe("商品");
  });
});

describe("getProductCount", () => {
  // ----- 正常系 -----
  it("契約が返した件数をそのまま返す", async () => {
    serveJson(COUNT_URL, { count: 42 });

    await expect(getProductCount({ keyword: "鞄" })).resolves.toBe(42);
  });

  it("一致する対象を決める条件だけをクエリへ載せる", async () => {
    const requests = serveJson(COUNT_URL, { count: 0 });

    await getProductCount({ keyword: "靴", minPrice: "10", after: "cursor-1", first: 20 });

    expect(requests[0]?.url).toBe(`${COUNT_URL}?keyword=%E9%9D%B4&minPrice=10`);
  });

  it("条件を省略しても取得できる", async () => {
    serveJson(COUNT_URL, { count: 7 });

    await expect(getProductCount()).resolves.toBe(7);
  });
});

describe("getProduct", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用の商品にして返す", async () => {
    serveJson(PRODUCT_URL, wireProduct);

    const product = await getProduct(wireProduct.id);

    expect(product.name).toBe("商品");
  });

  it("ID をパスへ載せる", async () => {
    const requests = serveJson(PRODUCT_URL, wireProduct);

    await getProduct(wireProduct.id);

    expect(requests[0]?.url).toBe(`${PRODUCTS_URL}/${wireProduct.id}`);
  });

  it("再検証のタグを付ける", async () => {
    serveJson(PRODUCT_URL, wireProduct);
    const fetchImpl = watchFetch();

    await getProduct(wireProduct.id);

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ next: { tags: [PRODUCTS_TAG] } });
  });

  it("ID をパスへ載せる前に URL として安全な形へ変換する", async () => {
    const requests = serveJson(PRODUCT_URL, wireProduct);

    await getProduct("a/../b");

    expect(requests[0]?.url).toBe(`${PRODUCTS_URL}/a%2F..%2Fb`);
  });
});

const wireRanking = {
  rankings: [
    {
      productId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b21",
      name: "よく売れた商品",
      price: "19.99",
      soldQuantity: 128,
    },
  ],
};

describe("getProductRanking", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用の型へ写す", async () => {
    serveJson(RANKING_URL, wireRanking);

    await expect(getProductRanking({ limit: 5 })).resolves.toEqual([
      {
        productId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b21",
        name: "よく売れた商品",
        price: "19.99",
        soldQuantity: 128,
      },
    ]);
  });

  it("件数と期間をクエリへ載せる", async () => {
    const requests = serveJson(RANKING_URL, wireRanking);

    await getProductRanking({ limit: 5, period: RANKING_PERIOD.LAST_30_DAYS });

    expect(requests[0]?.url).toBe(`${RANKING_URL}?period=30d&limit=5`);
  });

  it("条件を省略したら契約の既定値に任せ、クエリを付けない", async () => {
    const requests = serveJson(RANKING_URL, wireRanking);

    await getProductRanking();

    expect(requests[0]?.url).toBe(RANKING_URL);
  });

  it("キャッシュを指定しない", async () => {
    serveJson(RANKING_URL, wireRanking);
    const fetchImpl = watchFetch();

    await getProductRanking({ limit: 5 });

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ cache: undefined, next: undefined });
  });

  it("対象が無ければ空の一覧を返す", async () => {
    serveJson(RANKING_URL, { rankings: [] });

    await expect(getProductRanking({ limit: 5 })).resolves.toEqual([]);
  });
});
