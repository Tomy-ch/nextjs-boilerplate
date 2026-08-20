import { describe, expect, it } from "vitest";

import { DASHBOARD_PERIOD } from "@/model/dashboard/dashboard";

import { toPeriodHref, toPeriodRequest } from "./period";

describe("toPeriodRequest", () => {
  // ----- 正常系 -----
  it("期間が省略されたとき today として求められる形になる", () => {
    expect(toPeriodRequest({})).toEqual({
      status: "ready",
      query: { period: DASHBOARD_PERIOD.TODAY },
    });
  });

  it("range 以外のとき日付を落として求められる形になる", () => {
    expect(
      toPeriodRequest({ period: DASHBOARD_PERIOD.MONTH, from: "2026-08-01", to: "2026-08-31" }),
    ).toEqual({ status: "ready", query: { period: DASHBOARD_PERIOD.MONTH } });
  });

  it("range で両端が揃うとき日付ごと求められる形になる", () => {
    expect(
      toPeriodRequest({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01", to: "2026-08-19" }),
    ).toEqual({
      status: "ready",
      query: { period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01", to: "2026-08-19" },
    });
  });

  it("開始日と終了日が同じ日でも求められる形になる", () => {
    expect(
      toPeriodRequest({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-19", to: "2026-08-19" }),
    ).toEqual({
      status: "ready",
      query: { period: DASHBOARD_PERIOD.RANGE, from: "2026-08-19", to: "2026-08-19" },
    });
  });

  // ----- 異常系 -----
  it("range で開始日が欠けていれば求めない", () => {
    expect(toPeriodRequest({ period: DASHBOARD_PERIOD.RANGE, to: "2026-08-19" })).toEqual({
      status: "incomplete",
    });
  });

  it("range で終了日が欠けていれば求めない", () => {
    expect(toPeriodRequest({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01" })).toEqual({
      status: "incomplete",
    });
  });

  it("終了日が開始日より前なら求めない", () => {
    expect(
      toPeriodRequest({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-19", to: "2026-08-01" }),
    ).toEqual({ status: "reversed" });
  });
});

describe("toPeriodHref", () => {
  // ----- 正常系 -----
  it("集計画面のパスに期間の区分を載せる", () => {
    expect(toPeriodHref(DASHBOARD_PERIOD.MONTH)).toBe("/admin/analytics?period=month");
  });

  it("日付を持ち越さない", () => {
    const href = toPeriodHref(DASHBOARD_PERIOD.RANGE);

    expect(href).not.toContain("from");
    expect(href).not.toContain("to=");
  });
});
