import { describe, expect, it, vi } from "vitest";
// 契約から生成したハンドラそのものを相手にするため、応答は原則割り当てない。写しの分岐そのものを
// 見るケースだけ、生成した応答の当該項目を差し替えて割り当てる。
import {
  getGetProductsDetailResponseMock,
  getGetProductsResponseMock,
} from "../../../../mocks/api/endpoints.msw";
import { serveJson } from "../../../../vitest.setup.msw";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => null),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { toProductId } from "@/model/product/product";
import { getProduct, getProductRanking, getProducts } from "./products";

/**
 * 表示用の商品が公開する項目。
 *
 * @remarks
 * 並びごと照合します。生成ハンドラは契約の全項目を返すため、`toMatchObject` で数項目だけを
 * 見ると、写し漏れも wire の項目の漏れ出しも通ります。
 */
const PRODUCTS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/products`;

const PRODUCT_KEYS = [
  "category",
  "description",
  "id",
  "imagePaths",
  "name",
  "price",
  "publishedAt",
  "quantity",
  "status",
  "stockWarningThreshold",
  "version",
];

describe("getProduct", () => {
  // ----- 正常系 -----
  it("生成ハンドラの応答から、表示に使う項目だけを組み立てる", async () => {
    const product = await getProduct(toProductId("0195f0c2-0000-7000-8000-000000000001"));

    expect(Object.keys(product).sort()).toEqual(PRODUCT_KEYS);
  });

  it("契約が文字列で返す公開日時を Date にして受け取る", async () => {
    const product = await getProduct(toProductId("0195f0c2-0000-7000-8000-000000000001"));

    // zod の検証を抜けた時点ではまだ文字列で、Date にするのは adapter 自身。契約の応答が
    // 通ることだけを見ると、この写しが外れても気づけない。
    expect(product.publishedAt).toBeInstanceOf(Date);
  });

  it("契約が decimal 文字列で返す価格を数値へ丸めない", async () => {
    const product = await getProduct(toProductId("0195f0c2-0000-7000-8000-000000000001"));

    expect(product.price).toBe("19.99");
  });

  it("生成ハンドラの応答から画像をパスの並びへ均す", async () => {
    const id = toProductId("0195f0c2-0000-7000-8000-000000000002");
    serveJson(
      `${PRODUCTS_URL}/${id}`,
      getGetProductsDetailResponseMock({
        images: [
          { imagePath: "products/first.webp", displaySort: 1 },
          { imagePath: "products/second.webp", displaySort: 2 },
          { imagePath: "products/third.webp", displaySort: 3 },
        ],
      }),
    );

    const product = await getProduct(id);

    expect(product.imagePaths).toEqual([
      "products/first.webp",
      "products/second.webp",
      "products/third.webp",
    ]);
  });
});

describe("getProducts", () => {
  // ----- 正常系 -----
  it("生成ハンドラの応答から、表示に使う項目だけを持つ一覧を組み立てる", async () => {
    const [product] = (await getProducts({ keyword: "型の確認" })).items;

    expect(Object.keys(product ?? {}).sort()).toEqual(PRODUCT_KEYS);
  });

  it("公開日時を持たない商品の公開日時を null のまま持つ", async () => {
    const response = getGetProductsResponseMock();
    serveJson(PRODUCTS_URL, {
      ...response,
      products: response.products.map((wire) => ({ ...wire, publishedAt: null })),
    });

    const [product] = (await getProducts({ keyword: "型の確認" })).items;

    expect(product?.publishedAt).toBeNull();
  });
});

describe("getProductRanking", () => {
  // ----- 正常系 -----
  it("契約から生成したハンドラの応答を検証して受け取る", async () => {
    const rankings = await getProductRanking({ limit: 5 });

    expect(rankings.length).toBeGreaterThan(0);
  });

  it("1 件の形が契約どおりである", async () => {
    const [entry] = await getProductRanking({ limit: 5 });

    expect(entry).toEqual({
      productId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: expect.any(String),
      price: expect.stringMatching(/^\d+(\.\d+)?$/),
      soldQuantity: expect.any(Number),
    });
  });
});
