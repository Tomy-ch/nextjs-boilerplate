import { afterEach, describe, expect, it, vi } from "vitest";

import { formatNumber, formatRate, toDecimalLiteral } from "./number";

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
    const original = Intl.NumberFormat;
    const construct = vi
      .spyOn(Intl, "NumberFormat")
      .mockImplementation(
        new Proxy(original, { construct: (target, args) => Reflect.construct(target, args) }),
      );

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

describe("toDecimalLiteral", () => {
  // ----- 正常系 -----
  it("十進表記の文字列をそのまま返す", () => {
    expect(toDecimalLiteral("19.99")).toBe("19.99");
    expect(toDecimalLiteral("5")).toBe("5");
  });

  // ----- 異常系 -----
  it.each(["", "abc", "-1", "1e3", "1.", ".5", " 1"])(
    "十進表記でない %j は RangeError を投げる",
    (value) => {
      expect(() => toDecimalLiteral(value)).toThrow(RangeError);
    },
  );
});

describe("formatRate", () => {
  // ----- 正常系 -----
  it("掛ける率を百分率にする", () => {
    expect(formatRate("0.10")).toBe("10%");
    expect(formatRate("1")).toBe("100%");
  });

  it("率の小数桁を丸めない", () => {
    expect(formatRate("0.125")).toBe("12.5%");
  });

  it("locale を渡すとその locale の表記になる", () => {
    expect(formatRate("0.10", "de-DE")).toBe("10 %");
  });

  it("同じ locale の書式は 1 度だけ作って使い回す", () => {
    const original = Intl.NumberFormat;
    const construct = vi
      .spyOn(Intl, "NumberFormat")
      .mockImplementation(
        new Proxy(original, { construct: (target, args) => Reflect.construct(target, args) }),
      );

    expect(formatRate("0.25", "fr-FR")).toBe("25 %");
    expect(formatRate("0.25", "fr-FR")).toBe("25 %");
    expect(construct).toHaveBeenCalledTimes(1);
  });

  // ----- 異常系 -----
  it("十進表記でない率は RangeError を投げる", () => {
    expect(() => formatRate("10%")).toThrow(RangeError);
  });
});
