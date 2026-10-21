import { describe, expect, it } from "vitest";

import {
  COUPON_VALIDITY_DAYS_MAX,
  COUPON_VALIDITY_DAYS_MIN,
} from "@/adapters/client/api/product-discontinue-limits";

import { toCouponDiscountRate, toCouponValidityDays } from "./coupon-rules";

describe("toCouponDiscountRate", () => {
  // ----- 正常系 -----
  it.each([
    { percent: "5", rate: "0.05" },
    { percent: "10", rate: "0.10" },
    { percent: "12.5", rate: "0.125" },
    { percent: "100", rate: "1.00" },
    { percent: "100.0", rate: "1.000" },
    { percent: "12.345", rate: "0.12345" },
  ])("$percent を、打った桁を保ったまま $rate へ写す", ({ percent, rate }) => {
    expect(toCouponDiscountRate(percent)).toBe(rate);
  });

  it.each([
    { percent: "007", rate: "0.07" },
    { percent: "0070", rate: "0.70" },
    { percent: "00100", rate: "1.00" },
  ])("整数部の先頭の 0 は、ずらした後に 1 つへ畳む（$percent → $rate）", ({ percent, rate }) => {
    expect(toCouponDiscountRate(percent)).toBe(rate);
  });

  it("0 は範囲を照らさずに 0.00 として写す", () => {
    expect(toCouponDiscountRate("0")).toBe("0.00");
  });

  it("100 を超える値も範囲を照らさずに写す", () => {
    expect(toCouponDiscountRate("100.01")).toBe("1.0001");
  });

  // ----- 異常系 -----
  it.each([
    { label: "整数部の無い小数", percent: ".5" },
    { label: "小数部の無い小数点", percent: "10." },
    { label: "指数表記", percent: "1e1" },
    { label: "全角数字", percent: "１０" },
    { label: "先頭の空白", percent: " 10" },
    { label: "末尾の空白", percent: "10 " },
    { label: "% 付き", percent: "10%" },
    { label: "符号付き", percent: "-5" },
    { label: "空", percent: "" },
  ])("$label（$percent）は読めないものとして null を返す", ({ percent }) => {
    expect(toCouponDiscountRate(percent)).toBeNull();
  });
});

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
