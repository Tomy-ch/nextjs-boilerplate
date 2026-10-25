import { describe, expect, it } from "vitest";

import { toCouponDiscount, toCouponDiscountInput } from "./coupon-discount";

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

describe("toCouponDiscountInput", () => {
  // ----- 正常系 -----
  it("定額には上限の欄を載せない", () => {
    expect(toCouponDiscountInput({ kind: "flat", value: "5.00" })).toStrictEqual({
      kind: "flat",
      value: "5.00",
    });
  });

  it("定率は率と上限を写す", () => {
    expect(toCouponDiscountInput({ kind: "rate", value: "0.15", maxAmount: 2000 })).toStrictEqual({
      kind: "rate",
      value: "0.15",
      maxAmount: 2000,
    });
  });

  it("定率の上限が無ければ null で写す", () => {
    expect(toCouponDiscountInput({ kind: "rate", value: "0.10", maxAmount: null })).toStrictEqual({
      kind: "rate",
      value: "0.10",
      maxAmount: null,
    });
  });
});
