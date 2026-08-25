import { describe, expect, it } from "vitest";

import {
  type Budget,
  hasFailure,
  judge,
  type Measurement,
  missingRoutes,
  parseBudget,
} from "./budget";

const KB = 1024;

const BUDGET: Budget = {
  routes: { "/": { gzipKb: 100, reason: "実測 90 KB に余裕" } },
  growth: {
    initialJs: { gzipKb: 10, reason: "chunk の切り直しで数 KB は動く" },
    totalJs: { gzipKb: 10, reason: "初期と同じ幅" },
    css: { gzipKb: 4, reason: "utility は部品のぶんだけ増える" },
  },
};

/** 計測 1 件。指定しない量は 0 にする。 */
function measured(overrides: Partial<Measurement> & { route: string }): Measurement {
  return { initialJs: 0, sharedJs: 0, deferredJs: 0, css: 0, ...overrides };
}

const GROWTH_YAML = [
  "growth:",
  "  initialJs:",
  "    gzipKb: 10",
  "    reason: 切り直しの幅",
  "  totalJs:",
  "    gzipKb: 10",
  "    reason: 初期と同じ幅",
  "  css:",
  "    gzipKb: 4",
  "    reason: utility の幅",
].join("\n");

describe("parseBudget", () => {
  // ----- 正常系 -----
  it("route の上限と、量ごとの増分の上限を読む", () => {
    const budget = parseBudget(
      ["routes:", '  "/":', "    gzipKb: 230", "    reason: 実測に余裕", GROWTH_YAML].join("\n"),
    );

    expect(budget).toEqual({
      routes: { "/": { gzipKb: 230, reason: "実測に余裕" } },
      growth: {
        initialJs: { gzipKb: 10, reason: "切り直しの幅" },
        totalJs: { gzipKb: 10, reason: "初期と同じ幅" },
        css: { gzipKb: 4, reason: "utility の幅" },
      },
    });
  });

  it("route を 1 つも宣言していなくても読める", () => {
    expect(parseBudget(["routes: {}", GROWTH_YAML].join("\n")).routes).toEqual({});
  });

  // ----- 異常系 -----
  it("根拠が空なら落ちる", () => {
    expect(() =>
      parseBudget(['routes:\n  "/":\n    gzipKb: 230\n    reason: "   "', GROWTH_YAML].join("\n")),
    ).toThrow();
  });

  it("上限が 0 以下なら落ちる", () => {
    expect(() =>
      parseBudget(['routes:\n  "/":\n    gzipKb: 0\n    reason: 根拠', GROWTH_YAML].join("\n")),
    ).toThrow();
  });

  it("増分の宣言が無ければ落ちる", () => {
    expect(() => parseBudget('routes:\n  "/":\n    gzipKb: 230\n    reason: 根拠')).toThrow();
  });

  it("増分の量が 1 つでも欠けていれば落ちる", () => {
    expect(() =>
      parseBudget(
        ["routes: {}", "growth:", "  initialJs:", "    gzipKb: 10", "    reason: 幅"].join("\n"),
      ),
    ).toThrow();
  });
});

