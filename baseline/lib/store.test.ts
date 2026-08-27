import { describe, expect, it } from "vitest";

import {
  assertAreaUnclaimed,
  clearableStoryEntries,
  isRetaking,
  RETAKE_ENV,
  SCREEN_AREA,
} from "./store";

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

describe("clearableStoryEntries", () => {
  // ----- 正常系 -----
  it("story の系統を消す対象として返す", () => {
    expect(clearableStoryEntries(["action", "form", "features"])).toEqual([
      "action",
      "form",
      "features",
    ]);
  });

  it("画面単位の区画を残す", () => {
    expect(clearableStoryEntries(["action", SCREEN_AREA])).toEqual(["action"]);
  });

  it("置き場自身の説明と入力のハッシュを残す", () => {
    expect(clearableStoryEntries(["README.md", "render-inputs.sha256", "display"])).toEqual([
      "display",
    ]);
  });

  it("git の管理下を残す", () => {
    expect(clearableStoryEntries([".git", ".gitignore", "overlay"])).toEqual(["overlay"]);
  });

  it("消すものが無ければ空を返す", () => {
    expect(clearableStoryEntries([SCREEN_AREA, "README.md"])).toEqual([]);
  });
});
