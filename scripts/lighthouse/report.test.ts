import { describe, expect, it } from "vitest";

import type { Measurement, Verdict } from "./budget";
import { renderFloor, renderReport } from "./report";

const LIMITS = { lcpMs: 2500, clsScore: 0.1, tbtMs: 200 };

/** 判定 1 件。既定は予算に収まっている。 */
function verdict(name: string, over: Verdict["over"] = {}): Verdict {
  return { name, values: { lcpMs: 1200, clsScore: 0.02, tbtMs: 40 }, limits: LIMITS, over };
}

/** 床の計測 1 件。 */
function floor(shard: number | undefined, tbtMs: number): Measurement {
  return {
    name: "not-found",
    values: { lcpMs: 2200, clsScore: 0, tbtMs },
    ...(shard === undefined ? {} : { shard }),
  };
}

describe("renderFloor", () => {
  // ----- 正常系 -----
  it("台の順に、床の TBT を並べる", () => {
    const line = renderFloor([floor(2, 61), floor(1, 40)], "not-found");

    expect(line).toBe("台ごとの床（`not-found` の TBT）: 1 台目 40 ms / 2 台目 61 ms");
  });

  it("床でない画面は混ぜない", () => {
    const other: Measurement = { ...floor(2, 61), name: "home" };

    expect(renderFloor([floor(1, 40), other], "not-found")).not.toContain("61 ms");
  });

  // ----- 異常系 -----
  it("割らなかった実行では出さない", () => {
    expect(renderFloor([floor(undefined, 40)], "not-found")).toBe("");
  });

  it("床が 1 台ぶんしか無ければ、見比べる相手が居ないので出さない", () => {
    expect(renderFloor([floor(1, 40)], "not-found")).toBe("");
  });
});

describe("renderReport", () => {
  // ----- 正常系 -----
  it("値と上限を、指標ごとの列に並べる", () => {
    const report = renderReport([verdict("home")], 3);

    expect(report).toContain("| `home` | 1.20 s / 2.50 s | 0.020 / 0.100 | 40 ms / 200 ms |");
  });

  it("台ごとの床を、表の後ろへ添える", () => {
    const report = renderReport([verdict("home")], 3, "台ごとの床: 1 台目 40 ms");

    expect(report.endsWith("台ごとの床: 1 台目 40 ms")).toBe(true);
  });

  it("床の行が空なら添えない", () => {
    expect(renderReport([verdict("home")], 3).endsWith("|")).toBe(true);
  });

  it("何回の中央値かを添える", () => {
    expect(renderReport([verdict("home")], 5)).toContain("5 回ずつ計測した中央値");
  });

  it("画面が 1 つも無ければ、見出しだけでデータ行を持たない", () => {
    const report = renderReport([], 3);

    expect(report).toContain("| 画面 | LCP | CLS | TBT |");
    expect(report).not.toContain("| `");
  });

  // ----- 異常系 -----
  it("TBT の超過は ms のまま量を添えて印を付ける", () => {
    expect(renderReport([verdict("heavy", { tbtMs: 300 })], 3)).toContain(
      "❌ 40 ms / 200 ms（+300 ms）",
    );
  });

  it("LCP の超過は秒へ換算して量を添える", () => {
    expect(renderReport([verdict("heavy", { lcpMs: 500 })], 3)).toContain(
      "❌ 1.20 s / 2.50 s（+0.50 s）",
    );
  });

  it("CLS の超過は小数のまま量を添える", () => {
    expect(renderReport([verdict("heavy", { clsScore: 0.05 })], 3)).toContain(
      "❌ 0.020 / 0.100（+0.050）",
    );
  });

  it("超過した画面を先に並べる", () => {
    const report = renderReport([verdict("home"), verdict("heavy", { lcpMs: 500 })], 3);

    expect(report.indexOf("`heavy`")).toBeLessThan(report.indexOf("`home`"));
  });
});
