import { describe, expect, it } from "vitest";

import {
  DEFAULT_RECENT_DAYS,
  describeMissing,
  toAppliedPeriod,
  toPeriodDraft,
} from "./period-draft";

/** 何も入っていない下書き。各ケースはここから派生させる。 */
const EMPTY = { kind: "all", month: "", from: "", to: "", days: DEFAULT_RECENT_DAYS } as const;

describe("toPeriodDraft", () => {
  // ----- 正常系 -----
  it("効いている期間を入力欄の初期値へ写す", () => {
    expect(toPeriodDraft({ kind: "month", month: "2026-07" })).toEqual({
      ...EMPTY,
      kind: "month",
      month: "2026-07",
    });
    expect(toPeriodDraft({ kind: "range", from: "2026-06-01", to: "2026-08-17" })).toEqual({
      ...EMPTY,
      kind: "range",
      from: "2026-06-01",
      to: "2026-08-17",
    });
  });

  it("全期間では、どの入力欄にも値を入れない", () => {
    expect(toPeriodDraft({ kind: "all" })).toEqual(EMPTY);
  });

  it("区分が使わない入力欄には既定を置く", () => {
    expect(toPeriodDraft({ kind: "month", month: "2026-07" }).days).toBe(DEFAULT_RECENT_DAYS);
  });
});

describe("toAppliedPeriod", () => {
  // ----- 正常系 -----
  it("全期間はそのまま条件になる", () => {
    expect(toAppliedPeriod(EMPTY)).toEqual({ kind: "all" });
  });

  it("揃った指定を条件へ直す", () => {
    expect(toAppliedPeriod({ ...EMPTY, kind: "month", month: "2026-07" })).toEqual({
      kind: "month",
      month: "2026-07",
    });
    expect(
      toAppliedPeriod({ ...EMPTY, kind: "range", from: "2026-06-01", to: "2026-08-17" }),
    ).toEqual({ kind: "range", from: "2026-06-01", to: "2026-08-17" });
    expect(toAppliedPeriod({ ...EMPTY, kind: "recent", days: 7 })).toEqual({
      kind: "recent",
      days: 7,
    });
  });

  it("区分が使わない値が残っていても、条件には持ち越さない", () => {
    expect(toAppliedPeriod({ ...EMPTY, kind: "recent", month: "2026-07", days: 7 })).toEqual({
      kind: "recent",
      days: 7,
    });
  });

  // ----- 異常系 -----
  it("必須が欠けているあいだは条件にしない", () => {
    expect(toAppliedPeriod({ ...EMPTY, kind: "month" })).toBeNull();
    expect(toAppliedPeriod({ ...EMPTY, kind: "range", from: "2026-06-01" })).toBeNull();
    expect(toAppliedPeriod({ ...EMPTY, kind: "range", to: "2026-08-17" })).toBeNull();
  });

  it("終了日が開始日より前なら条件にしない", () => {
    expect(
      toAppliedPeriod({ ...EMPTY, kind: "range", from: "2026-08-17", to: "2026-06-01" }),
    ).toBeNull();
  });

  it("書式の合わない暦月は条件にしない", () => {
    expect(toAppliedPeriod({ ...EMPTY, kind: "month", month: "2026-13" })).toBeNull();
  });

  it("範囲を外れた日数は条件にしない", () => {
    expect(toAppliedPeriod({ ...EMPTY, kind: "recent", days: 0 })).toBeNull();
    expect(toAppliedPeriod({ ...EMPTY, kind: "recent", days: 366 })).toBeNull();
    expect(toAppliedPeriod({ ...EMPTY, kind: "recent", days: 7.5 })).toBeNull();
  });
});

describe("describeMissing", () => {
  // ----- 正常系 -----
  it("成り立っているあいだは何も言わない", () => {
    expect(describeMissing(EMPTY)).toBeNull();
    expect(describeMissing({ ...EMPTY, kind: "month", month: "2026-07" })).toBeNull();
  });

  // ----- 異常系 -----
  it("区分ごとに、何を入れれば絞り込めるかを言う", () => {
    expect(describeMissing({ ...EMPTY, kind: "month" })).toContain("対象の月");
    expect(describeMissing({ ...EMPTY, kind: "range" })).toContain("開始日");
    expect(describeMissing({ ...EMPTY, kind: "recent", days: 0 })).toContain("日数");
  });

  it("終了日の前後が逆のときも、期間の入れ方として伝える", () => {
    expect(
      describeMissing({ ...EMPTY, kind: "range", from: "2026-08-17", to: "2026-06-01" }),
    ).toContain("それ以降の終了日");
  });
});
