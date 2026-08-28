import { describe, expect, it } from "vitest";

import { maintenanceModeValidator } from "./maintenance.schema";

describe("maintenanceModeValidator", () => {
  // ----- 正常系 -----
  it("止める指定をそのまま通す", () => {
    expect(maintenanceModeValidator().parse("on")).toBe("on");
  });

  it("止めない指定をそのまま通す", () => {
    expect(maintenanceModeValidator().parse("off")).toBe("off");
  });

  it("前後の空白を落としてから読む", () => {
    expect(maintenanceModeValidator().parse("  on  ")).toBe("on");
  });

  it("空文字は止めない指定になる", () => {
    expect(maintenanceModeValidator().parse("")).toBe("off");
  });

  it("空白だけの指定も止めない指定として扱う", () => {
    expect(maintenanceModeValidator().parse("   ")).toBe("off");
  });

  it("未設定は止めない指定になる", () => {
    expect(maintenanceModeValidator().parse(undefined)).toBe("off");
  });

  // ----- 異常系 -----
  it("選べない値を拒む", () => {
    expect(maintenanceModeValidator().safeParse("true").success).toBe(false);
  });

  it("大文字の指定を拒む", () => {
    expect(maintenanceModeValidator().safeParse("ON").success).toBe(false);
  });

  it("文字列でない値を拒む", () => {
    expect(maintenanceModeValidator().safeParse(1).success).toBe(false);
  });
});
