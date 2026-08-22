import { describe, expect, it } from "vitest";

import {
  describePeriod,
  toPeriodSearchParams,
  toPurchaseHistoryHref,
  toPurchaseHistoryQuery,
} from "./period";
import { toPeriodSelection } from "./read-period";

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

describe("toPurchaseHistoryQuery", () => {
  // ----- 正常系 -----
  it("全期間では件数と区分だけを渡す", () => {
    expect(toPurchaseHistoryQuery({ kind: "all" }, 20)).toEqual({ first: 20, period: "all" });
  });

  it("区分が使う値だけを渡す", () => {
    expect(toPurchaseHistoryQuery({ kind: "month", month: "2026-07" }, 20)).toEqual({
      first: 20,
      period: "month",
      month: "2026-07",
    });
    expect(
      toPurchaseHistoryQuery({ kind: "range", from: "2026-06-01", to: "2026-08-17" }, 20),
    ).toEqual({ first: 20, period: "range", from: "2026-06-01", to: "2026-08-17" });
    expect(toPurchaseHistoryQuery({ kind: "recent", days: 30 }, 20)).toEqual({
      first: 20,
      period: "recent",
      days: 30,
    });
  });

  it("区分が使わない値を持ち越さない", () => {
    expect(toPurchaseHistoryQuery({ kind: "month", month: "2026-07" }, 20)).not.toHaveProperty(
      "days",
    );
  });
});
