import { describe, expect, it } from "vitest";

import { DASHBOARD_PERIOD } from "./period";

import { parsePeriodSelection } from "./read-period";

describe("parsePeriodSelection", () => {
  // ----- 正常系 -----
  it("区分と両端の日付を読む", () => {
    expect(parsePeriodSelection({ period: "range", from: "2026-08-01", to: "2026-08-19" })).toEqual(
      {
        ok: true,
        selection: { period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01", to: "2026-08-19" },
      },
    );
  });

  it("何も載っていない URL も読める", () => {
    expect(parsePeriodSelection({})).toEqual({ ok: true, selection: {} });
  });

  it("両端が揃っていなくても、区分としては読める", () => {
    expect(parsePeriodSelection({ period: "range", from: "2026-08-01" })).toEqual({
      ok: true,
      selection: { period: DASHBOARD_PERIOD.RANGE, from: "2026-08-01" },
    });
  });

  // ----- 異常系 -----
  it("知らない区分は読めなかったキーとして返す", () => {
    expect(parsePeriodSelection({ period: "weekly" })).toEqual({
      ok: false,
      invalidKeys: ["period"],
    });
  });

  it("暦の上に無い日付は読めなかったキーとして返す", () => {
    expect(parsePeriodSelection({ period: "range", from: "2026-06-31", to: "2026-08-19" })).toEqual(
      { ok: false, invalidKeys: ["from"] },
    );
  });

  it("同じキーが 2 つ載っていれば読めなかったキーとして返す", () => {
    expect(parsePeriodSelection({ period: ["weekly", "monthly"] })).toEqual({
      ok: false,
      invalidKeys: ["period"],
    });
  });

  it("読めないキーが複数あれば、重ねずに並べる", () => {
    const result = parsePeriodSelection({ period: "weekly", from: "きのう" });

    expect(result.ok).toBe(false);
    expect(result.ok === false && [...result.invalidKeys].sort()).toEqual(["from", "period"]);
  });
});
