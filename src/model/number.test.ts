import { afterEach, describe, expect, it, vi } from "vitest";

import { formatNumber } from "./number";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatNumber", () => {
  // ----- 正常系 -----
  it("既定の locale で 3 桁ごとに区切る", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("locale を渡すとその locale の表記になる", () => {
    expect(formatNumber(1234567, "de-DE")).toBe("1.234.567");
  });

  it("同じ locale の書式は 1 度だけ作って使い回す", () => {
    const construct = vi.spyOn(Intl, "NumberFormat");

    expect(formatNumber(1234567, "en-IN")).toBe("12,34,567");
    expect(formatNumber(1234567, "en-IN")).toBe("12,34,567");
    expect(construct).toHaveBeenCalledTimes(1);
  });

  it("0 は区切りなしで返す", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("小数を持つ値の小数部を残す", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });
});
