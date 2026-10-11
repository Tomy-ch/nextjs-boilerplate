import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE } from "./locale";
import type { ReferenceAmount } from "./money";
import { formatDecimalMoney, formatMoney, formatReferenceAmount } from "./money";

/** `de-DE` が記号の手前に挟む区切り。空白と見分けが付かないのでエスケープで書く。 */
const NBSP = "\u00a0";

describe("formatMoney", () => {
  // ----- 正常系 -----
  it("既定の locale で最小単位の整数を主単位の通貨表記にする", () => {
    expect(DEFAULT_LOCALE).toBe("ja-JP");
    expect(formatMoney(123_456)).toBe(formatMoney(123_456, DEFAULT_LOCALE));
    expect(formatMoney(123_456)).toBe("$1,234.56");
  });

  it("locale を明示すると既定とは異なるその locale の表記になる", () => {
    expect(formatMoney(123_456, "de-DE")).toBe(`1.234,56${NBSP}$`);
  });

  it("同じ locale を繰り返し渡しても同じ表記になる", () => {
    expect(formatMoney(123_456, "de-DE")).toBe(`1.234,56${NBSP}$`);
    expect(formatMoney(654_321, "de-DE")).toBe(`6.543,21${NBSP}$`);
  });

  it("端数の無い金額でも最小単位の桁を落とさない", () => {
    expect(formatMoney(500)).toBe("$5.00");
  });

  it("0 を渡すと 0 の通貨表記になる", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("負の金額を符号つきで表す", () => {
    expect(formatMoney(-1_500)).toBe("-$15.00");
  });
});

describe("formatDecimalMoney", () => {
  // ----- 正常系 -----
  it("主単位の decimal 文字列を基準通貨の表記にする", () => {
    expect(formatDecimalMoney("19.99")).toBe("$19.99");
  });

  it("最小単位の整数で表した同じ金額と同じ表記になる", () => {
    expect(formatDecimalMoney("1234.56")).toBe(formatMoney(123_456));
  });

  it("端数の無い金額でも最小単位の桁を補う", () => {
    expect(formatDecimalMoney("5")).toBe("$5.00");
  });

  it("最小単位より下の桁を丸めずに残す", () => {
    expect(formatDecimalMoney("0.001")).toBe("$0.001");
  });

  it("locale を明示すると、その locale の表記になる", () => {
    expect(formatDecimalMoney("1234.56", "de-DE")).toBe(`1.234,56${NBSP}$`);
  });

  // ----- 異常系 -----
  it("decimal 文字列でない値は RangeError を投げる", () => {
    expect(() => formatDecimalMoney("$5")).toThrow(RangeError);
  });
});

describe("formatReferenceAmount", () => {
  /** 参考換算額の一式。金額以外は表記に効かない。 */
  const reference = (amount: number, currency: string): ReferenceAmount => ({
    amount,
    currency,
    rate: "150.00",
    rateDate: "2026-08-17",
  });

  // ----- 正常系 -----
  it("換算先の通貨の表記にする", () => {
    expect(formatReferenceAmount(reference(28_346, "JPY"))).toBe("￥28,346");
  });

  it("最小単位を持つ通貨では、その桁を落とさない", () => {
    expect(formatReferenceAmount(reference(123_456, "EUR"))).toBe("€1,234.56");
  });

  it("locale を明示すると、その locale の表記になる", () => {
    expect(formatReferenceAmount(reference(123_456, "EUR"), "de-DE")).toBe(`1.234,56${NBSP}€`);
  });

  it("参考であることを書式には混ぜない", () => {
    expect(formatReferenceAmount(reference(28_346, "JPY"))).not.toMatch(/約/);
  });

  it("0 を渡すと 0 の通貨表記になる", () => {
    expect(formatReferenceAmount(reference(0, "JPY"))).toBe("￥0");
  });
});
