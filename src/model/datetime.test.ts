import { afterEach, describe, expect, it, vi } from "vitest";

import { formatDate, formatDateTime, formatMonthName, formatTime } from "./datetime";

/** バックエンドが返す形と同じ、タイムゾーンを含む絶対時刻。 */
const PUBLISHED_AT = new Date("2026-08-12T00:05:00.000Z");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatDateTime", () => {
  // ----- 正常系 -----
  it("既定の locale で日付と時刻を並べる", () => {
    expect(formatDateTime(PUBLISHED_AT)).toBe("2026/08/12 9:05");
  });

  it("locale を明示すればその表記にする", () => {
    expect(formatDateTime(PUBLISHED_AT, "en-US")).toBe("Aug 12, 2026, 9:05 AM");
  });

  it("UTC とは日付が変わる時刻を既定のタイムゾーンで示す", () => {
    expect(formatDateTime(new Date("2026-08-11T15:30:00.000Z"))).toBe("2026/08/12 0:30");
  });

  it("同じ locale の書式は 1 度だけ作って使い回す", () => {
    const original = Intl.DateTimeFormat;
    const construct = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(
        new Proxy(original, { construct: (target, args) => Reflect.construct(target, args) }),
      );

    expect(formatDateTime(PUBLISHED_AT, "en-GB")).toBe("12 Aug 2026, 09:05");
    expect(formatDateTime(PUBLISHED_AT, "en-GB")).toBe("12 Aug 2026, 09:05");
    expect(construct).toHaveBeenCalledTimes(1);
  });
});

describe("formatDate", () => {
  // ----- 正常系 -----
  it("既定の locale で日付だけを出す", () => {
    expect(formatDate(PUBLISHED_AT)).toBe("2026/08/12");
  });

  it("既定のタイムゾーンで丸めるので、同じ日かどうかの判定に使える", () => {
    // UTC では 8/11 だが、表示するタイムゾーンでは 8/12 に当たる時刻。
    expect(formatDate(new Date("2026-08-11T15:30:00.000Z"))).toBe(formatDate(PUBLISHED_AT));
  });

  it("locale を明示すればその表記にする", () => {
    expect(formatDate(PUBLISHED_AT, "en-US")).toBe("Aug 12, 2026");
  });
});

describe("formatTime", () => {
  // ----- 正常系 -----
  it("既定の locale で時刻だけを出す", () => {
    expect(formatTime(PUBLISHED_AT)).toBe("9:05");
  });

  it("既定のタイムゾーンで示す", () => {
    expect(formatTime(new Date("2026-08-11T15:30:00.000Z"))).toBe("0:30");
  });

  it("locale を明示すればその表記にする", () => {
    expect(formatTime(PUBLISHED_AT, "en-US")).toBe("9:05 AM");
  });
});

describe("formatMonthName", () => {
  // ----- 正常系 -----
  it("既定の locale で短い月名にする", () => {
    expect(formatMonthName(0)).toBe("1月");
  });

  it("locale を明示すればその表記にする", () => {
    expect(formatMonthName(7, "en-US")).toBe("Aug");
  });

  it("年の最後の月を翌年の月へ繰り上げない", () => {
    expect(formatMonthName(11)).toBe("12月");
  });

  it("同じ locale の書式は 1 度だけ作って使い回す", () => {
    const original = Intl.DateTimeFormat;
    const construct = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(
        new Proxy(original, { construct: (target, args) => Reflect.construct(target, args) }),
      );

    expect(formatMonthName(3, "en-GB")).toBe("Apr");
    expect(formatMonthName(3, "en-GB")).toBe("Apr");
    expect(construct).toHaveBeenCalledTimes(1);
  });
});
