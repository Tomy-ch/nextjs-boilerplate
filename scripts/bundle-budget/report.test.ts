import { describe, expect, it } from "vitest";

import type { Verdict } from "./budget";
import { renderReport } from "./report";

const KB = 1024;

function verdict(overrides: Partial<Verdict> = {}): Verdict {
  return {
    route: "/",
    gzip: 90 * KB,
    baseGzip: 85 * KB,
    limit: 100 * KB,
    overLimit: undefined,
    overGrowth: undefined,
    ...overrides,
  };
}

describe("renderReport", () => {
  // ----- 正常系 -----
  it("大きい route から並べる", () => {
    const table = renderReport([
      verdict({ route: "/small", gzip: 10 * KB }),
      verdict({ route: "/large", gzip: 200 * KB }),
    ]);

    expect(table.indexOf("/large")).toBeLessThan(table.indexOf("/small"));
  });

  it("収まっている route を ✅ で示し、増分を符号つきで出す", () => {
    expect(renderReport([verdict()])).toContain("| `/` | 90.0 KB | +5.0 KB | 100.0 KB | ✅ |");
  });

  it("丸めて 0 になる増減を符号なしで出す", () => {
    expect(renderReport([verdict({ gzip: 90 * KB - 1, baseGzip: 90 * KB })])).toContain("+0.0 KB");
  });

  it("減った route の増分を負で出す", () => {
    expect(renderReport([verdict({ gzip: 80 * KB })])).toContain("-5.0 KB");
  });

  it("上限を持たない route を判定せず — で示す", () => {
    expect(renderReport([verdict({ limit: undefined })])).toContain("| — | — |");
  });

  it("base に無い route の増分を — で示す", () => {
    expect(renderReport([verdict({ baseGzip: undefined })])).toContain("| 90.0 KB | — |");
  });

  // ----- 異常系 -----
  it("上限の超過を量つきで示す", () => {
    expect(renderReport([verdict({ overLimit: 3 * KB })])).toContain("❌ 上限 +3.0 KB");
  });

  it("増分の超過を量つきで示す", () => {
    expect(renderReport([verdict({ overGrowth: 2 * KB })])).toContain("❌ 増分 +2.0 KB");
  });

  it("両方の超過を 1 行にまとめる", () => {
    expect(renderReport([verdict({ overLimit: 3 * KB, overGrowth: 2 * KB })])).toContain(
      "❌ 上限 +3.0 KB / 増分 +2.0 KB",
    );
  });
});
