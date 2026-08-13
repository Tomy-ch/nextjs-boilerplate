import { describe, expect, it } from "vitest";

import { type Budget, hasFailure, judge, missingRoutes, parseBudget } from "./budget";

const BUDGET: Budget = {
  routes: { "/": { gzipKb: 100, reason: "実測 90 KB に余裕" } },
  growth: { gzipKb: 10, reason: "chunk の切り直しで数 KB は動く" },
};

const KB = 1024;

describe("parseBudget", () => {
  // ----- 正常系 -----
  it("route の上限と増分の上限を読む", () => {
    const budget = parseBudget(
      [
        "routes:",
        '  "/":',
        "    gzipKb: 230",
        "    reason: 実測に余裕",
        "growth:",
        "  gzipKb: 10",
        "  reason: 切り直しの幅",
      ].join("\n"),
    );

    expect(budget).toEqual({
      routes: { "/": { gzipKb: 230, reason: "実測に余裕" } },
      growth: { gzipKb: 10, reason: "切り直しの幅" },
    });
  });

  it("route を 1 つも宣言していなくても読める", () => {
    expect(
      parseBudget(["routes: {}", "growth:", "  gzipKb: 10", "  reason: 幅"].join("\n")).routes,
    ).toEqual({});
  });

  // ----- 異常系 -----
  it("根拠が空なら落ちる", () => {
    expect(() =>
      parseBudget(
        [
          'routes:\n  "/":\n    gzipKb: 230\n    reason: "   "',
          "growth:\n  gzipKb: 10\n  reason: 幅",
        ].join("\n"),
      ),
    ).toThrow();
  });

  it("上限が 0 以下なら落ちる", () => {
    expect(() =>
      parseBudget(
        [
          'routes:\n  "/":\n    gzipKb: 0\n    reason: 根拠',
          "growth:\n  gzipKb: 10\n  reason: 幅",
        ].join("\n"),
      ),
    ).toThrow();
  });

  it("増分の宣言が無ければ落ちる", () => {
    expect(() => parseBudget('routes:\n  "/":\n    gzipKb: 230\n    reason: 根拠')).toThrow();
  });
});

describe("judge", () => {
  // ----- 正常系 -----
  it("上限にも増分にも収まっていれば超過を持たない", () => {
    const [verdict] = judge(
      [{ route: "/", gzip: 90 * KB }],
      [{ route: "/", gzip: 85 * KB }],
      BUDGET,
    );

    expect(verdict).toMatchObject({ limit: 100 * KB, baseGzip: 85 * KB });
    expect(verdict?.overLimit).toBeUndefined();
    expect(verdict?.overGrowth).toBeUndefined();
  });

  it("宣言の無い route は上限を持たず、増分だけを見る", () => {
    const [verdict] = judge(
      [{ route: "/x", gzip: 500 * KB }],
      [{ route: "/x", gzip: 495 * KB }],
      BUDGET,
    );

    expect(verdict?.limit).toBeUndefined();
    expect(verdict?.overLimit).toBeUndefined();
    expect(verdict?.overGrowth).toBeUndefined();
  });

  it("減った route を増分の超過にしない", () => {
    const [verdict] = judge(
      [{ route: "/", gzip: 50 * KB }],
      [{ route: "/", gzip: 90 * KB }],
      BUDGET,
    );

    expect(verdict?.overGrowth).toBeUndefined();
  });

  // ----- 異常系 -----
  it("上限を超えた量を返す", () => {
    const [verdict] = judge(
      [{ route: "/", gzip: 110 * KB }],
      [{ route: "/", gzip: 109 * KB }],
      BUDGET,
    );

    expect(verdict?.overLimit).toBe(10 * KB);
  });

  it("増分の上限を超えた量を返す", () => {
    const [verdict] = judge(
      [{ route: "/", gzip: 95 * KB }],
      [{ route: "/", gzip: 80 * KB }],
      BUDGET,
    );

    expect(verdict?.overGrowth).toBe(5 * KB);
  });

  it("base に無い route は増分を判定しない", () => {
    const [verdict] = judge([{ route: "/", gzip: 95 * KB }], [], BUDGET);

    expect(verdict?.baseGzip).toBeUndefined();
    expect(verdict?.overGrowth).toBeUndefined();
  });
});

describe("hasFailure", () => {
  // ----- 正常系 -----
  it("超過が無ければ false", () => {
    expect(hasFailure(judge([{ route: "/", gzip: 90 * KB }], [], BUDGET))).toBe(false);
  });

  // ----- 異常系 -----
  it("上限の超過を拾う", () => {
    expect(hasFailure(judge([{ route: "/", gzip: 110 * KB }], [], BUDGET))).toBe(true);
  });

  it("増分の超過を拾う", () => {
    expect(
      hasFailure(judge([{ route: "/", gzip: 95 * KB }], [{ route: "/", gzip: 80 * KB }], BUDGET)),
    ).toBe(true);
  });
});

describe("missingRoutes", () => {
  // ----- 正常系 -----
  it("宣言した route が測れていれば空", () => {
    expect(missingRoutes([{ route: "/", gzip: 1 }], BUDGET)).toEqual([]);
  });

  // ----- 異常系 -----
  it("宣言した route が build に無ければ名前を返す", () => {
    expect(missingRoutes([{ route: "/x", gzip: 1 }], BUDGET)).toEqual(["/"]);
  });
});
