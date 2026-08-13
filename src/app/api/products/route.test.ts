import { beforeEach, describe, expect, it, vi } from "vitest";
import type { getProductListPage as getProductListPageType } from "@/adapters/server/api/products";

const { getProductListPage } = vi.hoisted(() => ({
  getProductListPage: vi.fn<typeof getProductListPageType>(),
}));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductListPage,
}));

import { GET } from "./route";

const page = {
  items: [
    {
      id: "0195f0c2-0000-7000-8000-000000000001",
      name: "商品",
      price: "19.99",
      quantity: 3,
      categoryName: "雑貨",
      statusName: "公開",
      imageUrl: "https://media.example.test/products/abc.png",
    },
  ],
  nextCursor: "next",
};

function requestFor(search: string): Request {
  return new Request(`http://localhost/api/products${search}`);
}

beforeEach(() => {
  getProductListPage.mockReset();
  getProductListPage.mockResolvedValue(page);
});

describe("GET", () => {
  // ----- 正常系 -----
  it("契約を満たす条件のとき取得結果をそのまま JSON で返す", async () => {
    const response = await GET(requestFor("?first=20&sort=publishedAt"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
  });

  it("URL の条件を契約の型へ写して取得へ渡す", async () => {
    await GET(requestFor("?keyword=%E6%9C%AC&first=20&sort=publishedAt"));

    expect(getProductListPage).toHaveBeenCalledWith({
      keyword: "本",
      first: 20,
      sort: "publishedAt",
    });
  });

  it("条件が無いとき契約の既定値で取得する", async () => {
    await GET(requestFor(""));

    expect(getProductListPage).toHaveBeenCalledWith({ first: 50, sort: "-publishedAt" });
  });

  // ----- 異常系 -----
  it("契約の範囲を外れた件数のとき 400 と正規化した文言を返す", async () => {
    const response = await GET(requestFor("?first=0"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "入力内容が正しくありません。" });
  });

  it("契約に無い並び順のとき取得へ進まない", async () => {
    await GET(requestFor("?sort=price"));

    expect(getProductListPage).not.toHaveBeenCalled();
  });
});
