import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calendarDate,
  calendarMonth,
  dateRangeWindow,
  monthWindow,
  recentDaysWindow,
  todayWindow,
  WHOLE_TIME,
} from "./time-window";

/** JST では 8/24 11:00。UTC ではまだ 8/24 02:00。 */
const NOON_IN_JST = new Date("2026-08-24T02:00:00Z");

/** JST では 8/24 01:30。**UTC ではまだ 8/23** で、日付が跨いでいる。 */
const AFTER_MIDNIGHT_IN_JST = new Date("2026-08-23T16:30:00Z");

afterEach(() => {
  vi.doUnmock("./locale");
  vi.resetModules();
});

describe("WHOLE_TIME", () => {
  it("境界を持たない", () => {
    expect(WHOLE_TIME).toEqual({});
  });
});

describe("calendarDate", () => {
  // ----- 正常系 -----
  it("店のタイムゾーンで見た暦日を返す", () => {
    expect(calendarDate(NOON_IN_JST)).toBe("2026-08-24");
  });

  it("協定世界時では前日でも、店では翌日として読む", () => {
    expect(calendarDate(AFTER_MIDNIGHT_IN_JST)).toBe("2026-08-24");
  });
});

describe("calendarMonth", () => {
  // ----- 正常系 -----
  it("店のタイムゾーンで見た暦月を返す", () => {
    expect(calendarMonth(NOON_IN_JST)).toBe("2026-08");
  });

  it("協定世界時では前日でも、店では翌日の属する月として読む", () => {
    expect(calendarMonth(AFTER_MIDNIGHT_IN_JST)).toBe("2026-08");
  });
});

describe("monthWindow", () => {
  // ----- 正常系 -----
  it("暦月の始まりから翌月の始まりまでを、オフセット付きで指す", () => {
    expect(monthWindow("2026-08")).toEqual({
      after: "2026-08-01T00:00:00+09:00",
      before: "2026-09-01T00:00:00+09:00",
    });
  });

  it("年をまたぐ月でも翌月へ繰り上げる", () => {
    expect(monthWindow("2026-12")).toEqual({
      after: "2026-12-01T00:00:00+09:00",
      before: "2027-01-01T00:00:00+09:00",
    });
  });

  it("閏年の 2 月も翌月の始まりで閉じる", () => {
    expect(monthWindow("2028-02").before).toBe("2028-03-01T00:00:00+09:00");
  });

  it("オフセットを名乗らないタイムゾーンでも、数の形で付ける", async () => {
    vi.resetModules();
    vi.doMock("./locale", () => ({ DEFAULT_TIME_ZONE: "UTC", DEFAULT_LOCALE: "ja-JP" }));
    const inUtc = await import("./time-window");

    expect(inUtc.monthWindow("2026-08")).toEqual({
      after: "2026-08-01T00:00:00+00:00",
      before: "2026-09-01T00:00:00+00:00",
    });
  });

  // ----- 異常系 -----
  it("暦の月として読めない指定は投げる", () => {
    expect(() => monthWindow("2026-8")).toThrow("暦の日付として読めません");
  });
});

describe("dateRangeWindow", () => {
  // ----- 正常系 -----
  it("終了日の翌日で閉じ、終了日の 24 時間を含める", () => {
    expect(dateRangeWindow("2026-08-01", "2026-08-31")).toEqual({
      after: "2026-08-01T00:00:00+09:00",
      before: "2026-09-01T00:00:00+09:00",
    });
  });

  it("同じ日を両端にしても、空の区間にならない", () => {
    expect(dateRangeWindow("2026-08-24", "2026-08-24")).toEqual({
      after: "2026-08-24T00:00:00+09:00",
      before: "2026-08-25T00:00:00+09:00",
    });
  });

  it("月末をまたぐ範囲でも繰り上げる", () => {
    expect(dateRangeWindow("2026-08-30", "2026-08-31").before).toBe("2026-09-01T00:00:00+09:00");
  });

  // ----- 異常系 -----
  it("暦の日付として読めない指定は投げる", () => {
    expect(() => dateRangeWindow("2026-08-01", "きのう")).toThrow("暦の日付として読めません");
  });
});

describe("recentDaysWindow", () => {
  // ----- 正常系 -----
  it("今日を含めて遡り、明日の始まりで閉じる", () => {
    expect(recentDaysWindow(7, NOON_IN_JST)).toEqual({
      after: "2026-08-18T00:00:00+09:00",
      before: "2026-08-25T00:00:00+09:00",
    });
  });

  it("月をまたいで遡る", () => {
    expect(recentDaysWindow(30, NOON_IN_JST).after).toBe("2026-07-26T00:00:00+09:00");
  });

  it("店のタイムゾーンで日付が変わっていれば、UTC がまだ前日でも今日として数える", () => {
    expect(recentDaysWindow(1, AFTER_MIDNIGHT_IN_JST)).toEqual({
      after: "2026-08-24T00:00:00+09:00",
      before: "2026-08-25T00:00:00+09:00",
    });
  });
});

describe("todayWindow", () => {
  // ----- 正常系 -----
  it("今日 1 日を指す", () => {
    expect(todayWindow(NOON_IN_JST)).toEqual({
      after: "2026-08-24T00:00:00+09:00",
      before: "2026-08-25T00:00:00+09:00",
    });
  });

  it("店のタイムゾーンで日付が変わった直後も、その日を指す", () => {
    expect(todayWindow(AFTER_MIDNIGHT_IN_JST).after).toBe("2026-08-24T00:00:00+09:00");
  });
});
