import { describe, expect, it } from "vitest";

import {
  COUPON_DISCOUNT_FLAT_INVALID_MESSAGE,
  COUPON_DISCOUNT_FORM_NAMES,
  COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
  COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE,
  COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
  COUPON_DISCOUNT_RATE_OUT_OF_RANGE_MESSAGE,
  type CouponDiscountValues,
  readCouponDiscountValues,
  toCouponDiscount,
  toCouponDiscountRate,
  toMinorUnitAmount,
} from "./coupon-discount";

const { kind: KIND, value: VALUE, maxAmount: MAX_AMOUNT } = COUPON_DISCOUNT_FORM_NAMES;

const LARGEST_SAFE_AMOUNT = "90071992547409.91";

const UNSAFE_AMOUNT = `${Math.floor(Number.MAX_SAFE_INTEGER / 100) + 1}`;

function discountOf(values: Partial<CouponDiscountValues>): CouponDiscountValues {
  return { kind: "rate", value: "10", maxAmount: "", ...values };
}

function formOf(entries: Readonly<Record<string, string | File>>): FormData {
  const formData = new FormData();

  for (const [name, value] of Object.entries(entries)) {
    formData.set(name, value);
  }

  return formData;
}

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

describe("toMinorUnitAmount", () => {
  // ----- 正常系 -----
  it.each([
    { amount: "20", minor: 2000 },
    { amount: "12.3", minor: 1230 },
    { amount: "12.34", minor: 1234 },
    { amount: "0.01", minor: 1 },
    { amount: "007", minor: 700 },
  ])("$amount を、浮動小数を通さずに最小単位の $minor へ写す", ({ amount, minor }) => {
    expect(toMinorUnitAmount(amount)).toBe(minor);
  });

  it("最小単位が安全に表せる最大の整数に収まる額は写す", () => {
    expect(toMinorUnitAmount(LARGEST_SAFE_AMOUNT)).toBe(Number.MAX_SAFE_INTEGER);
  });

  // ----- 異常系 -----
  it.each([
    { label: "最小単位より細かい桁", amount: "1.005" },
    { label: "整数部の無い小数", amount: ".5" },
    { label: "小数部の無い小数点", amount: "1." },
    { label: "符号付き", amount: "-1" },
    { label: "数でない綴り", amount: "abc" },
    { label: "空", amount: "" },
  ])("$label（$amount）は読めないものとして null を返す", ({ amount }) => {
    expect(toMinorUnitAmount(amount)).toBeNull();
  });

  it.each([{ amount: "0" }, { amount: "0.00" }])(
    "0 になる額（$amount）は null を返す",
    ({ amount }) => {
      expect(toMinorUnitAmount(amount)).toBeNull();
    },
  );

  it("最小単位が安全に表せる整数を超える額は null を返す", () => {
    expect(toMinorUnitAmount(UNSAFE_AMOUNT)).toBeNull();
  });
});

