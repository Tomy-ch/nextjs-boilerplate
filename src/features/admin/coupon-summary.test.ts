import { describe, expect, it } from "vitest";

import { EMPTY_COUPON_DISCOUNT_VALUES } from "./coupon-discount";
import { EMPTY_COUPON_SCOPE_VALUES } from "./coupon-scope";
import { couponFieldsOf, discountDetail, readableWallClock, scopeDetail } from "./coupon-summary";

const CATEGORY_ID = "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2";
const PRODUCT_ID = "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11";

describe("readableWallClock", () => {
  // ----- 正常系 -----
  it("日付の区切りを斜線にし、時刻との間を空白にする", () => {
    expect(readableWallClock("2026-10-01T10:00")).toBe("2026/10/01 10:00");
  });

  it("空なら空のまま返す", () => {
    expect(readableWallClock("")).toBe("");
  });
});

describe("couponFieldsOf", () => {
  // ----- 正常系 -----
  it("定額と全体なら、上限と範囲の対象を載せない", () => {
    expect(
      couponFieldsOf(
        { kind: "flat", value: "5.00", maxAmount: "20" },
        { ...EMPTY_COUPON_SCOPE_VALUES, kind: "all", categoryId: CATEGORY_ID },
      ),
    ).toStrictEqual([
      ["discountKind", "flat"],
      ["discountValue", "5.00"],
      ["scopeKind", "all"],
    ]);
  });

  it("定率なら上限を載せる", () => {
    expect(
      couponFieldsOf(
        { kind: "rate", value: "15", maxAmount: "20" },
        { ...EMPTY_COUPON_SCOPE_VALUES, kind: "all" },
      ),
    ).toContainEqual(["discountMaxAmount", "20"]);
  });

  it("カテゴリならカテゴリだけを、商品なら商品だけを対象として載せる", () => {
    const scope = { ...EMPTY_COUPON_SCOPE_VALUES, categoryId: CATEGORY_ID, productId: PRODUCT_ID };
    const discount = { ...EMPTY_COUPON_DISCOUNT_VALUES, kind: "flat", value: "5.00" } as const;

    const category = couponFieldsOf(discount, { ...scope, kind: "category" });
    const product = couponFieldsOf(discount, { ...scope, kind: "product" });

    expect(category).toContainEqual(["scopeCategoryId", CATEGORY_ID]);
    expect(category.map(([name]) => name)).not.toContain("scopeProductId");
    expect(product).toContainEqual(["scopeProductId", PRODUCT_ID]);
    expect(product.map(([name]) => name)).not.toContain("scopeCategoryId");
  });
});

describe("discountDetail", () => {
  // ----- 正常系 -----
  it("定額は金額で読む", () => {
    expect(discountDetail({ kind: "flat", value: "5.00", maxAmount: "" })).toBe("5.00 ドル引き");
  });

  it("定率は上限があれば添えて読む", () => {
    expect(discountDetail({ kind: "rate", value: "15", maxAmount: "20" })).toBe(
      "15% 引き（1 回 20 ドルまで）",
    );
  });

  it("定率で上限が無ければ率だけを読む", () => {
    expect(discountDetail({ kind: "rate", value: "15", maxAmount: "" })).toBe("15% 引き");
  });
});

describe("scopeDetail", () => {
  // ----- 正常系 -----
  it("カテゴリは渡された名前を添えて読む", () => {
    expect(scopeDetail({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "category" }, "文房具")).toBe(
      "特定のカテゴリ：文房具",
    );
  });

  it("商品は選ばれた商品の名前を添えて読む", () => {
    expect(
      scopeDetail({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "product", productName: "万年筆" }, ""),
    ).toBe("特定の商品：万年筆");
  });

  it("全体はその名前で読む", () => {
    expect(scopeDetail({ ...EMPTY_COUPON_SCOPE_VALUES, kind: "all" }, "")).toBe("全商品");
  });
});
