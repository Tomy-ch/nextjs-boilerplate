import { describe, expect, it } from "vitest";

import {
  COUPON_VALIDITY_DAYS_MAX,
  COUPON_VALIDITY_DAYS_MIN,
} from "@/adapters/client/api/product-discontinue-limits";

import { toCouponValidityDays } from "./coupon-rules";

describe("toCouponValidityDays", () => {
  // ----- 正常系 -----
  it("下限ちょうどの日数を読む", () => {
    expect(toCouponValidityDays(String(COUPON_VALIDITY_DAYS_MIN))).toBe(COUPON_VALIDITY_DAYS_MIN);
  });

  it("上限ちょうどの日数を読む", () => {
    expect(toCouponValidityDays(String(COUPON_VALIDITY_DAYS_MAX))).toBe(COUPON_VALIDITY_DAYS_MAX);
  });

  it("先頭に 0 が付いていても整数として読む", () => {
    expect(toCouponValidityDays("007")).toBe(7);
  });

  // ----- 異常系 -----
  it("下限を 1 下回れば null を返す", () => {
    expect(toCouponValidityDays(String(COUPON_VALIDITY_DAYS_MIN - 1))).toBeNull();
  });

  it("上限を 1 上回れば null を返す", () => {
    expect(toCouponValidityDays(String(COUPON_VALIDITY_DAYS_MAX + 1))).toBeNull();
  });

  it.each([
    { label: "小数", days: "1.5" },
    { label: "符号付き", days: "-1" },
    { label: "指数表記", days: "1e1" },
    { label: "全角数字", days: "３０" },
    { label: "前後の空白", days: " 30 " },
    { label: "単位付き", days: "30日" },
    { label: "空", days: "" },
  ])("$label（$days）は読めないものとして null を返す", ({ days }) => {
    expect(toCouponValidityDays(days)).toBeNull();
  });
});