describe("toCouponDiscount", () => {
  // ----- 正常系 -----
  it("定額は打たれた額の綴りのまま値引きとして読む", () => {
    expect(toCouponDiscount(discountOf({ kind: "flat", value: "5.50" }))).toStrictEqual({
      ok: true,
      discount: { kind: "flat", value: "5.50" },
    });
  });

  it("定額のときは上限額を読まず、読めない綴りでも拒まない", () => {
    expect(
      toCouponDiscount(discountOf({ kind: "flat", value: "5", maxAmount: "abc" })),
    ).toStrictEqual({ ok: true, discount: { kind: "flat", value: "5" } });
  });

  it("定率の上限額が空なら上限無しの null で読む", () => {
    expect(toCouponDiscount(discountOf({ value: "10", maxAmount: "" }))).toStrictEqual({
      ok: true,
      discount: { kind: "rate", value: "0.10", maxAmount: null },
    });
  });

  it("定率の上限額は最小単位へ写して読む", () => {
    expect(toCouponDiscount(discountOf({ value: "12.5", maxAmount: "20" }))).toStrictEqual({
      ok: true,
      discount: { kind: "rate", value: "0.125", maxAmount: 2000 },
    });
  });

  it.each([
    { label: "上限ちょうどの 100", value: "100", rate: "1.00" },
    { label: "0 より大きい最小の綴り", value: "0.01", rate: "0.0001" },
  ])("定率が$labelなら受け付ける", ({ value, rate }) => {
    expect(toCouponDiscount(discountOf({ value }))).toStrictEqual({
      ok: true,
      discount: { kind: "rate", value: rate, maxAmount: null },
    });
  });

  // ----- 異常系 -----
  it("種別が選ばれていなければ種別の欄に文言を出す", () => {
    expect(toCouponDiscount(discountOf({ kind: "" }))).toStrictEqual({
      ok: false,
      errors: { [KIND]: COUPON_DISCOUNT_KIND_MISSING_MESSAGE },
    });
  });

  it.each([
    { label: "0 になる額", value: "0" },
    { label: "最小単位より細かい桁", value: "1.005" },
    { label: "数でない綴り", value: "abc" },
  ])("定額が$label（$value）なら値の欄に文言を出す", ({ value }) => {
    expect(toCouponDiscount(discountOf({ kind: "flat", value }))).toStrictEqual({
      ok: false,
      errors: { [VALUE]: COUPON_DISCOUNT_FLAT_INVALID_MESSAGE },
    });
  });

  it.each([
    { label: "% 付き", value: "10%" },
    { label: "空", value: "" },
  ])("定率が読めない綴り（$label）なら値の欄に読めない旨を出す", ({ value }) => {
    expect(toCouponDiscount(discountOf({ value }))).toStrictEqual({
      ok: false,
      errors: { [VALUE]: COUPON_DISCOUNT_RATE_INVALID_MESSAGE },
    });
  });

  it.each([
    { label: "0 ちょうど", value: "0" },
    { label: "小数で書いた 0", value: "0.00" },
    { label: "100 をわずかに超える", value: "100.01" },
    { label: "100 を大きく超える", value: "200" },
  ])("定率が範囲の外（$label の $value）なら値の欄に範囲の文言を出す", ({ value }) => {
    expect(toCouponDiscount(discountOf({ value }))).toStrictEqual({
      ok: false,
      errors: { [VALUE]: COUPON_DISCOUNT_RATE_OUT_OF_RANGE_MESSAGE },
    });
  });

  it.each([
    { label: "0 になる額", maxAmount: "0" },
    { label: "数でない綴り", maxAmount: "abc" },
  ])("定率の上限額が$label（$maxAmount）なら上限額の欄に文言を出す", ({ maxAmount }) => {
    expect(toCouponDiscount(discountOf({ value: "10", maxAmount }))).toStrictEqual({
      ok: false,
      errors: { [MAX_AMOUNT]: COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE },
    });
  });

  it("率が読めず上限額も読めなければ、両方の欄に文言を出す", () => {
    expect(toCouponDiscount(discountOf({ value: "abc", maxAmount: "abc" }))).toStrictEqual({
      ok: false,
      errors: {
        [VALUE]: COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
        [MAX_AMOUNT]: COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE,
      },
    });
  });

  it("率が範囲の外で上限額も読めなければ、両方の欄に文言を出す", () => {
    expect(toCouponDiscount(discountOf({ value: "200", maxAmount: "abc" }))).toStrictEqual({
      ok: false,
      errors: {
        [VALUE]: COUPON_DISCOUNT_RATE_OUT_OF_RANGE_MESSAGE,
        [MAX_AMOUNT]: COUPON_DISCOUNT_MAX_AMOUNT_INVALID_MESSAGE,
      },
    });
  });
});

describe("readCouponDiscountValues", () => {
  // ----- 正常系 -----
  it.each([{ kind: "flat" }, { kind: "rate" }])(
    "種別 $kind と、値・上限額を打たれたまま取り出す",
    ({ kind }) => {
      expect(
        readCouponDiscountValues(formOf({ [KIND]: kind, [VALUE]: " 10 ", [MAX_AMOUNT]: "20.5" })),
      ).toStrictEqual({ kind, value: " 10 ", maxAmount: "20.5" });
    },
  );

  // ----- 異常系 -----
  it.each([
    { label: "知らない種別", kind: "percent" },
    { label: "大文字の種別", kind: "FLAT" },
    { label: "空の種別", kind: "" },
  ])("$label（$kind）は選ばれていない空として取り出す", ({ kind }) => {
    expect(readCouponDiscountValues(formOf({ [KIND]: kind, [VALUE]: "5" }))).toStrictEqual({
      kind: "",
      value: "5",
      maxAmount: "",
    });
  });

  it("どの項目も載っていなければ、すべて空として取り出す", () => {
    expect(readCouponDiscountValues(formOf({}))).toStrictEqual({
      kind: "",
      value: "",
      maxAmount: "",
    });
  });

  it("ファイルとして載った項目は空として取り出す", () => {
    const file = new File(["flat"], "discount.txt");

    expect(
      readCouponDiscountValues(formOf({ [KIND]: file, [VALUE]: file, [MAX_AMOUNT]: file })),
    ).toStrictEqual({ kind: "", value: "", maxAmount: "" });
  });
});
