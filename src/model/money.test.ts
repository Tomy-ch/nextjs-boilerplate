import { describe, expect, it } from "vitest";

import { formatMoney } from "./money";

/** `de-DE` が記号の手前に挟む区切り。空白と見分けが付かないのでエスケープで書く。 */
const NBSP = "\u00a0";

describe("formatMoney", () => {
  // ----- 正常系 -----
  it("既定の locale で最小単位の整数を主単位の通貨表記にする", () => {
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
