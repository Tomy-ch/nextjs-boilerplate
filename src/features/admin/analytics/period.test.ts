import { describe, expect, it } from "vitest";
import { DASHBOARD_PERIOD, toPeriodHref, toPeriodRequest } from "./period";

/** JST では 8/24 11:00。日付の跨ぎを避けた昼どき。 */
const NOW = new Date("2026-08-24T02:00:00Z");

describe("toPeriodRequest", () => {
  // ----- 正常系 -----
  it("期間が省略されたとき、今日 1 日の区間になる", () => {
    expect(toPeriodRequest({}, NOW)).toEqual({
      status: "ready",
      window: { after: "2026-08-24T00:00:00+09:00", before: "2026-08-25T00:00:00+09:00" },
    });
  });

  it("today も同じ区間になる", () => {
    expect(toPeriodRequest({ period: DASHBOARD_PERIOD.TODAY }, NOW)).toEqual({
      status: "ready",
      window: { after: "2026-08-24T00:00:00+09:00", before: "2026-08-25T00:00:00+09:00" },
    });
  });

  it("month は今月を、翌月の始まりで閉じた区間にする", () => {
    expect(
      toPeriodRequest(
        { period: DASHBOARD_PERIOD.MONTH, from: "2026-08-01", to: "2026-08-31" },
        NOW,
      ),
    ).toEqual({
      status: "ready",
      window: { after: "2026-08-01T00:00:00+09:00", before: "2026-09-01T00:00:00+09:00" },
    });
  });

  it("range で両端が揃うとき、終了日の翌日で閉じた区間にする", () => {
    expect(
      toPeriodRequest(
        { period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01", to: "2026-08-19" },
        NOW,
      ),
    ).toEqual({
      status: "ready",
      window: { after: "2026-08-01T00:00:00+09:00", before: "2026-08-20T00:00:00+09:00" },
    });
  });

  it("開始日と終了日が同じ日でも、空の区間にならない", () => {
    expect(
      toPeriodRequest(
        { period: DASHBOARD_PERIOD.RANGE, from: "2026-08-19", to: "2026-08-19" },
        NOW,
      ),
    ).toEqual({
      status: "ready",
      window: { after: "2026-08-19T00:00:00+09:00", before: "2026-08-20T00:00:00+09:00" },
    });
  });

  // ----- 異常系 -----
  it("range で開始日が欠けていれば求めない", () => {
    expect(toPeriodRequest({ period: DASHBOARD_PERIOD.RANGE, to: "2026-08-19" }, NOW)).toEqual({
      status: "incomplete",
    });
  });

  it("range で終了日が欠けていれば求めない", () => {
    expect(toPeriodRequest({ period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01" }, NOW)).toEqual({
      status: "incomplete",
    });
  });

  it("終了日が開始日より前なら求めない", () => {
    expect(
      toPeriodRequest(
        { period: DASHBOARD_PERIOD.RANGE, from: "2026-08-19", to: "2026-08-01" },
        NOW,
      ),
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
