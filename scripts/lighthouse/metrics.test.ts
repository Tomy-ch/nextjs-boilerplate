import { describe, expect, it } from "vitest";

import { aggregate, median, readMetrics } from "./metrics";

/** LHR の、判定に要る部分だけを組み立てる。 */
function lhr(values: { lcp?: number; cls?: number; tbt?: number } = {}): Record<string, unknown> {
  return {
    requestedUrl: "http://127.0.0.1:3300/",
    audits: {
      "largest-contentful-paint": { numericValue: values.lcp ?? 1200 },
      "cumulative-layout-shift": { numericValue: values.cls ?? 0.02 },
      "total-blocking-time": { numericValue: values.tbt ?? 40 },
    },
  };
}

describe("readMetrics", () => {
  // ----- 正常系 -----
  it("LCP / CLS / TBT を取り出す", () => {
    expect(readMetrics(lhr({ lcp: 2100, cls: 0.05, tbt: 120 }))).toEqual({
      lcpMs: 2100,
      clsScore: 0.05,
      tbtMs: 120,
    });
  });

  it("0 の指標もそのまま読む", () => {
    expect(readMetrics(lhr({ cls: 0 })).clsScore).toBe(0);
  });

  // ----- 異常系 -----
  it("計測そのものが失敗していれば、符牒と説明の両方を添えて落ちる", () => {
    expect(() =>
      readMetrics({
        ...lhr(),
        runtimeError: { code: "NO_FCP", message: "描画されませんでした" },
      }),
    ).toThrow("NO_FCP 描画されませんでした");
  });

  it("指標が欠けていれば、どの audit が無いかを言って落ちる", () => {
    expect(() => readMetrics({ requestedUrl: "http://127.0.0.1:3300/", audits: {} })).toThrow(
      "largest-contentful-paint",
    );
  });

  it("指標が数値でなければ、その audit を指して落ちる", () => {
    expect(() =>
      readMetrics({
        requestedUrl: "http://127.0.0.1:3300/",
        audits: { "largest-contentful-paint": { numericValue: null } },
      }),
    ).toThrow("largest-contentful-paint");
  });

  it("指標が負であれば、その audit を指して落ちる", () => {
    expect(() => readMetrics(lhr({ lcp: -1 }))).toThrow("largest-contentful-paint");
  });

  it("LHR の形そのものが違えば落ちる", () => {
    expect(() => readMetrics({})).toThrow();
  });
});

describe("median", () => {
  // ----- 正常系 -----
  it("奇数個なら真ん中を返す", () => {
    expect(median([300, 100, 200])).toBe(200);
  });

  it("偶数個なら小さい側を返す", () => {
    expect(median([100, 200, 300, 400])).toBe(200);
  });

  it("1 つだけならそれを返す", () => {
    expect(median([42])).toBe(42);
  });

  it("極端に遅い 1 回に引きずられない", () => {
    expect(median([100, 110, 9000])).toBe(110);
  });

  // ----- 異常系 -----
  it("試行が 1 つも無ければ落ちる", () => {
    expect(() => median([])).toThrow("試行が 1 つもありません");
  });
});

describe("aggregate", () => {
  // ----- 正常系 -----
  it("指標ごとに独立して中央値を採る", () => {
    expect(
      aggregate([
        { lcpMs: 3000, clsScore: 0.01, tbtMs: 50 },
        { lcpMs: 1000, clsScore: 0.3, tbtMs: 200 },
        { lcpMs: 2000, clsScore: 0.02, tbtMs: 10 },
      ]),
    ).toEqual({ lcpMs: 2000, clsScore: 0.02, tbtMs: 50 });
  });

  // ----- 異常系 -----
  it("試行が 1 つも無ければ、中央値を採る側の理由で落ちる", () => {
    expect(() => aggregate([])).toThrow("試行が 1 つもありません");
  });
});