describe("judge", () => {
  // ----- 正常系 -----
  it("上限にも増分にも収まっていれば超過を持たない", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 90 * KB })],
      [measured({ route: "/", initialJs: 85 * KB })],
      BUDGET,
    );

    expect(verdict?.limit).toBe(100 * KB);
    expect(verdict?.initialJs.base).toBe(85 * KB);
    expect(verdict?.overLimit).toBeUndefined();
    expect(verdict?.initialJs.overGrowth).toBeUndefined();
  });

  it("合計を初期と遅延の和として持つ", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 90 * KB, deferredJs: 30 * KB })],
      [measured({ route: "/", initialJs: 80 * KB, deferredJs: 10 * KB })],
      BUDGET,
    );

    expect(verdict?.totalJs.current).toBe(120 * KB);
    expect(verdict?.totalJs.base).toBe(90 * KB);
  });

  it("遅延へ移しただけの変更は合計を動かさない", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 60 * KB, deferredJs: 40 * KB })],
      [measured({ route: "/", initialJs: 100 * KB })],
      BUDGET,
    );

    expect(verdict?.totalJs.overGrowth).toBeUndefined();
    expect(verdict?.initialJs.overGrowth).toBeUndefined();
  });

  it("宣言の無い route は上限を持たず、増分だけを見る", () => {
    const [verdict] = judge(
      [measured({ route: "/x", initialJs: 500 * KB })],
      [measured({ route: "/x", initialJs: 495 * KB })],
      BUDGET,
    );

    expect(verdict?.limit).toBeUndefined();
    expect(verdict?.overLimit).toBeUndefined();
    expect(verdict?.initialJs.overGrowth).toBeUndefined();
  });

  it("減った route を増分の超過にしない", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 50 * KB })],
      [measured({ route: "/", initialJs: 90 * KB })],
      BUDGET,
    );

    expect(verdict?.initialJs.overGrowth).toBeUndefined();
  });

  it("共有の内訳は増分で落とさない", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 90 * KB, sharedJs: 80 * KB })],
      [measured({ route: "/", initialJs: 85 * KB, sharedJs: 10 * KB })],
      BUDGET,
    );

    expect(verdict?.sharedJs.current).toBe(80 * KB);
    expect(verdict?.sharedJs.overGrowth).toBeUndefined();
  });

  // ----- 異常系 -----
  it("上限を超えた量を返す", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 110 * KB })],
      [measured({ route: "/", initialJs: 109 * KB })],
      BUDGET,
    );

    expect(verdict?.overLimit).toBe(10 * KB);
  });

  it("初期の増分の上限を超えた量を返す", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 95 * KB })],
      [measured({ route: "/", initialJs: 80 * KB })],
      BUDGET,
    );

    expect(verdict?.initialJs.overGrowth).toBe(5 * KB);
  });

  it("初期が動かなくても遅延が太れば合計で落とす", () => {
    const [verdict] = judge(
      [measured({ route: "/", initialJs: 90 * KB, deferredJs: 50 * KB })],
      [measured({ route: "/", initialJs: 90 * KB, deferredJs: 20 * KB })],
      BUDGET,
    );

    expect(verdict?.initialJs.overGrowth).toBeUndefined();
    expect(verdict?.totalJs.overGrowth).toBe(20 * KB);
  });

  it("CSS の増分の上限を超えた量を返す", () => {
    const [verdict] = judge(
      [measured({ route: "/", css: 20 * KB })],
      [measured({ route: "/", css: 10 * KB })],
      BUDGET,
    );

    expect(verdict?.css.overGrowth).toBe(6 * KB);
  });

  it("base に無い route は増分を判定しない", () => {
    const [verdict] = judge([measured({ route: "/", initialJs: 95 * KB })], [], BUDGET);

    expect(verdict?.initialJs.base).toBeUndefined();
    expect(verdict?.initialJs.overGrowth).toBeUndefined();
    expect(verdict?.totalJs.overGrowth).toBeUndefined();
  });
});

describe("hasFailure", () => {
  // ----- 正常系 -----
  it("超過が無ければ false", () => {
    expect(hasFailure(judge([measured({ route: "/", initialJs: 90 * KB })], [], BUDGET))).toBe(
      false,
    );
  });

  // ----- 異常系 -----
  it("上限の超過を拾う", () => {
    expect(hasFailure(judge([measured({ route: "/", initialJs: 110 * KB })], [], BUDGET))).toBe(
      true,
    );
  });

  it("初期の増分の超過を拾う", () => {
    expect(
      hasFailure(
        judge(
          [measured({ route: "/", initialJs: 95 * KB })],
          [measured({ route: "/", initialJs: 80 * KB })],
          BUDGET,
        ),
      ),
    ).toBe(true);
  });

  it("合計の増分の超過を拾う", () => {
    expect(
      hasFailure(
        judge(
          [measured({ route: "/", deferredJs: 50 * KB })],
          [measured({ route: "/", deferredJs: 20 * KB })],
          BUDGET,
        ),
      ),
    ).toBe(true);
  });

  it("CSS の増分の超過を拾う", () => {
    expect(
      hasFailure(
        judge(
          [measured({ route: "/", css: 20 * KB })],
          [measured({ route: "/", css: 10 * KB })],
          BUDGET,
        ),
      ),
    ).toBe(true);
  });
});

describe("missingRoutes", () => {
  // ----- 正常系 -----
  it("宣言した route が測れていれば空", () => {
    expect(missingRoutes([measured({ route: "/", initialJs: 1 })], BUDGET)).toEqual([]);
  });

  // ----- 異常系 -----
  it("宣言した route が build に無ければ名前を返す", () => {
    expect(missingRoutes([measured({ route: "/x", initialJs: 1 })], BUDGET)).toEqual(["/"]);
  });
});
