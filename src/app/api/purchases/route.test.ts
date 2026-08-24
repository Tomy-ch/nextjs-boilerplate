import { beforeEach, describe, expect, it, vi } from "vitest";

import type { getMyPurchases as getMyPurchasesType } from "@/adapters/server/api/purchases";
import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getMyPurchases } = vi.hoisted(() => ({
  getMyPurchases: vi.fn<typeof getMyPurchasesType>(),
}));

vi.mock("@/adapters/server/api/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/purchases")>()),
  getMyPurchases,
}));

import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

import { GET } from "./route";

const page = {
  items: [
    {
      code: "0195f0c2-0000-7000-9000-000000000001",
      totalAmount: 21_287,
      statusCode: PURCHASE_STATUS.UNPROCESSED,
      statusName: "未処理",
      orderedAt: new Date("2026-08-17T10:30:00+09:00"),
    },
  ],
  nextCursor: "next",
};

function request(query: string): Request {
  return new Request(`https://app.example.test/api/purchases?${query}`);
}

beforeEach(() => {
  getMyPurchases.mockReset().mockResolvedValue(page);
});

describe("GET", () => {
  // ----- 正常系 -----
  it("取得した 1 ページをそのまま返す", async () => {
    const response = await GET(request("first=20&period=all"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ nextCursor: "next" });
  });

  it("読み取った条件を取得口へ渡す", async () => {
    await GET(request("first=20&period=recent&days=30&after=cursor"));

    expect(getMyPurchases).toHaveBeenCalledWith(
      expect.objectContaining({ first: 20, period: "recent", days: 30, after: "cursor" }),
    );
  });

  // ----- 異常系 -----
  it("契約の範囲を外れた条件は取得を始めずに拒む", async () => {
    const response = await GET(request("first=0&period=all"));

    expect(response.status).toBe(400);
    expect(getMyPurchases).not.toHaveBeenCalled();
  });

  it("知らない区分も取得を始めずに拒む", async () => {
    const response = await GET(request("period=yesterday"));

    expect(response.status).toBe(400);
    expect(getMyPurchases).not.toHaveBeenCalled();
  });

  it("資格情報が無い取得は、そのまま認証の必要として返す", async () => {
    getMyPurchases.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    expect((await GET(request("first=20&period=all"))).status).toBe(401);
  });

  it("分類の付いていない失敗は internal へ矯正する", async () => {
    getMyPurchases.mockRejectedValue(new Error("想定外"));

    expect((await GET(request("first=20&period=all"))).status).toBe(500);
  });

  it("内側の事情を応答の本文へ出さない", async () => {
    getMyPurchases.mockRejectedValue(new Error("接続文字列が不正です"));

    await expect((await GET(request("first=20&period=all"))).json()).resolves.not.toMatchObject({
      message: expect.stringContaining("接続文字列"),
    });
  });
});
