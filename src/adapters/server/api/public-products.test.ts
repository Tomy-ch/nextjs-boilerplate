import { afterEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { serveJson } from "../../../../vitest.setup.msw";

const { getEnvironment } = vi.hoisted(() => ({
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { toProductId } from "@/model/product/product";

import { getPublicProductIds, PRODUCT_PAGE_LIMIT } from "./public-products";

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
  discontinuedAt: null,
  images: [{ imagePath: "products/abc.png", displaySort: 1 }],
  version: 1,
};

const wirePage = { products: [wireProduct], nextCursor: "next", hasNext: true };

const PRODUCTS_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/products`;

/** 投げられたエラーに付いた分類を返す。投げなければ undefined。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("getPublicProductIds", () => {
  // ----- 正常系 -----
  it("公開中の商品の ID へ写す", async () => {
    serveJson(PRODUCTS_URL, wirePage);

    const page = await getPublicProductIds();

    expect(page.items).toEqual([toProductId(wireProduct.id)]);
  });

  it("次ページのカーソルを引き継ぐ", async () => {
    serveJson(PRODUCTS_URL, wirePage);

    await expect(getPublicProductIds()).resolves.toMatchObject({ nextCursor: "next" });
  });

  it("最終ページのカーソルを null にする", async () => {
    serveJson(PRODUCTS_URL, { ...wirePage, nextCursor: null, hasNext: false });

    await expect(getPublicProductIds()).resolves.toMatchObject({ nextCursor: null });
  });

  it("1 ページの幅を契約の上限で固定する", async () => {
    const requests = serveJson(PRODUCTS_URL, wirePage);

    await getPublicProductIds();

    expect(new URL(requests[0]?.url ?? "").searchParams.get("first")).toBe(
      String(PRODUCT_PAGE_LIMIT),
    );
  });

  it("前ページの cursor を after へ載せる", async () => {
    const requests = serveJson(PRODUCTS_URL, wirePage);

    await getPublicProductIds("cursor-1");

    expect(new URL(requests[0]?.url ?? "").searchParams.get("after")).toBe("cursor-1");
  });

  it("主体を名乗らない", async () => {
    const requests = serveJson(PRODUCTS_URL, wirePage);

    await getPublicProductIds();

    expect(requests[0]?.headers.get("authorization")).toBeNull();
  });

  // ----- 異常系 -----
  it("契約に合わない応答は契約破れとして投げる", async () => {
    serveJson(PRODUCTS_URL, { unexpected: true });

    await expect(kindOf(() => getPublicProductIds())).resolves.toBe(ErrorKind.INTERNAL);
  });
});
