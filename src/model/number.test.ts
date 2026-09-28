import { describe, expect, it } from "vitest";

import { formatNumber } from "./number";

describe("formatNumber", () => {
  // ----- 正常系 -----
  it("既定の locale で 3 桁ごとに区切る", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("locale を渡すとその locale の表記になる", () => {
    expect(formatNumber(1234567, "de-DE")).toBe("1.234.567");
  });

  it("同じ locale を続けて使っても表記が変わらない", () => {
    expect(formatNumber(1000, "de-DE")).toBe(formatNumber(1000, "de-DE"));
  });

  it("0 は区切りなしで返す", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("小数を持つ値の小数部を残す", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });
});
