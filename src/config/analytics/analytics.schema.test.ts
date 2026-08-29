import { describe, expect, it } from "vitest";

import { gtmContainerIdValidator } from "./analytics.schema";

describe("gtmContainerIdValidator", () => {
  // ----- 正常系 -----
  it("容器 ID の綴りを通す", () => {
    expect(gtmContainerIdValidator().parse("GTM-ABC1234")).toBe("GTM-ABC1234");
  });

  it("空を通す。読み込まないという指定である", () => {
    expect(gtmContainerIdValidator().parse("")).toBe("");
  });

  it("宣言が無ければ空へ倒す", () => {
    expect(gtmContainerIdValidator().parse(undefined)).toBe("");
  });

  // ----- 異常系 -----
  it("接頭辞が違う値を弾く", () => {
    expect(() => gtmContainerIdValidator().parse("GA-ABC1234")).toThrow(/GTM- で始まる/);
  });

  it("小文字を含む値を弾く", () => {
    expect(() => gtmContainerIdValidator().parse("GTM-abc1234")).toThrow(/GTM- で始まる/);
  });
});
