import { describe, expect, it } from "vitest";

import { PostProductsDiscontinueBody } from "../../gen/api/endpoints.zod";
import {
  COUPON_DISCOUNT_RATE_PATTERN,
  COUPON_VALIDITY_DAYS_MAX,
  COUPON_VALIDITY_DAYS_MIN,
} from "./product-discontinue-limits";

describe("COUPON_DISCOUNT_RATE_PATTERN", () => {
  it("契約の要求が受け付ける率の綴りだけに一致する", () => {
    expect(COUPON_DISCOUNT_RATE_PATTERN.test("0.10")).toBe(true);
    expect(COUPON_DISCOUNT_RATE_PATTERN.test("1")).toBe(true);
    expect(COUPON_DISCOUNT_RATE_PATTERN.test("-0.10")).toBe(false);
    expect(COUPON_DISCOUNT_RATE_PATTERN.test(".5")).toBe(false);
  });
});

describe("COUPON_VALIDITY_DAYS_MIN", () => {
  it("契約の要求が受け付ける最小の日数と一致する", () => {
    const body = (days: number) => ({ couponDiscountRate: "0.10", couponValidityDays: days });

    expect(PostProductsDiscontinueBody.safeParse(body(COUPON_VALIDITY_DAYS_MIN)).success).toBe(
      true,
    );
    expect(PostProductsDiscontinueBody.safeParse(body(COUPON_VALIDITY_DAYS_MIN - 1)).success).toBe(
      false,
    );
  });
});

describe("COUPON_VALIDITY_DAYS_MAX", () => {
  it("契約の要求が受け付ける最大の日数と一致する", () => {
    const body = (days: number) => ({ couponDiscountRate: "0.10", couponValidityDays: days });

    expect(PostProductsDiscontinueBody.safeParse(body(COUPON_VALIDITY_DAYS_MAX)).success).toBe(
      true,
    );
    expect(PostProductsDiscontinueBody.safeParse(body(COUPON_VALIDITY_DAYS_MAX + 1)).success).toBe(
      false,
    );
  });
});
