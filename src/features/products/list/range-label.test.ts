import { describe, expect, it } from "vitest";

import { formatRangeEdge, formatRangeLabel } from "./range-label";

function withUnit(value: string): string {
  return `${value} 個`;
}

describe("formatRangeEdge", () => {
  // ----- 正常系 -----
  it("値のある端は渡された表示で出す", () => {
    expect(formatRangeEdge("5", "low", withUnit)).toBe("5 個");
  });

  it("空の下限を下限なしと呼ぶ", () => {
    expect(formatRangeEdge("", "low", withUnit)).toBe("下限なし");
  });

  it("空の上限を上限なしと呼ぶ", () => {
    expect(formatRangeEdge("", "high", withUnit)).toBe("上限なし");
  });
});

describe("formatRangeLabel", () => {
  // ----- 正常系 -----
  it("下限と上限を渡された表示で 1 つにまとめる", () => {
    expect(formatRangeLabel("5", "10", withUnit)).toBe("5 個 〜 10 個");
  });

  it("下限だけなら、上限を上限なしと呼ぶ", () => {
    expect(formatRangeLabel("5", "", withUnit)).toBe("5 個 〜 上限なし");
  });

  it("上限だけなら、下限を下限なしと呼ぶ", () => {
    expect(formatRangeLabel("", "10", withUnit)).toBe("下限なし 〜 10 個");
  });

  it("下限も上限も空なら undefined を返す", () => {
    expect(formatRangeLabel("", "", withUnit)).toBeUndefined();
  });
});
