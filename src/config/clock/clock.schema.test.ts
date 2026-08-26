import { describe, expect, it } from "vitest";

import { fixedNowValidator } from "./clock.schema";

describe("fixedNowValidator", () => {
  // ----- 正常系 -----
  it("ISO 8601 の日時をそのまま通す", () => {
    expect(fixedNowValidator().parse("2026-01-01T00:00:00.000Z")).toBe("2026-01-01T00:00:00.000Z");
  });

  it("前後の空白を落としてから読む", () => {
    expect(fixedNowValidator().parse("  2026-01-01T00:00:00.000Z  ")).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("空文字は固定しない指定として undefined になる", () => {
    expect(fixedNowValidator().parse("")).toBeUndefined();
  });

  it("空白だけの指定も固定しない指定として扱う", () => {
    expect(fixedNowValidator().parse("   ")).toBeUndefined();
  });

  it("未設定は固定しない指定として undefined になる", () => {
    expect(fixedNowValidator().parse(undefined)).toBeUndefined();
  });

  // ----- 異常系 -----
  it("日時として読めない文字列を拒む", () => {
    expect(fixedNowValidator().safeParse("いつか").success).toBe(false);
  });

  it("文字列でない値を拒む", () => {
    expect(fixedNowValidator().safeParse(20_260_101).success).toBe(false);
  });
});
