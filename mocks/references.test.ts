import { describe, expect, it } from "vitest";

import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";
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

/** マスタの口を引く相手。実物と同じく、名前で応答を返す。 */
const draw: DrawFromEndpoint = (name) => {
  if (name === "getGetProductCategoriesResponseMock") {
    return CATEGORIES;
  }

  if (name === "getGetProductStatusesResponseMock") {
    return STATUSES;
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

    expect(Object.values(PURCHASE_STATUS)).toContain(patched.status.code);
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

  it("明細を持たない応答には明細を足さない", () => {
    const patched = patchOf("getPatchPurchasesPayResponseMock")(purchase("c1"), draw) as Record<
      string,
      unknown
    >;

    expect("details" in patched).toBe(false);
  });

  it("購入一覧は行ごとにステータスと代表商品名を揃える", () => {
    const patched = patchOf("getGetPurchasesResponseMock")(
      { items: [purchase("c1"), purchase("c2")], nextCursor: null },
      draw,
    ) as { items: readonly { status: { code: number }; firstItemName: string }[] };

    for (const entry of patched.items) {
      expect(Object.values(PURCHASE_STATUS)).toContain(entry.status.code);
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

  it("購入の集計の内訳も同じ形で揃える", () => {
    const patched = patchOf("getGetUsersMePurchasesSummaryResponseMock")(
      { statusBreakdown: [{ count: 1 }, { count: 2 }], totalCount: 3 },
      draw,
    ) as { statusBreakdown: readonly { status: { code: number } }[] };

    const codes = patched.statusBreakdown.map((entry) => entry.status.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it("モックが宣言する購入ステータスは、アプリの転記と一致する", () => {
    // 契約に列挙する口が無いため宣言が 2 つある。片方だけ動くと画面の分岐が黙って死ぬ。
    const patched = patchOf("getGetDashboardSummaryResponseMock")(
      { purchaseStatusCounts: Array.from({ length: 9 }, () => ({ count: 1 })) },
      draw,
    ) as { purchaseStatusCounts: readonly { status: { code: number; name: string } }[] };

    expect(patched.purchaseStatusCounts.map((entry) => entry.status.code).sort((a, b) => a - b)).toEqual(
      Object.values(PURCHASE_STATUS).toSorted((a, b) => a - b),
    );
  });

  // ----- 異常系 -----
  it("マスタの応答が一覧でなければ落ちる", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(() => patch(product("p1"), () => ({ unexpected: true }))).toThrow("一覧ではありません");
  });

  it("マスタの一覧が空なら落ちる", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(() => patch(product("p1"), () => [])).toThrow("空です");
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
});
