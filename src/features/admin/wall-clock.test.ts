import { describe, expect, it } from "vitest";

import { instantOf, wallClockToInstant } from "./wall-clock";

describe("wallClockToInstant", () => {
  // ----- 正常系 -----
  it("壁時計の値を実行環境の時間帯で読んで瞬間の文字列へ確定させる", () => {
    expect(wallClockToInstant("2026-10-01T10:00")).toBe("2026-10-01T01:00:00.000Z");
  });

  it("空なら空文字を返す", () => {
    expect(wallClockToInstant("")).toBe("");
  });

  // ----- 異常系 -----
  it.each(["abc", "99999-01-01T00:00"])(
    "読めない値（%s）は例外を投げず、空にせず渡された値のまま返す",
    (wallClock) => {
      expect(wallClockToInstant(wallClock)).toBe(wallClock);
    },
  );
});

describe("instantOf", () => {
  // ----- 正常系 -----
  it("瞬間の文字列を日時として読む", () => {
    expect(instantOf("2026-10-01T01:00:00.000Z")).toStrictEqual(
      new Date("2026-10-01T01:00:00.000Z"),
    );
  });

  it("空なら null を返す", () => {
    expect(instantOf("")).toBeNull();
  });

  // ----- 異常系 -----
  it("読めない値は例外を投げずに null を返す", () => {
    expect(instantOf("99999-01-01T00:00")).toBeNull();
  });

  it("確定できずに渡された値のまま返った壁時計の値は、読めないと判定する", () => {
    expect(instantOf(wallClockToInstant("99999-01-01T00:00"))).toBeNull();
  });
});
