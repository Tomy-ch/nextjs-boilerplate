import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { serveJson, serveStatus, serveWrite } from "../../../../vitest.setup";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { toProductId } from "@/model/product/product";
import {
  cancelMyPurchase,
  createPurchase,
  deliverPurchase,
  getMyPurchase,
  getMyPurchases,
  getShippablePurchases,
  getShippedPurchases,
  parsePurchaseHistoryQuery,
  payMyPurchase,
  shipPurchase,
} from "./purchases";

const wireItem = {
  code: "0195f0c2-0000-7000-8000-0000000000c1",
  firstItemName: "ワイヤレスイヤホン",
  itemCount: 2,
  totalAmount: 123_456,
  status: { id: "0195f0c2-0000-7000-8000-0000000000d1", code: 8, name: "発送済み" },
  orderedAt: "2026-08-07T00:00:00.000Z",
};

const wirePage = { items: [wireItem], nextCursor: "next", hasNext: true };

const PURCHASES_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/purchases`;
const PURCHASE_URL = `${PURCHASES_URL}/:purchaseCode`;

/** 投げられたエラーに付いた分類を返す。投げなければ undefined。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

/** 履歴の取得条件。件数と母集団だけを固定し、各ケースはそこから派生させる。 */
const HISTORY_QUERY = { first: 10, includeOtherUsers: false } as const;

describe("getMyPurchases", () => {
  // ----- 正常系 -----
  it("契約の 1 件を表示用の 5 項目へ写す", async () => {
    serveJson(PURCHASES_URL, wirePage);

    const page = await getMyPurchases(HISTORY_QUERY);

    expect(page.items[0]).toEqual({
      code: wireItem.code,
      totalAmount: 123_456,
      statusCode: 8,
      statusName: "発送済み",
      orderedAt: new Date("2026-08-07T00:00:00.000Z"),
    });
  });

  it("画面が使わないステータス ID を落とす", async () => {
    serveJson(PURCHASES_URL, wirePage);

    const page = await getMyPurchases(HISTORY_QUERY);

    expect(page.items[0]).not.toHaveProperty("statusId");
  });

  it("取得件数と母集団をクエリへ載せる", async () => {
    const requests = serveJson(PURCHASES_URL, wirePage);

    await getMyPurchases(HISTORY_QUERY);

    expect(requests[0]?.url).toBe(`${PURCHASES_URL}?first=10&includeOtherUsers=false`);
  });

  it("区間の両端をオフセット付きのままクエリへ載せる", async () => {
    const requests = serveJson(PURCHASES_URL, wirePage);

    await getMyPurchases({
      ...HISTORY_QUERY,
      orderedAfter: "2026-07-01T00:00:00+09:00",
      orderedBefore: "2026-08-01T00:00:00+09:00",
    });

    expect(new URL(requests[0]?.url ?? "").searchParams.get("orderedAfter")).toBe(
      "2026-07-01T00:00:00+09:00",
    );
    expect(new URL(requests[0]?.url ?? "").searchParams.get("orderedBefore")).toBe(
      "2026-08-01T00:00:00+09:00",
    );
  });

  it("次ページのカーソルを引き継ぐ", async () => {
    serveJson(PURCHASES_URL, wirePage);

    await expect(getMyPurchases(HISTORY_QUERY)).resolves.toMatchObject({ nextCursor: "next" });
  });

  it("最終ページのカーソルを null にする", async () => {
    serveJson(PURCHASES_URL, { ...wirePage, nextCursor: null, hasNext: false });

    await expect(getMyPurchases(HISTORY_QUERY)).resolves.toMatchObject({ nextCursor: null });
  });

  it("契約が返した降順の並びをそのまま保つ", async () => {
    serveJson(PURCHASES_URL, {
      ...wirePage,
      items: [wireItem, { ...wireItem, code: "older", orderedAt: "2026-08-01T00:00:00.000Z" }],
    });

    const page = await getMyPurchases(HISTORY_QUERY);

    expect(page.items.map(({ code }) => code)).toEqual([wireItem.code, "older"]);
  });

  it("購入が 1 件も無いとき空の一覧を返す", async () => {
    serveJson(PURCHASES_URL, { items: [], nextCursor: null, hasNext: false });

    await expect(getMyPurchases(HISTORY_QUERY)).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("認証ヘッダを付けて送る", async () => {
    const requests = serveJson(PURCHASES_URL, wirePage);

    await getMyPurchases(HISTORY_QUERY);

    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer access-token");
  });

  // ----- 異常系 -----
  it("認証できないとき取得へ出さず未認証として投げる", async () => {
    const requests = serveJson(PURCHASES_URL, wirePage);
    getAccessToken.mockResolvedValueOnce(null);

    await expect(kindOf(() => getMyPurchases(HISTORY_QUERY))).resolves.toBe(
      ErrorKind.UNAUTHENTICATED,
    );
    expect(requests).toHaveLength(0);
  });

  it("応答が契約と一致しないとき internal として投げる", async () => {
    serveJson(PURCHASES_URL, {
      items: [{ ...wireItem, totalAmount: "123456" }],
      nextCursor: null,
      hasNext: false,
    });

    await expect(kindOf(() => getMyPurchases(HISTORY_QUERY))).resolves.toBe(ErrorKind.INTERNAL);
  });
});

const wireDetail = {
  code: "0195f0c2-0000-7000-9000-0000000000b1",
  userId: "0195f0c2-0000-7000-9000-0000000000a1",
  status: { id: "0195f0c2-0000-7000-8000-0000000000d1", code: 1, name: "未処理" },
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
    serveJson(PURCHASE_URL, wireDetail);

    const purchase = await getMyPurchase(wireDetail.code);

    expect(purchase).toEqual({
      code: wireDetail.code,
      statusCode: 1,
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

  it("購入コードを経路へ載せる", async () => {
    const requests = serveJson(PURCHASE_URL, wireDetail);

    await getMyPurchase(wireDetail.code);

    expect(requests[0]?.url).toBe(`${PURCHASES_URL}/${wireDetail.code}`);
  });

  // ----- 異常系 -----
  it("契約に無い形の応答を内層へ渡さない", async () => {
    serveJson(PURCHASE_URL, { ...wireDetail, totalAmount: "21287" });

    expect(await kindOf(() => getMyPurchase(wireDetail.code))).toBe(ErrorKind.INTERNAL);
  });
});

const wireCreated = {
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
  it("成立した購入の購入コードを返す", async () => {
    serveWrite("post", PURCHASES_URL, wireCreated);

    expect(await createPurchase(orderLines, "idempotency-key")).toBe(wireCreated.code);
  });

  it("冪等キーをヘッダへ載せる", async () => {
    const requests = serveWrite("post", PURCHASES_URL, wireCreated);

    await createPurchase(orderLines, "idempotency-key");

    expect(requests[0]?.headers.get("Idempotency-Key")).toBe("idempotency-key");
  });

  it("送るのは商品と数量だけで、金額を送らない", async () => {
    const requests = serveWrite("post", PURCHASES_URL, wireCreated);

    await createPurchase(orderLines, "idempotency-key");

    await expect(requests[0]?.json()).resolves.toEqual({ details: orderLines });
  });

  // ----- 異常系 -----
  it("契約に無い形の応答を内層へ渡さない", async () => {
    serveWrite("post", PURCHASES_URL, { ...wireCreated, userId: "not-a-uuid" });

    expect(await kindOf(() => createPurchase(orderLines, "idempotency-key"))).toBe(
      ErrorKind.INTERNAL,
    );
  });
});

describe("parsePurchaseHistoryQuery", () => {
  // ----- 正常系 -----
  it("素のクエリを契約の型へ照らす", () => {
    expect(
      parsePurchaseHistoryQuery({
        first: "20",
        orderedAfter: "2026-07-01T00:00:00+09:00",
        orderedBefore: "2026-08-01T00:00:00+09:00",
      }),
    ).toEqual({
      ok: true,
      query: expect.objectContaining({
        first: 20,
        orderedAfter: "2026-07-01T00:00:00+09:00",
        orderedBefore: "2026-08-01T00:00:00+09:00",
      }),
    });
  });

  it("指定が無ければ契約の既定で埋める", () => {
    const parsed = parsePurchaseHistoryQuery({});

    expect(parsed.ok && parsed.query.includeOtherUsers).toBe(false);
  });

  it("繰り返された条件は指定なしとして落とす", () => {
    const parsed = parsePurchaseHistoryQuery({
      orderedAfter: ["2026-07-01T00:00:00+09:00", "2026-08-01T00:00:00+09:00"],
    });

    expect(parsed.ok && parsed.query.orderedAfter).toBeUndefined();
  });

  // ----- 異常系 -----
  it("範囲を外れた件数は読めなかったキーとして返す", () => {
    expect(parsePurchaseHistoryQuery({ first: "0" })).toEqual({
      ok: false,
      invalidKeys: ["first"],
    });
  });

  it("オフセットの無い時刻は読めなかったキーとして返す", () => {
    expect(parsePurchaseHistoryQuery({ orderedAfter: "2026-07-01T00:00:00" })).toEqual({
      ok: false,
      invalidKeys: ["orderedAfter"],
    });
  });

  it("読めなかったキーを重複させない", () => {
    const parsed = parsePurchaseHistoryQuery({ first: "0", orderedAfter: "きのう" });

    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.invalidKeys).toEqual(["first", "orderedAfter"]);
  });
});

const wireTransitioned = {
  code: "0195f0c2-0000-7000-9000-0000000000b1",
  userId: "0195f0c2-0000-7000-9000-0000000000a1",
  status: { id: "0195f0c2-0000-7000-8000-0000000000d1", code: 6, name: "キャンセル" },
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
  canceledAt: "2026-08-18T01:30:00.000Z",
};

describe("cancelMyPurchase", () => {
  // ----- 正常系 -----
  it("購入コードを載せた取り消しの要求を送る", async () => {
    const requests = serveWrite("patch", `${PURCHASE_URL}/cancel`, wireTransitioned);

    await cancelMyPurchase(wireTransitioned.code);

    expect(requests[0]?.url).toBe(`${PURCHASES_URL}/${wireTransitioned.code}/cancel`);
    expect(requests[0]?.method).toBe("PATCH");
  });

  // ----- 異常系 -----
  it("いまの状態では通らない要求を、競合として返す", async () => {
    serveStatus("patch", `${PURCHASE_URL}/cancel`, 409);

    expect(await kindOf(() => cancelMyPurchase(wireTransitioned.code))).toBe(ErrorKind.CONFLICT);
  });

  it("路を畳む購入コードを、送らずに落とす", async () => {
    const requests = serveWrite("patch", `${PURCHASE_URL}/cancel`, wireTransitioned);

    expect(await kindOf(() => cancelMyPurchase(".."))).toBe(ErrorKind.INVALID_ARGUMENT);
    expect(requests).toHaveLength(0);
  });

  it("契約に無い形の応答を内層へ渡さない", async () => {
    serveWrite("patch", `${PURCHASE_URL}/cancel`, { ...wireTransitioned, totalAmount: "21287" });

    expect(await kindOf(() => cancelMyPurchase(wireTransitioned.code))).toBe(ErrorKind.INTERNAL);
  });

  it("再送しない", async () => {
    const requests = serveStatus("patch", `${PURCHASE_URL}/cancel`, 503);

    await kindOf(() => cancelMyPurchase(wireTransitioned.code));

    expect(requests).toHaveLength(1);
  });
});

const wirePaid = {
  ...wireTransitioned,
  status: { id: "0195f0c2-0000-7000-8000-0000000000d2", code: 7, name: "支払い済み" },
  canceledAt: undefined,
  paidAt: "2026-08-18T01:30:00.000Z",
};

describe("payMyPurchase", () => {
  // ----- 正常系 -----
  it("購入コードを載せた支払いの要求を送る", async () => {
    const requests = serveWrite("patch", `${PURCHASE_URL}/pay`, wirePaid);

    await payMyPurchase(wirePaid.code);

    expect(requests[0]?.url).toBe(`${PURCHASES_URL}/${wirePaid.code}/pay`);
    expect(requests[0]?.method).toBe("PATCH");
  });

  // ----- 異常系 -----
  it("いまの状態では通らない要求を、競合として返す", async () => {
    serveStatus("patch", `${PURCHASE_URL}/pay`, 409);

    expect(await kindOf(() => payMyPurchase(wirePaid.code))).toBe(ErrorKind.CONFLICT);
  });

  it("契約に無い形の応答を内層へ渡さない", async () => {
    serveWrite("patch", `${PURCHASE_URL}/pay`, { ...wirePaid, totalAmount: "21287" });

    expect(await kindOf(() => payMyPurchase(wirePaid.code))).toBe(ErrorKind.INTERNAL);
  });
});

const SHIPPABLE_URL = `${PURCHASES_URL}/shippable`;

const wireShippable = {
  groups: [
    {
      userId: "0195f0c2-0000-7000-9000-0000000000a1",
      purchases: [
        {
          code: "0195f0c2-0000-7000-9000-000000000001",
          totalAmount: 21_287,
          orderedAt: "2026-08-15T01:30:00.000Z",
        },
        {
          code: "0195f0c2-0000-7000-9000-000000000002",
          totalAmount: 4_398,
          orderedAt: "2026-08-16T12:05:00.000Z",
        },
      ],
    },
  ],
};

describe("getShippablePurchases", () => {
  // ----- 正常系 -----
  it("契約の組を表示用の便へ写す", async () => {
    serveJson(SHIPPABLE_URL, wireShippable);

    const groups = await getShippablePurchases();

    expect(groups).toEqual([
      {
        userId: "0195f0c2-0000-7000-9000-0000000000a1",
        purchases: [
          {
            code: "0195f0c2-0000-7000-9000-000000000001",
            totalAmount: 21_287,
            orderedAt: new Date("2026-08-15T01:30:00.000Z"),
          },
          {
            code: "0195f0c2-0000-7000-9000-000000000002",
            totalAmount: 4_398,
            orderedAt: new Date("2026-08-16T12:05:00.000Z"),
          },
        ],
      },
    ]);
  });

  it("契約が返した並びをそのまま保つ", async () => {
    serveJson(SHIPPABLE_URL, wireShippable);

    const groups = await getShippablePurchases();

    expect(groups[0]?.purchases.map(({ code }) => code)).toEqual([
      "0195f0c2-0000-7000-9000-000000000001",
      "0195f0c2-0000-7000-9000-000000000002",
    ]);
  });

  it("発送待ちが無いときは空の並びを返す", async () => {
    serveJson(SHIPPABLE_URL, { groups: [] });

    await expect(getShippablePurchases()).resolves.toEqual([]);
  });

  // ----- 異常系 -----
  it("契約に無い形の応答を内層へ渡さない", async () => {
    serveJson(SHIPPABLE_URL, { groups: [{ userId: "not-a-uuid", purchases: [] }] });

    expect(await kindOf(() => getShippablePurchases())).toBe(ErrorKind.INTERNAL);
  });

  it("役割が足りない要求を、権限なしとして返す", async () => {
    serveStatus("get", SHIPPABLE_URL, 403);

    expect(await kindOf(() => getShippablePurchases())).toBe(ErrorKind.PERMISSION_DENIED);
  });
});

describe("shipPurchase", () => {
  // ----- 正常系 -----
  it("購入コードを載せた発送の要求を送る", async () => {
    const requests = serveWrite("patch", `${PURCHASE_URL}/ship`, {
      ...wireTransitioned,
      status: { id: "0195f0c2-0000-7000-8000-0000000000d3", code: 8, name: "発送済み" },
      canceledAt: undefined,
      shippedAt: "2026-08-18T01:30:00.000Z",
    });

    await shipPurchase(wireTransitioned.code);

    expect(requests[0]?.url).toBe(`${PURCHASES_URL}/${wireTransitioned.code}/ship`);
    expect(requests[0]?.method).toBe("PATCH");
  });

  // ----- 異常系 -----
  it("いまの状態では通らない要求を、競合として返す", async () => {
    serveStatus("patch", `${PURCHASE_URL}/ship`, 409);

    expect(await kindOf(() => shipPurchase(wireTransitioned.code))).toBe(ErrorKind.CONFLICT);
  });

  it("役割が足りない要求を、権限なしとして返す", async () => {
    serveStatus("patch", `${PURCHASE_URL}/ship`, 403);

    expect(await kindOf(() => shipPurchase(wireTransitioned.code))).toBe(
      ErrorKind.PERMISSION_DENIED,
    );
  });
});

describe("getShippedPurchases", () => {
  // ----- 正常系 -----
  it("発送済みだけを、他の利用者の購入も含めて求める", async () => {
    const requests = serveJson(PURCHASES_URL, wirePage);

    await getShippedPurchases(50);

    const query = new URL(requests[0]?.url ?? "").searchParams;

    expect(query.get("statusCodes")).toBe("8");
    expect(query.get("includeOtherUsers")).toBe("true");
    expect(query.get("first")).toBe("50");
  });

  it("契約の 1 件を表示用の項目へ写す", async () => {
    serveJson(PURCHASES_URL, wirePage);

    await expect(getShippedPurchases(50)).resolves.toEqual([
      {
        code: wireItem.code,
        totalAmount: 123_456,
        statusCode: 8,
        statusName: "発送済み",
        orderedAt: new Date("2026-08-07T00:00:00.000Z"),
      },
    ]);
  });

  it("配達を待っている注文が無いとき空の並びを返す", async () => {
    serveJson(PURCHASES_URL, { items: [], nextCursor: null, hasNext: false });

    await expect(getShippedPurchases(50)).resolves.toEqual([]);
  });

  // ----- 異常系 -----
  it("役割が足りない要求を、権限なしとして返す", async () => {
    serveStatus("get", PURCHASES_URL, 403);

    expect(await kindOf(() => getShippedPurchases(50))).toBe(ErrorKind.PERMISSION_DENIED);
  });
});

describe("deliverPurchase", () => {
  // ----- 正常系 -----
  it("購入コードを載せた配達確認の要求を送る", async () => {
    const requests = serveWrite("patch", `${PURCHASE_URL}/deliver`, {
      ...wireTransitioned,
      status: { id: "0195f0c2-0000-7000-8000-0000000000d4", code: 9, name: "配達済み" },
      canceledAt: undefined,
      shippedAt: "2026-08-18T01:30:00.000Z",
      deliveredAt: "2026-08-20T01:30:00.000Z",
    });

    await deliverPurchase(wireTransitioned.code);

    expect(requests[0]?.url).toBe(`${PURCHASES_URL}/${wireTransitioned.code}/deliver`);
    expect(requests[0]?.method).toBe("PATCH");
  });

  // ----- 異常系 -----
  it("いまの状態では通らない要求を、競合として返す", async () => {
    serveStatus("patch", `${PURCHASE_URL}/deliver`, 409);

    expect(await kindOf(() => deliverPurchase(wireTransitioned.code))).toBe(ErrorKind.CONFLICT);
  });

  it("役割が足りない要求を、権限なしとして返す", async () => {
    serveStatus("patch", `${PURCHASE_URL}/deliver`, 403);

    expect(await kindOf(() => deliverPurchase(wireTransitioned.code))).toBe(
      ErrorKind.PERMISSION_DENIED,
    );
  });
});
