import { describe, expect, it } from "vitest";

import { formatCouponDiscount, formatCouponDiscountCap } from "./discount-label";

describe("formatCouponDiscount", () => {
  // ----- 正常系 -----
  it("定額は額面を基準通貨の表記で出す", () => {
    expect(formatCouponDiscount({ kind: "flat", value: "5.00" })).toBe("$5.00 引き");
  });

  it("定率は率を百分率で出す", () => {
    expect(formatCouponDiscount({ kind: "rate", value: "0.10", maxAmount: null })).toBe(
      "10% 引き",
    );
  });

  it("定率の上限は額面に含めない", () => {
    expect(formatCouponDiscount({ kind: "rate", value: "0.10", maxAmount: 300 })).toBe("10% 引き");
  });

  it("locale を渡すとその locale の表記になる", () => {
    expect(formatCouponDiscount({ kind: "flat", value: "5.00" }, "de-DE")).toBe(
      "5,00 $ 引き",
    );
  });
});

describe("formatCouponDiscountCap", () => {
  // ----- 正常系 -----
  it("上限のある定率は上限の額を出す", () => {
    expect(formatCouponDiscountCap({ kind: "rate", value: "0.10", maxAmount: 300 })).toBe(
      "上限 $3.00",
    );
  });

  it("locale を渡すとその locale の表記になる", () => {
    expect(formatCouponDiscountCap({ kind: "rate", value: "0.10", maxAmount: 300 }, "de-DE")).toBe(
      "上限 3,00 $",
    );
  });

  it("上限の無い定率は undefined を返す", () => {
    expect(formatCouponDiscountCap({ kind: "rate", value: "0.10", maxAmount: null })).toBeUndefined();
  });

  it("定額は上限を持たないので undefined を返す", () => {
    expect(formatCouponDiscountCap({ kind: "flat", value: "5.00" })).toBeUndefined();
  });
});
