import type { Mock } from "vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { toProductId } from "@/model/product/product";
import {
  createPurchase,
  getMyPurchase,
  getMyPurchases,
  parsePurchaseHistoryQuery,
} from "./purchases";

const wireItem = {
  code: "0195f0c2-0000-7000-8000-0000000000c1",
  totalAmount: 123_456,
  status: { id: "0195f0c2-0000-7000-8000-0000000000d1", name: "発送済み" },
  orderedAt: "2026-08-07T00:00:00.000Z",
};

const wirePage = { items: [wireItem], nextCursor: "next", hasNext: true };

function stubFetch(body: unknown): Mock<typeof fetch> {
  const fetchImpl = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(body), { status: 200 }),
  );

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

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
  vi.unstubAllGlobals();
});

/** 履歴の取得条件。件数と区分だけを固定し、各ケースはそこから派生させる。 */
const HISTORY_QUERY = { first: 10, period: "all" } as const;

describe("getMyPurchases", () => {
  // ----- 正常系 -----
  it("契約の 1 件を表示用の 4 項目へ写す", async () => {
    stubFetch(wirePage);

    const page = await getMyPurchases(HISTORY_QUERY);

    expect(page.items[0]).toEqual({
      code: wireItem.code,
      totalAmount: 123_456,
      statusName: "発送済み",
      orderedAt: new Date("2026-08-07T00:00:00.000Z"),
    });
  });

  it("画面が使わないステータス ID を落とす", async () => {
    stubFetch(wirePage);

    const page = await getMyPurchases(HISTORY_QUERY);

    expect(page.items[0]).not.toHaveProperty("statusId");
  });

  it("取得件数の上限と期間の区分をクエリへ載せる", async () => {
    const fetchImpl = stubFetch(wirePage);

    await getMyPurchases(HISTORY_QUERY);

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/v1/purchases?first=10&period=all",
    );
  });

  it("次ページのカーソルを引き継ぐ", async () => {
    stubFetch(wirePage);

    await expect(getMyPurchases(HISTORY_QUERY)).resolves.toMatchObject({ nextCursor: "next" });
  });

  it("最終ページのカーソルを null にする", async () => {
    stubFetch({ ...wirePage, nextCursor: null, hasNext: false });

    await expect(getMyPurchases(HISTORY_QUERY)).resolves.toMatchObject({ nextCursor: null });
  });

  it("契約が返した降順の並びをそのまま保つ", async () => {
    stubFetch({
      ...wirePage,
      items: [wireItem, { ...wireItem, code: "older", orderedAt: "2026-08-01T00:00:00.000Z" }],
    });

    const page = await getMyPurchases(HISTORY_QUERY);

    expect(page.items.map(({ code }) => code)).toEqual([wireItem.code, "older"]);
  });

  it("購入が 1 件も無いとき空の一覧を返す", async () => {
    stubFetch({ items: [], nextCursor: null, hasNext: false });

    await expect(getMyPurchases(HISTORY_QUERY)).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("認証ヘッダを付けて送る", async () => {
    const fetchImpl = stubFetch(wirePage);

    await getMyPurchases(HISTORY_QUERY);

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer access-token" },
    });
  });

  // ----- 異常系 -----
  it("認証できないとき取得へ出さず未認証として投げる", async () => {
    const fetchImpl = stubFetch(wirePage);
    getAccessToken.mockResolvedValueOnce(null);

    await expect(kindOf(() => getMyPurchases(HISTORY_QUERY))).resolves.toBe(
      ErrorKind.UNAUTHENTICATED,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("応答が契約と一致しないとき internal として投げる", async () => {
    stubFetch({
      items: [{ ...wireItem, totalAmount: "123456" }],
      nextCursor: null,
      hasNext: false,
    });

    await expect(kindOf(() => getMyPurchases(HISTORY_QUERY))).resolves.toBe(ErrorKind.INTERNAL);
  });
});

const wireDetail = {
  id: "0195f0c2-0000-7000-9000-000000000001",
  code: "0195f0c2-0000-7000-9000-0000000000b1",
  userId: "0195f0c2-0000-7000-9000-0000000000a1",
  status: { id: "0195f0c2-0000-7000-8000-0000000000d1", name: "未処理" },
  subtotalAmount: 18_897,
  taxAmount: 1_890,
  shippingFee: 500,
  totalAmount: 21_287,
  details: [
    {
      productId: toProductId("0195f0c2-0000-7000-8000-000000000001"),
      productName: "ワイヤレスイヤホン",
      quantity: 3,
      unitPrice: "19.99",
    },
  ],
  orderedAt: "2026-08-17T01:30:00.000Z",
  paidAt: null,
  canceledAt: null,
};

describe("getMyPurchase", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用の購入へ写す", async () => {
    stubFetch(wireDetail);

    const purchase = await getMyPurchase(wireDetail.id);

    expect(purchase).toEqual({
      id: wireDetail.id,
      code: wireDetail.code,
      statusName: "未処理",
      subtotalAmount: 18_897,
      taxAmount: 1_890,
      shippingFee: 500,
      totalAmount: 21_287,
      lines: [
        {
          productId: wireDetail.details[0]?.productId,
          productName: "ワイヤレスイヤホン",
          quantity: 3,
          unitPrice: "19.99",
        },
      ],
      orderedAt: new Date("2026-08-17T01:30:00.000Z"),
    });
  });

  it("購入の ID を経路へ載せる", async () => {
    const fetchImpl = stubFetch(wireDetail);

    await getMyPurchase(wireDetail.id);

    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(`/v1/purchases/${wireDetail.id}`);
  });

  // ----- 異常系 -----
  it("契約に無い形の応答を内層へ渡さない", async () => {
    stubFetch({ ...wireDetail, totalAmount: "21287" });

    expect(await kindOf(() => getMyPurchase(wireDetail.id))).toBe(ErrorKind.INTERNAL);
  });
});

