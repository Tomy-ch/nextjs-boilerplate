import { describe, expect, it } from "vitest";

import {
  describePeriod,
  toPeriodSearchParams,
  toPurchaseHistoryHref,
  toPurchaseWindow,
} from "./period";
import { toPeriodSelection } from "./read-period";

/** JST では 8/24 11:00。日付の跨ぎを避けた昼どき。 */
const NOW = new Date("2026-08-24T02:00:00Z");

describe("toPeriodSearchParams", () => {
  // ----- 正常系 -----
  it("全期間は何も載せない", () => {
    expect(toPeriodSearchParams({ kind: "all" }).toString()).toBe("");
  });

  it("区分と、その区分が使う値だけを載せる", () => {
    expect(toPeriodSearchParams({ kind: "month", month: "2026-07" }).toString()).toBe(
      "period=month&month=2026-07",
    );
    expect(
      toPeriodSearchParams({ kind: "range", from: "2026-06-01", to: "2026-08-17" }).toString(),
    ).toBe("period=range&from=2026-06-01&to=2026-08-17");
    expect(toPeriodSearchParams({ kind: "recent", days: 30 }).toString()).toBe(
      "period=recent&days=30",
    );
  });

  it("読み取りと往復して同じ条件になる", () => {
    const period = { kind: "range", from: "2026-06-01", to: "2026-08-17" } as const;
    const raw = Object.fromEntries(toPeriodSearchParams(period));

    expect(toPeriodSelection(raw)).toEqual(period);
  });
});

describe("toPurchaseHistoryHref", () => {
  // ----- 正常系 -----
  it("全期間では条件を付けない", () => {
    expect(toPurchaseHistoryHref({ kind: "all" })).toBe("/purchases");
  });

  it("効いている期間を条件として付ける", () => {
    expect(toPurchaseHistoryHref({ kind: "recent", days: 7 })).toBe(
      "/purchases?period=recent&days=7",
    );
  });
});

describe("describePeriod", () => {
  // ----- 正常系 -----
  it("暦月を年と月で言い換える", () => {
    expect(describePeriod({ kind: "month", month: "2026-07" })).toBe("2026 年 7 月");
  });

  it("期間を開始日と終了日で言い換える", () => {
    expect(describePeriod({ kind: "range", from: "2026-06-01", to: "2026-08-17" })).toBe(
      "2026-06-01 〜 2026-08-17",
    );
  });

  it("直近を日数で言い換える", () => {
    expect(describePeriod({ kind: "recent", days: 30 })).toBe("直近 30 日");
  });

  // ----- 異常系 -----
  it("全期間は条件として言い換えない", () => {
    expect(describePeriod({ kind: "all" })).toBeNull();
  });
});

describe("toPurchaseWindow", () => {
  // ----- 正常系 -----
  it("全期間では境界を持たない", () => {
    expect(toPurchaseWindow({ kind: "all" }, NOW)).toEqual({});
  });

  it("暦月は翌月の始まりで閉じる", () => {
    expect(toPurchaseWindow({ kind: "month", month: "2026-07" }, NOW)).toEqual({
      after: "2026-07-01T00:00:00+09:00",
      before: "2026-08-01T00:00:00+09:00",
    });
  });

  it("期間は終了日の翌日で閉じ、終了日の 24 時間を含める", () => {
    expect(toPurchaseWindow({ kind: "range", from: "2026-06-01", to: "2026-08-17" }, NOW)).toEqual({
      after: "2026-06-01T00:00:00+09:00",
      before: "2026-08-18T00:00:00+09:00",
    });
  });

  it("直近 N 日は今日を含めて数え、明日の始まりで閉じる", () => {
    expect(toPurchaseWindow({ kind: "recent", days: 3 }, NOW)).toEqual({
      after: "2026-08-22T00:00:00+09:00",
      before: "2026-08-25T00:00:00+09:00",
    });
  });

  it("基準の瞬時が変われば直近の区間も動く", () => {
    const yesterday = toPurchaseWindow(
      { kind: "recent", days: 3 },
      new Date("2026-08-23T02:00:00Z"),
    );

    expect(yesterday).toEqual({
      after: "2026-08-21T00:00:00+09:00",
      before: "2026-08-24T00:00:00+09:00",
    });
  });
});
