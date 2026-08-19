import { describe, expect, it } from "vitest";

import { DASHBOARD_PERIOD } from "@/model/dashboard/dashboard";

import { toPeriodWindow } from "./period-window";

/** JST では 2026-08-19 の昼にあたる時刻。 */
const NOON_IN_JST = new Date("2026-08-19T03:00:00Z");

describe("toPeriodWindow", () => {
  // ----- 正常系 -----
  it("期間が省略されたとき今日の 1 日を指す", () => {
    expect(toPeriodWindow({}, NOON_IN_JST)).toEqual({ from: "2026-08-19", to: "2026-08-19" });
  });

  it("today は開始日と終了日が同じ暦日になる", () => {
    expect(toPeriodWindow({ period: DASHBOARD_PERIOD.TODAY }, NOON_IN_JST)).toEqual({
      from: "2026-08-19",
      to: "2026-08-19",
    });
  });

  it("month は月初から月末までを指す", () => {
    expect(toPeriodWindow({ period: DASHBOARD_PERIOD.MONTH }, NOON_IN_JST)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("月末が 30 日の月はその日で終わる", () => {
    expect(
      toPeriodWindow({ period: DASHBOARD_PERIOD.MONTH }, new Date("2026-09-15T03:00:00Z")),
    ).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("うるう年の 2 月は 29 日で終わる", () => {
    expect(
      toPeriodWindow({ period: DASHBOARD_PERIOD.MONTH }, new Date("2028-02-10T03:00:00Z")),
    ).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("平年の 2 月は 28 日で終わる", () => {
    expect(
      toPeriodWindow({ period: DASHBOARD_PERIOD.MONTH }, new Date("2027-02-10T03:00:00Z")),
    ).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("range は指定された両端をそのまま返す", () => {
    expect(
      toPeriodWindow(
        { period: DASHBOARD_PERIOD.RANGE, from: "2026-01-05", to: "2026-03-20" },
        NOON_IN_JST,
      ),
    ).toEqual({ from: "2026-01-05", to: "2026-03-20" });
  });

  it("UTC では前日にあたる時刻でも Asia/Tokyo の暦日で解く", () => {
    expect(toPeriodWindow({}, new Date("2026-08-18T15:30:00Z"))).toEqual({
      from: "2026-08-19",
      to: "2026-08-19",
    });
  });

  // ----- 異常系 -----
  it("range で開始日が欠けていれば対象が決まらない", () => {
    expect(
      toPeriodWindow({ period: DASHBOARD_PERIOD.RANGE, to: "2026-03-20" }, NOON_IN_JST),
    ).toBeUndefined();
  });

  it("range で終了日が欠けていれば対象が決まらない", () => {
    expect(
      toPeriodWindow({ period: DASHBOARD_PERIOD.RANGE, from: "2026-01-05" }, NOON_IN_JST),
    ).toBeUndefined();
  });
});
