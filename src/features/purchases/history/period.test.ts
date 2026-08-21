import { describe, expect, it } from "vitest";

import { PURCHASE_MAX_RECENT_DAYS } from "@/adapters/client/api/purchases";

import {
  describePeriod,
  toPeriodSearchParams,
  toPeriodSelection,
  toPurchaseHistoryHref,
  toPurchaseHistoryQuery,
} from "./period";

describe("toPeriodSelection", () => {
  // ----- 正常系 -----
  it("指定が無ければ全期間として読む", () => {
    expect(toPeriodSelection({})).toEqual({ kind: "all" });
  });

  it("暦月を読む", () => {
    expect(toPeriodSelection({ period: "month", month: "2026-07" })).toEqual({
      kind: "month",
      month: "2026-07",
    });
  });

  it("開始日と終了日を読む", () => {
    expect(toPeriodSelection({ period: "range", from: "2026-06-01", to: "2026-08-17" })).toEqual({
      kind: "range",
      from: "2026-06-01",
      to: "2026-08-17",
    });
  });

  it("遡る日数を読む", () => {
    expect(toPeriodSelection({ period: "recent", days: "30" })).toEqual({
      kind: "recent",
      days: 30,
    });
  });

  it("開始日と終了日が同じ 1 日の範囲を読む", () => {
    expect(toPeriodSelection({ period: "range", from: "2026-06-01", to: "2026-06-01" })).toEqual({
      kind: "range",
      from: "2026-06-01",
      to: "2026-06-01",
    });
  });

  it("契約が受け付ける日数の両端そのものは通す", () => {
    expect(toPeriodSelection({ period: "recent", days: "1" })).toEqual({ kind: "recent", days: 1 });
    expect(toPeriodSelection({ period: "recent", days: String(PURCHASE_MAX_RECENT_DAYS) })).toEqual(
      { kind: "recent", days: PURCHASE_MAX_RECENT_DAYS },
    );
  });

  it("前後の空白を落として読む", () => {
    expect(toPeriodSelection({ period: "month", month: " 2026-07 " })).toEqual({
      kind: "month",
      month: "2026-07",
    });
  });

  // ----- 異常系 -----
  it("区分だけあって必須の値が無ければ全期間へ倒す", () => {
    expect(toPeriodSelection({ period: "month" })).toEqual({ kind: "all" });
    expect(toPeriodSelection({ period: "range", from: "2026-06-01" })).toEqual({ kind: "all" });
    expect(toPeriodSelection({ period: "recent" })).toEqual({ kind: "all" });
  });

  it("書式の合わない暦月は全期間へ倒す", () => {
    expect(toPeriodSelection({ period: "month", month: "2026-13" })).toEqual({ kind: "all" });
  });

  it("終了日が開始日より前なら全期間へ倒す", () => {
    expect(toPeriodSelection({ period: "range", from: "2026-08-17", to: "2026-06-01" })).toEqual({
      kind: "all",
    });
  });

  it("日付として読めない値は全期間へ倒す", () => {
    expect(toPeriodSelection({ period: "range", from: "2026-06-31", to: "2026-08-17" })).toEqual({
      kind: "all",
    });
  });

  it("範囲を外れた日数は全期間へ倒す", () => {
    expect(toPeriodSelection({ period: "recent", days: "0" })).toEqual({ kind: "all" });
    expect(
      toPeriodSelection({ period: "recent", days: String(PURCHASE_MAX_RECENT_DAYS + 1) }),
    ).toEqual({ kind: "all" });
    expect(toPeriodSelection({ period: "recent", days: "7.5" })).toEqual({ kind: "all" });
  });

  it("数として読めない日数は全期間へ倒す", () => {
    expect(toPeriodSelection({ period: "recent", days: "さいご" })).toEqual({ kind: "all" });
  });

  it("知らない区分は全期間へ倒す", () => {
    expect(toPeriodSelection({ period: "yesterday" })).toEqual({ kind: "all" });
  });

  it("同じキーが繰り返された条件は指定なしとして扱う", () => {
    expect(toPeriodSelection({ period: "month", month: ["2026-07", "2026-08"] })).toEqual({
      kind: "all",
    });
  });
});

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
