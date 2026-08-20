import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => null),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { toProductId } from "@/model/product/product";
import { getProduct, getProductRanking, getProducts } from "./products";

describe("getProduct", () => {
  // ----- 正常系 -----
  it("契約から生成したハンドラの応答を検証して受け取る", async () => {
    const product = await getProduct(toProductId("0195f0c2-0000-7000-8000-000000000001"));

    expect(product).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      price: expect.any(String),
      quantity: expect.any(Number),
      status: { id: expect.any(String), name: expect.any(String) },
      category: { id: expect.any(String), name: expect.any(String) },
    });
  });

  it("生成ハンドラの応答から画像を配列へ正規化する", async () => {
    const product = await getProduct(toProductId("0195f0c2-0000-7000-8000-000000000002"));

    expect(Array.isArray(product.imagePaths)).toBe(true);
  });
});

describe("getProducts", () => {
  // ----- 正常系 -----
  it("契約から生成したハンドラの応答を検証して受け取る", async () => {
    const page = await getProducts({ keyword: "契約駆動" });

    expect(Array.isArray(page.items)).toBe(true);
  });

  it("生成ハンドラの応答が表示用の型を満たす", async () => {
    const [product] = (await getProducts({ keyword: "型の確認" })).items;

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

describe("getProductRanking", () => {
  // ----- 正常系 -----
  it("契約から生成したハンドラの応答を検証して受け取る", async () => {
    const rankings = await getProductRanking({ limit: 5 });

    expect(rankings.length).toBeGreaterThan(0);
  });

  it("1 件の形が契約どおりである", async () => {
    const [entry] = await getProductRanking({ limit: 5 });

    expect(entry).toMatchObject({
      productId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: expect.any(String),
      price: expect.stringMatching(/^\d+(\.\d+)?$/),
      soldQuantity: expect.any(Number),
    });
  });
});
