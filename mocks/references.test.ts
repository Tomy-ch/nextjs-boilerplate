import { describe, expect, it } from "vitest";

import { REFERENCE_PATCHES } from "./references";
import type { DrawFromEndpoint } from "./stable-responses";

// 実物と同じく、題材が名乗る分類の綴りをすべて含む。含まない一覧は「マスタに無い」側の検査で使う。
const CATEGORIES = [
  { id: "category-1", name: "家電" },
  { id: "category-2", name: "食品" },
  { id: "category-3", name: "衣類" },
  { id: "category-4", name: "書籍" },
  { id: "category-5", name: "日用品" },
];

const STATUSES = [
  { id: "status-1", name: "状態 1" },
  { id: "status-2", name: "状態 2" },
];

const PURCHASE_STATUSES = [
  { id: "purchase-status-1", code: 1, name: "未処理" },
  { id: "purchase-status-2", code: 2, name: "受付中" },
  { id: "purchase-status-3", code: 3, name: "確認中" },
];

/** マスタの口を引く相手。実物と同じく、名前で応答を返す。 */
const draw: DrawFromEndpoint = (name) => {
  if (name === "getGetProductCategoriesResponseMock") {
    return CATEGORIES;
  }

  if (name === "getGetProductStatusesResponseMock") {
    return STATUSES;
  }

  if (name === "getGetPurchaseStatusesResponseMock") {
    return PURCHASE_STATUSES;
  }

  if (name === "getGetCartsMeResponseMock") {
    return { items: [], subtotalAmount: 1_000 };
  }

  throw new Error(`知らない口です: ${name}`);
};

/** 契約から生成した商品 1 件のうち、参照の項目だけを持つ形。 */
function product(id: string) {
  return {
    id,
    name: "生成された商品名",
    category: { id: "生成された分類の識別子", name: "生成された分類" },
    status: { id: "生成された状態の識別子", name: "生成された状態" },
  };
}

/** 契約から生成した購入 1 件のうち、参照の項目だけを持つ形。 */
function purchase(code: string) {
  return {
    code,
    status: { id: "生成された状態の識別子", code: 1_234_567, name: "生成された状態" },
  };
}

/** 表から 1 件の差し替えを引く。宣言が消えていれば落ちる。 */
function patchOf(name: string) {
  const patch = REFERENCE_PATCHES.get(name);

  if (patch === undefined) {
    throw new Error(`表に宣言がありません: ${name}`);
  }

  return patch;
}

const CATEGORY_NAMES = CATEGORIES.map((category) => category.name);

/** 契約から生成した候補 1 件のうち、揃える項目だけを持つ形。 */
function candidate(id: string) {
  return {
    coupon: {
      id,
      discount: { kind: "rate", value: "生成された率", maxAmount: 1_234_567 },
      scope: { kind: "product", targetId: "生成された商品の識別子" },
      expiresAt: "2025-01-01T00:00:00Z",
      usedAt: "2025-01-01T00:00:00Z",
      usableFrom: "2099-01-01T00:00:00Z",
      minPurchaseAmount: 1_234_567,
    },
    discountAmount: 1_234_567_890_123_456,
  };
}

const patchedCartCoupons = patchOf("getGetCartsMeCouponsResponseMock")(
  { coupons: Array.from({ length: 10 }, (_, index) => candidate(`coupon-${index}`)) },
  draw,
) as {
  coupons: readonly {
    coupon: {
      discount: unknown;
      scope: { kind: string; targetId: string | null };
      expiresAt: string;
      usedAt: unknown;
      usableFrom: unknown;
      minPurchaseAmount: unknown;
    };
    discountAmount: number;
  }[];
};

