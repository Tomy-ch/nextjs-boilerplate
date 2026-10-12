import { describe, expect, it } from "vitest";

import { toCouponDiscount } from "./coupon-discount";

describe("toCouponDiscount", () => {
  it("定率は率と上限を写す", () => {
    expect(toCouponDiscount({ kind: "rate", value: "0.10", maxAmount: 1000 })).toEqual({
      kind: "rate",
      value: "0.10",
      maxAmount: 1000,
    });
  });

  it("定額は上限を写さない", () => {
    expect(toCouponDiscount({ kind: "flat", value: "5.00", maxAmount: null })).toEqual({
      kind: "flat",
      value: "5.00",
    });
  });
});
