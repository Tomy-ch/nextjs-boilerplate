import { describe, expect, it } from "vitest";

import {
  type Budget,
  hasFailure,
  judge,
  limitsFor,
  type Measurement,
  missingScreens,
  parseBudget,
} from "./budget";

const BUDGET: Budget = {
  runs: { count: 3, reason: "runner のゆらぎ" },
  metrics: {
    lcpMs: { limit: 2500, reason: "good の境界" },
    clsScore: { limit: 0.1, reason: "good の境界" },
    tbtMs: { limit: 200, reason: "INP の lab 代替" },
  },
  pullRequest: { alertAt: 300, reason: "合図の線" },
  screens: {},
};

/** 予算に収まる計測。 */
function measurement(name: string, values: Partial<Measurement["values"]> = {}): Measurement {
  return { name, values: { lcpMs: 1000, clsScore: 0.01, tbtMs: 50, ...values } };
}

const YAML = [
  "lighthouse:",
  "  runs:",
  "    count: 3",
  "    reason: runner のゆらぎ",
  "  metrics:",
  "    lcpMs:",
  "      limit: 2500",
  "      reason: good の境界",
  "    clsScore:",
  "      limit: 0.1",
  "      reason: good の境界",
  "    tbtMs:",
  "      limit: 200",
  "      reason: INP の lab 代替",
  "  pullRequest:",
  "    alertAt: 300",
  "    reason: 合図の線",
  "  screens: {}",
].join("\n");

describe("parseBudget", () => {
  // ----- 正常系 -----
  it("試行回数と指標ごとの上限を読む", () => {
    expect(parseBudget(YAML)).toEqual(BUDGET);
  });

  it("画面ごとの緩和は一部の指標だけでも読める", () => {
    const text = YAML.replace(
      "  screens: {}",
      [
        "  screens:",
        "    heavy:",
        "      tbtMs:",
        "        limit: 400",
        "        reason: 重い",
      ].join("\n"),
    );

    expect(parseBudget(text).screens).toEqual({
      heavy: { tbtMs: { limit: 400, reason: "重い" } },
    });
  });

  it("client JavaScript の予算が同じファイルに居ても読める", () => {
    const text = ["routes: {}", "growth:", "  gzipKb: 10", "  reason: 幅", YAML].join("\n");

    expect(parseBudget(text).runs.count).toBe(3);
  });

  // ----- 異常系 -----
  it("根拠が空なら、その指標の reason を指して落ちる", () => {
    expect(() =>
      parseBudget(YAML.replace("      reason: good の境界", '      reason: "  "')),
    ).toThrow(/lcpMs[\s\S]*reason/);
  });

  it("上限が 0 以下なら、その指標の limit を指して落ちる", () => {
    expect(() => parseBudget(YAML.replace("      limit: 2500", "      limit: 0"))).toThrow(
      /lcpMs[\s\S]*limit/,
    );
  });

  it("試行回数が整数でなければ、count を指して落ちる", () => {
    expect(() => parseBudget(YAML.replace("    count: 3", "    count: 2.5"))).toThrow(
      /runs[\s\S]*count/,
    );
  });

  it("試行回数が 0 以下なら、count を指して落ちる", () => {
    expect(() => parseBudget(YAML.replace("    count: 3", "    count: 0"))).toThrow(
      /runs[\s\S]*count/,
    );
  });

  it("lighthouse 節そのものが無ければ、その節を指して落ちる", () => {
    expect(() => parseBudget("routes: {}")).toThrow(/lighthouse/);
  });

  it("YAML として構文が壊れていれば落ちる", () => {
    expect(() => parseBudget("lighthouse:\n  metrics: [")).toThrow();
  });
});

