import { describe, expect, it } from "vitest";

import { assertAreaUnclaimed, isRetaking, RETAKE_ENV, SCREEN_AREA } from "./baseline-store";

describe("isRetaking", () => {
  // ----- 正常系 -----
  it("撮り直しの合図が立っていれば true を返す", () => {
    expect(isRetaking({ [RETAKE_ENV]: "1" })).toBe(true);
  });

  // ----- 異常系 -----
  it("合図が無ければ false を返す", () => {
    expect(isRetaking({})).toBe(false);
  });

  it("合図が別の値なら false を返す", () => {
    expect(isRetaking({ [RETAKE_ENV]: "0" })).toBe(false);
  });
});

describe("assertAreaUnclaimed", () => {
  // ----- 正常系 -----
  it("予約区画を名乗らない系統を通す", () => {
    expect(() => assertAreaUnclaimed(["action", "display"])).not.toThrow();
  });

  it("系統が 1 つも無くても通す", () => {
    expect(() => assertAreaUnclaimed([])).not.toThrow();
  });

  // ----- 異常系 -----
  it("予約区画を名乗る系統を落とす", () => {
    expect(() => assertAreaUnclaimed(["action", SCREEN_AREA])).toThrow();
  });
});