describe("REFERENCE_PATCHES", () => {
  // ----- 正常系 -----
  it("商品 1 件の分類と状態を、マスタの一覧に在るものへ揃える", () => {
    const patched = patchOf("getGetProductsDetailResponseMock")(product("p1"), draw) as {
      category: { id: string };
      status: { id: string };
    };

    expect(CATEGORIES.map((category) => category.id)).toContain(patched.category.id);
    expect(STATUSES.map((status) => status.id)).toContain(patched.status.id);
  });

  it("商品名と分類を噛み合う組にする", () => {
    const patched = patchOf("getGetProductsDetailResponseMock")(product("p1"), draw) as {
      name: string;
      category: { name: string };
    };

    // 名前は題材から採るので、生成器が入れた値は残らない。
    expect(patched.name).not.toBe("生成された商品名");
    expect(CATEGORY_NAMES).toContain(patched.category.name);
  });

  it("参照の項目以外はそのまま残す", () => {
    const patched = patchOf("getGetProductsDetailResponseMock")(
      { ...product("p1"), price: "19.99" },
      draw,
    ) as { price: string };

    expect(patched.price).toBe("19.99");
  });

  it("同じ商品には同じ分類を選ぶ", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");
    const first = patch(product("p1"), draw) as { category: { id: string } };
    const second = patch(product("p1"), draw) as { category: { id: string } };

    expect(first.category.id).toBe(second.category.id);
  });

  it("一覧の応答は商品ごとに揃える", () => {
    const patched = patchOf("getGetProductsResponseMock")(
      { products: [product("p1"), product("p2")], nextCursor: "next" },
      draw,
    ) as { products: readonly { category: { id: string } }[]; nextCursor: string };

    for (const entry of patched.products) {
      expect(CATEGORIES.map((category) => category.id)).toContain(entry.category.id);
    }

    expect(patched.nextCursor).toBe("next");
  });

  it("在庫僅少の一覧も商品ごとに揃える", () => {
    const patched = patchOf("getGetProductsLowStockResponseMock")(
      { products: [product("p1"), product("p2")] },
      draw,
    ) as { products: readonly { status: { id: string } }[] };

    for (const entry of patched.products) {
      expect(STATUSES.map((status) => status.id)).toContain(entry.status.id);
    }
  });

  it("書き込みの応答も同じ形で揃える", () => {
    for (const name of [
      "getPostProductsResponseMock",
      "getPatchProductsDetailResponseMock",
      "getPatchProductsStockResponseMock",
    ]) {
      const patched = patchOf(name)(product("p1"), draw) as { category: { id: string } };

      expect(CATEGORIES.map((category) => category.id)).toContain(patched.category.id);
    }
  });

  it("ランキングの商品名を題材の名前へ揃える", () => {
    for (const name of [
      "getGetProductsRankingQuantityResponseMock",
      "getGetProductsRankingAmountResponseMock",
    ]) {
      const patched = patchOf(name)(
        { rankings: [{ productId: "p1", name: "生成された商品名", soldQuantity: 3 }] },
        draw,
      ) as { rankings: readonly { name: string; soldQuantity: number }[] };

      expect(patched.rankings[0]?.name).not.toBe("生成された商品名");
      expect(patched.rankings[0]?.soldQuantity).toBe(3);
    }
  });

  it("購入のステータスを、業務キーを持つ組へ揃える", () => {
    const patched = patchOf("getGetPurchasesDetailResponseMock")(purchase("c1"), draw) as {
      status: { code: number };
    };

    expect(PURCHASE_STATUSES.map((status) => status.code)).toContain(patched.status.code);
  });

  it("購入の明細が名乗る商品名を題材の名前へ揃える", () => {
    const patched = patchOf("getGetPurchasesDetailResponseMock")(
      {
        ...purchase("c1"),
        details: [{ productId: "p1", productName: "生成された商品名", quantity: 2 }],
      },
      draw,
    ) as { details: readonly { productName: string; quantity: number }[] };

    expect(patched.details[0]?.productName).not.toBe("生成された商品名");
    expect(patched.details[0]?.quantity).toBe(2);
  });

  it("値引き額と適用したクーポンを、値引きが立つときだけクーポンが入る組へ揃える", () => {
    const codes = Array.from({ length: 12 }, (_, index) => `c${index}`);
    const patched = codes.map(
      (code) =>
        patchOf("getGetPurchasesDetailResponseMock")(
          {
            ...purchase(code),
            subtotalAmount: 1_000,
            discountAmount: 1_234_567_890_123_456,
            appliedCoupon: null,
          },
          draw,
        ) as { discountAmount: number; appliedCoupon: unknown },
    );

    for (const entry of patched) {
      expect(entry.discountAmount > 0).toBe(entry.appliedCoupon !== null);
      // 小計 $10.00 に対して、なし / 定額 $5.00 / 上限 $1.00 の 10% / 15% の切り捨て。
      expect([0, 500, 100, 150]).toContain(entry.discountAmount);
    }

    expect(new Set(patched.map((entry) => entry.appliedCoupon === null)).size).toBe(2);
  });

  it("範囲を分類で絞るクーポンは、分類マスタに在る分類を指す", () => {
    const scopes = Array.from(
      { length: 12 },
      (_, index) =>
        (
          patchOf("getGetPurchasesDetailResponseMock")(
            {
              ...purchase(`c${index}`),
              subtotalAmount: 1_000,
              discountAmount: 0,
              appliedCoupon: null,
            },
            draw,
          ) as { appliedCoupon: { scope: { kind: string; targetId: string | null } } | null }
        ).appliedCoupon?.scope,
    );
    const categoryScopes = scopes.filter((scope) => scope?.kind === "category");

    expect(categoryScopes.length).toBeGreaterThan(0);
    for (const scope of categoryScopes) {
      expect(CATEGORIES.map((category) => category.id)).toContain(scope?.targetId);
    }
  });

  it("明細を持たない応答には明細を足さない", () => {
    const patched = patchOf("getPatchPurchasesPayResponseMock")(purchase("c1"), draw) as Record<
      string,
      unknown
    >;

    expect("details" in patched).toBe(false);
  });

  it("値引きを持たない応答には値引きもクーポンも足さない", () => {
    const patched = patchOf("getPatchPurchasesPayResponseMock")(purchase("c1"), draw) as Record<
      string,
      unknown
    >;

    expect("discountAmount" in patched).toBe(false);
    expect("appliedCoupon" in patched).toBe(false);
  });

  it("購入一覧は行ごとにステータスと代表商品名を揃える", () => {
    const patched = patchOf("getGetPurchasesResponseMock")(
      { items: [purchase("c1"), purchase("c2")], nextCursor: null },
      draw,
    ) as { items: readonly { status: { code: number }; firstItemName: string }[] };

    for (const entry of patched.items) {
      expect(PURCHASE_STATUSES.map((status) => status.code)).toContain(entry.status.code);
      expect(entry.firstItemName.length).toBeGreaterThan(0);
    }
  });

  it("ステータス別の内訳は同じステータスを 2 度出さない", () => {
    const patched = patchOf("getGetDashboardSummaryResponseMock")(
      { purchaseStatusCounts: [{ count: 1 }, { count: 2 }, { count: 3 }], salesCount: 6 },
      draw,
    ) as { purchaseStatusCounts: readonly { status: { code: number }; count: number }[] };

    const codes = patched.purchaseStatusCounts.map((entry) => entry.status.code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(patched.purchaseStatusCounts.map((entry) => entry.count)).toEqual([1, 2, 3]);
  });

  it("ステータスの数を超える内訳の行は落とす", () => {
    const patched = patchOf("getGetDashboardSummaryResponseMock")(
      { purchaseStatusCounts: Array.from({ length: 12 }, (_, index) => ({ count: index })) },
      draw,
    ) as { purchaseStatusCounts: readonly { status: { code: number } }[] };

    const codes = patched.purchaseStatusCounts.map((entry) => entry.status.code);

    expect(codes).toHaveLength(PURCHASE_STATUSES.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("購入の集計の内訳も同じ形で揃える", () => {
    const patched = patchOf("getGetUsersMePurchasesSummaryResponseMock")(
      { statusBreakdown: [{ count: 1 }, { count: 2 }], totalCount: 3 },
      draw,
    ) as { statusBreakdown: readonly { status: { code: number } }[] };

    const codes = patched.statusBreakdown.map((entry) => entry.status.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  // ----- 異常系 -----
  it("小計を持たない購入詳細は値引きを揃えられないので落ちる", () => {
    expect(() =>
      patchOf("getGetPurchasesDetailResponseMock")(
        { ...purchase("c1"), discountAmount: 0, appliedCoupon: null },
        draw,
      ),
    ).toThrow("購入の応答が小計を持ちません");
  });

  it("マスタの応答が一覧でなければ落ちる", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(() => patch(product("p1"), () => ({ unexpected: true }))).toThrow("一覧ではありません");
  });

  it("マスタの一覧が空なら落ちる", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(() =>
      patch(product("p1"), (name) =>
        name === "getGetProductStatusesResponseMock" ? [] : CATEGORIES,
      ),
    ).toThrow("空です");
  });

  it("題材が名乗る分類がマスタに無ければ落ちる", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(() =>
      patch(product("p1"), (name) =>
        name === "getGetProductStatusesResponseMock" ? STATUSES : [{ id: "c", name: "雑貨" }],
      ),
    ).toThrow("分類マスタに");
  });

  it("商品の応答が object でなければ落ちる", () => {
    expect(() => patchOf("getGetProductsDetailResponseMock")(null, draw)).toThrow(
      "object ではありません",
    );
  });

  it("参照の項目が契約から消えていれば落ちる", () => {
    expect(() =>
      patchOf("getGetProductsDetailResponseMock")({ id: "p1", name: "商品" }, draw),
    ).toThrow("分類または状態を持ちません");
  });

  it("購入の応答からステータスが消えていれば落ちる", () => {
    expect(() => patchOf("getGetPurchasesDetailResponseMock")({ code: "c1" }, draw)).toThrow(
      "ステータスを持ちません",
    );
  });

  it("一覧の応答が object でなければ落ちる", () => {
    expect(() => patchOf("getGetProductsResponseMock")(null, draw)).toThrow(
      "object ではありません",
    );
  });

  it("一覧の応答が商品の配列を持たなければ落ちる", () => {
    expect(() => patchOf("getGetProductsResponseMock")({ nextCursor: null }, draw)).toThrow(
      "配列を持ちません",
    );
  });

  it("ランキングの応答が配列を持たなければ落ちる", () => {
    expect(() => patchOf("getGetProductsRankingAmountResponseMock")({}, draw)).toThrow(
      "配列を持ちません",
    );
  });

  it("内訳の応答が配列を持たなければ落ちる", () => {
    expect(() => patchOf("getGetDashboardSummaryResponseMock")({}, draw)).toThrow(
      "配列を持ちません",
    );
  });

  it("カートに使えるクーポンを、値引きの立つ組だけで、額面の重ならない候補として並べる", () => {
    // 小計 $10.00 に対して、定額 $5.00 / 上限 $1.00 の 10% / 15% の切り捨て。
    const { coupons } = patchedCartCoupons;

    expect(coupons.map((entry) => entry.discountAmount)).toEqual([500, 100, 150]);
    expect(new Set(coupons.map((entry) => JSON.stringify(entry.coupon.discount))).size).toBe(
      coupons.length,
    );
  });

  it("カートに使えるクーポンを、いま使える未使用のクーポンにする", () => {
    for (const { coupon } of patchedCartCoupons.coupons) {
      expect(Date.parse(coupon.expiresAt)).toBeGreaterThan(Date.parse("2026-01-01T00:00:00Z"));
      expect(coupon.usedAt).toBeNull();
      expect(coupon.usableFrom).toBeNull();
      expect(coupon.minPurchaseAmount).toBeNull();
    }
  });

  it("カートに使えるクーポンのうち範囲を分類で絞るものは、分類マスタに在る分類を指す", () => {
    const categoryScopes = patchedCartCoupons.coupons
      .map((entry) => entry.coupon.scope)
      .filter((scope) => scope.kind === "category");

    expect(categoryScopes.length).toBeGreaterThan(0);
    for (const scope of categoryScopes) {
      expect(CATEGORIES.map((category) => category.id)).toContain(scope.targetId);
    }
  });
});
