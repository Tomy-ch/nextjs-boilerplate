import { describe, expect, it } from "vitest";

import {
  postCampaignsBodyDiscountValueRegExp,
  postCouponsBodyDiscountValueRegExp,
  postCouponsBulkIssueBodyDiscountValueRegExp,
  postProductsDiscontinueBodyCouponDiscountRateRegExp,
} from "../../gen/api/limits";
import { COUPON_DISCOUNT_VALUE_PATTERN } from "./coupon-limits";

describe("COUPON_DISCOUNT_VALUE_PATTERN", () => {
  // ----- 正常系 -----
  it("契約の要求が受け付ける値の綴りだけに一致する", () => {
    expect(COUPON_DISCOUNT_VALUE_PATTERN.test("0.10")).toBe(true);
    expect(COUPON_DISCOUNT_VALUE_PATTERN.test("5")).toBe(true);
    expect(COUPON_DISCOUNT_VALUE_PATTERN.test("-0.10")).toBe(false);
    expect(COUPON_DISCOUNT_VALUE_PATTERN.test(".5")).toBe(false);
  });

  it("クーポンを作る 4 つの操作が宣言する綴りと同じである", () => {
    for (const declared of [
      postCampaignsBodyDiscountValueRegExp,
      postCouponsBodyDiscountValueRegExp,
      postCouponsBulkIssueBodyDiscountValueRegExp,
      postProductsDiscontinueBodyCouponDiscountRateRegExp,
    ]) {
      expect(declared.source).toBe(COUPON_DISCOUNT_VALUE_PATTERN.source);
    }
  });
});
