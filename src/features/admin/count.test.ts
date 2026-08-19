import { describe, expect, it } from "vitest";

import { formatCount } from "./count";

describe("formatCount", () => {
  // ----- 正常系 -----
  it("既定の locale で 3 桁ごとに区切る", () => {
    expect(formatCount(1234567)).toBe("1,234,567");
  });

  it("locale を渡すとその locale の表記になる", () => {
    expect(formatCount(1234567, "de-DE")).toBe("1.234.567");
  });

  it("同じ locale を続けて使っても表記が変わらない", () => {
    expect(formatCount(1000, "de-DE")).toBe(formatCount(1000, "de-DE"));
  });

  it("0 は区切りなしで返す", () => {
    expect(formatCount(0)).toBe("0");
  });
});
