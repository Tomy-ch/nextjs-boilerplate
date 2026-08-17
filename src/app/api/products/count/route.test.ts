import { beforeEach, describe, expect, it, vi } from "vitest";
import type { getProductCount as getProductCountType } from "@/adapters/server/api/products";
import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getProductCount } = vi.hoisted(() => ({
  getProductCount: vi.fn<typeof getProductCountType>(),
}));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductCount,
}));

import { GET } from "./route";

const CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000001";
const ANOTHER_CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000002";

function requestFor(search: string): Request {
  return new Request(`http://localhost/api/products/count${search}`);
}

beforeEach(() => {
  getProductCount.mockReset();
  getProductCount.mockResolvedValue(42);
});

describe("GET", () => {
  // ----- 正常系 -----
  it("契約を満たす条件のとき件数だけを JSON で返す", async () => {
    const response = await GET(requestFor("?keyword=%E9%9E%84"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 42 });
  });

  it("URL の条件を契約の型へ写して取得へ渡す", async () => {
    await GET(requestFor("?keyword=%E9%9E%84&minPrice=25&minQuantity=1"));

    expect(getProductCount).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "鞄", minPrice: "25", minQuantity: 1 }),
    );
  });

  it("繰り返された分類を並びのまま取得へ渡す", async () => {
    await GET(requestFor(`?categoryId=${CATEGORY_ID}&categoryId=${ANOTHER_CATEGORY_ID}`));

    expect(getProductCount).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: [CATEGORY_ID, ANOTHER_CATEGORY_ID] }),
    );
  });

  it("一致するものが無くても 0 をそのまま返す", async () => {
    getProductCount.mockResolvedValue(0);

    await expect((await GET(requestFor(""))).json()).resolves.toEqual({ count: 0 });
  });

  // ----- 異常系 -----
  it("契約を外れた条件のとき 400 と正規化した文言を返す", async () => {
    const response = await GET(requestFor("?minPrice=%E3%82%84%E3%81%99%E3%81%84"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "入力内容が正しくありません。" });
  });

  it("契約を外れた条件のとき取得へ進まない", async () => {
    await GET(requestFor("?minQuantity=-1"));

    expect(getProductCount).not.toHaveBeenCalled();
  });

  it("接続先が応答しないとき 503 と正規化した文言を返す", async () => {
    getProductCount.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const response = await GET(requestFor(""));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: "現在サービスを利用できません。しばらくしてから再試行してください。",
    });
  });

  it("分類の付かない失敗を 500 へ矯正する", async () => {
    getProductCount.mockRejectedValue(new Error("想定していない失敗"));

    expect((await GET(requestFor(""))).status).toBe(500);
  });
});