const wireCreated = {
  id: "0195f0c2-0000-7000-9000-000000000002",
  code: "0195f0c2-0000-7000-9000-0000000000b2",
  userId: "0195f0c2-0000-7000-9000-0000000000a1",
  statusId: "0195f0c2-0000-7000-8000-0000000000d1",
  subtotalAmount: 18_897,
  taxAmount: 1_890,
  shippingFee: 500,
  totalAmount: 21_287,
  details: [
    {
      productId: toProductId("0195f0c2-0000-7000-8000-000000000001"),
      quantity: 3,
      unitPrice: "19.99",
    },
  ],
  orderedAt: "2026-08-17T01:30:00.000Z",
  referenceAmount: null,
};

const orderLines = [
  { productId: toProductId("0195f0c2-0000-7000-8000-000000000001"), quantity: 3 },
];

describe("createPurchase", () => {
  // ----- 正常系 -----
  it("成立した購入の ID を返す", async () => {
    stubFetch(wireCreated);

    expect(await createPurchase(orderLines, "idempotency-key")).toBe(wireCreated.id);
  });

  it("冪等キーをヘッダへ載せる", async () => {
    const fetchImpl = stubFetch(wireCreated);

    await createPurchase(orderLines, "idempotency-key");

    const init = fetchImpl.mock.calls[0]?.[1];

    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("idempotency-key");
  });

  it("送るのは商品と数量だけで、金額を送らない", async () => {
    const fetchImpl = stubFetch(wireCreated);

    await createPurchase(orderLines, "idempotency-key");

    const init = fetchImpl.mock.calls[0]?.[1];

    expect(JSON.parse(String(init?.body))).toEqual({ details: orderLines });
  });

  // ----- 異常系 -----
  it("契約に無い形の応答を内層へ渡さない", async () => {
    stubFetch({ ...wireCreated, id: "not-a-uuid" });

    expect(await kindOf(() => createPurchase(orderLines, "idempotency-key"))).toBe(
      ErrorKind.INTERNAL,
    );
  });
});

describe("parsePurchaseHistoryQuery", () => {
  // ----- 正常系 -----
  it("素のクエリを契約の型へ照らす", () => {
    expect(parsePurchaseHistoryQuery({ first: "20", period: "recent", days: "30" })).toEqual({
      ok: true,
      query: expect.objectContaining({ first: 20, period: "recent", days: 30 }),
    });
  });

  it("指定が無ければ契約の既定で埋める", () => {
    const parsed = parsePurchaseHistoryQuery({});

    expect(parsed.ok && parsed.query.period).toBe("all");
  });

  it("繰り返された条件は指定なしとして落とす", () => {
    const parsed = parsePurchaseHistoryQuery({ month: ["2026-07", "2026-08"] });

    expect(parsed.ok && parsed.query.month).toBeUndefined();
  });

  // ----- 異常系 -----
  it("範囲を外れた件数は読めなかったキーとして返す", () => {
    expect(parsePurchaseHistoryQuery({ first: "0" })).toEqual({
      ok: false,
      invalidKeys: ["first"],
    });
  });

  it("知らない区分も読めなかったキーとして返す", () => {
    expect(parsePurchaseHistoryQuery({ period: "yesterday" })).toEqual({
      ok: false,
      invalidKeys: ["period"],
    });
  });

  it("読めなかったキーを重複させない", () => {
    const parsed = parsePurchaseHistoryQuery({ first: "0", period: "yesterday" });

    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.invalidKeys).toEqual(["first", "period"]);
  });
});
