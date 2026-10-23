import { describe, expect, it } from "vitest";

import { toCouponDiscount } from "./coupon-discount";

describe("toCouponDiscount", () => {
  // ----- 正常系 -----
  it("定額は上限を落とし、金額だけを写す", () => {
    expect(toCouponDiscount({ kind: "flat", value: "5.00", maxAmount: null })).toEqual({
      kind: "flat",
      value: "5.00",
    });
  });

  it("定率は率と上限を写す", () => {
    expect(toCouponDiscount({ kind: "rate", value: "0.10", maxAmount: 2000 })).toEqual({
      kind: "rate",
      value: "0.10",
      maxAmount: 2000,
    });
  });

  it("定率で上限が無いときは null のまま写す", () => {
    expect(toCouponDiscount({ kind: "rate", value: "0.10", maxAmount: null })).toEqual({
      kind: "rate",
      value: "0.10",
      maxAmount: null,
    });
  });
});