describe("limitsFor", () => {
  // ----- 正常系 -----
  it("緩和の無い画面には既定がそのまま効く", () => {
    expect(limitsFor(BUDGET, "home")).toEqual({ lcpMs: 2500, clsScore: 0.1, tbtMs: 200 });
  });

  it("緩和を宣言した指標だけが差し替わる", () => {
    const budget: Budget = {
      ...BUDGET,
      screens: { heavy: { tbtMs: { limit: 400, reason: "重い" } } },
    };

    expect(limitsFor(budget, "heavy")).toEqual({ lcpMs: 2500, clsScore: 0.1, tbtMs: 400 });
  });

  it("3 指標すべてを緩和した画面はどれも差し替わる", () => {
    const budget: Budget = {
      ...BUDGET,
      screens: {
        heavy: {
          lcpMs: { limit: 4000, reason: "重い" },
          clsScore: { limit: 0.2, reason: "重い" },
          tbtMs: { limit: 400, reason: "重い" },
        },
      },
    };

    expect(limitsFor(budget, "heavy")).toEqual({ lcpMs: 4000, clsScore: 0.2, tbtMs: 400 });
  });
});

describe("judge", () => {
  // ----- 正常系 -----
  it("予算に収まっていれば超過を持たない", () => {
    expect(judge([measurement("home")], BUDGET)[0]?.over).toEqual({});
  });

  it("3 指標とも上限ちょうどなら超過にしない", () => {
    expect(
      judge([measurement("home", { lcpMs: 2500, clsScore: 0.1, tbtMs: 200 })], BUDGET)[0]?.over,
    ).toEqual({});
  });

  it("その画面へ効いた上限を判定に添える", () => {
    const budget: Budget = {
      ...BUDGET,
      screens: { heavy: { tbtMs: { limit: 400, reason: "重い" } } },
    };

    expect(judge([measurement("heavy", { tbtMs: 300 })], budget)[0]).toMatchObject({
      limits: { tbtMs: 400 },
      over: {},
    });
  });

  // ----- 異常系 -----
  it("超過した指標だけが、超えた量とともに現れる", () => {
    const verdict = judge([measurement("home", { lcpMs: 3000 })], BUDGET)[0];

    expect(verdict?.over).toEqual({ lcpMs: 500 });
  });

  it("3 指標が同時に超えれば 3 つとも現れる", () => {
    const verdict = judge(
      [measurement("home", { lcpMs: 3500, clsScore: 0.3, tbtMs: 500 })],
      BUDGET,
    )[0];

    expect(verdict?.over.lcpMs).toBe(1000);
    expect(verdict?.over.tbtMs).toBe(300);
    // 実装も期待値も同じ引き算をするので、丸め誤差まで一致する。0.2 そのものではない。
    expect(verdict?.over.clsScore).toBeCloseTo(0.2, 10);
  });

  it("緩めた画面でも、緩めた上限を超えれば現れる", () => {
    const budget: Budget = {
      ...BUDGET,
      screens: { heavy: { tbtMs: { limit: 400, reason: "重い" } } },
    };

    expect(judge([measurement("heavy", { tbtMs: 500 })], budget)[0]?.over).toEqual({ tbtMs: 100 });
  });
});

describe("hasFailure", () => {
  // ----- 正常系 -----
  it("すべて収まっていれば false", () => {
    expect(hasFailure(judge([measurement("home")], BUDGET))).toBe(false);
  });

  it("判定が 1 つも無ければ false", () => {
    expect(hasFailure([])).toBe(false);
  });

  // ----- 異常系 -----
  it("1 画面でも超えていれば true", () => {
    expect(
      hasFailure(judge([measurement("home"), measurement("heavy", { tbtMs: 900 })], BUDGET)),
    ).toBe(true);
  });
});

describe("missingScreens", () => {
  // ----- 正常系 -----
  it("緩和を持つ画面が測られていれば空", () => {
    const budget: Budget = {
      ...BUDGET,
      screens: { heavy: { tbtMs: { limit: 400, reason: "重い" } } },
    };

    expect(missingScreens([measurement("heavy")], budget)).toEqual([]);
  });

  // ----- 異常系 -----
  it("緩和だけが残って実体が居なければ、その名前を返す", () => {
    const budget: Budget = {
      ...BUDGET,
      screens: { gone: { tbtMs: { limit: 400, reason: "重い" } } },
    };

    expect(missingScreens([measurement("home")], budget)).toEqual(["gone"]);
  });
});
