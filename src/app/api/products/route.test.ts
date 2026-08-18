import { beforeEach, describe, expect, it, vi } from "vitest";
import type { getProductListPage as getProductListPageType } from "@/adapters/server/api/products";
import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { toProductId } from "@/model/product/product";

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
      id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
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

  it("繰り返された分類を並びのまま取得へ渡す", async () => {
    await GET(requestFor("?categoryCodes=10&categoryCodes=20"));

    expect(getProductListPage).toHaveBeenCalledWith(
      expect.objectContaining({ categoryCodes: [10, 20] }),
    );
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

  it("接続先が応答しないとき 503 と正規化した文言を返す", async () => {
    getProductListPage.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const response = await GET(requestFor(""));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: "現在サービスを利用できません。しばらくしてから再試行してください。",
    });
  });

  it("対象が見つからないとき 404 と正規化した文言を返す", async () => {
    getProductListPage.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    const response = await GET(requestFor(""));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: "対象が見つかりません。" });
  });

  it("分類の付いていない失敗のとき 500 へ矯正する", async () => {
    getProductListPage.mockRejectedValue(new Error("想定外"));

    const response = await GET(requestFor(""));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "問題が発生しました。時間をおいて再試行してください。",
    });
  });
});
