import { describe, expect, it } from "vitest";

import type { Verdict } from "./budget";
import { renderReport } from "./report";

const LIMITS = { lcpMs: 2500, clsScore: 0.1, tbtMs: 200 };

/** 判定 1 件。既定は予算に収まっている。 */
function verdict(name: string, over: Verdict["over"] = {}): Verdict {
  return { name, values: { lcpMs: 1200, clsScore: 0.02, tbtMs: 40 }, limits: LIMITS, over };
}

describe("renderReport", () => {
  // ----- 正常系 -----
  it("値と上限を、指標ごとの列に並べる", () => {
    const report = renderReport([verdict("home")], 3);

    expect(report).toContain("| `home` | 1.20 s / 2.50 s | 0.020 / 0.100 | 40 ms / 200 ms |");
  });

  it("何回の中央値かを添える", () => {
    expect(renderReport([verdict("home")], 5)).toContain("5 回ずつ計測した中央値");
  });

  it("超過した指標には、超えた量を添えて印を付ける", () => {
    const report = renderReport([verdict("heavy", { tbtMs: 300 })], 3);

    expect(report).toContain("❌ 40 ms / 200 ms（+300 ms）");
  });

  it("超過した画面を先に並べる", () => {
    const report = renderReport([verdict("home"), verdict("heavy", { lcpMs: 500 })], 3);

    expect(report.indexOf("`heavy`")).toBeLessThan(report.indexOf("`home`"));
  });

  it("画面が 1 つも無ければ見出しだけを返す", () => {
    expect(renderReport([], 3).split("\n")).toHaveLength(4);
  });
});
