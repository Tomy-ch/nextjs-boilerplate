import { describe, expect, it } from "vitest";

import { wallClockToInstant } from "./wall-clock";

describe("wallClockToInstant", () => {
  // ----- 正常系 -----
  it("壁時計の値を実行環境の時間帯で読んで瞬間の文字列へ確定させる", () => {
    expect(wallClockToInstant("2026-10-01T10:00")).toBe("2026-10-01T01:00:00.000Z");
  });

  it("空なら空文字を返す", () => {
    expect(wallClockToInstant("")).toBe("");
  });

  // ----- 異常系 -----
  it("読めない値は例外を投げずに空文字を返す", () => {
    expect(wallClockToInstant("abc")).toBe("");
  });
});
