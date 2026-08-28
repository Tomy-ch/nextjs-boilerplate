import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  createHistogram: vi.fn(),
  getMeter: vi.fn(),
}));

vi.mock("@opentelemetry/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@opentelemetry/api")>();
  return {
    ...actual,
    metrics: { getMeter: mocks.getMeter },
  };
});

const vital = {
  name: "LCP",
  value: 1234.5,
  rating: "good",
  navigationType: "navigate",
  route: "/products/[id]",
} as const;

describe("recordWebVital", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.record.mockReset();
    mocks.createHistogram.mockReset();
    mocks.createHistogram.mockReturnValue({ record: mocks.record });
    mocks.getMeter.mockReset();
    mocks.getMeter.mockReturnValue({ createHistogram: mocks.createHistogram });
  });

  // ----- 正常系 -----
  it("測定を、指標に対応する計器へ属性付きで記録する", async () => {
    const { recordWebVital } = await import("./web-vital-metric.server");

    recordWebVital(vital);

    expect(mocks.getMeter).toHaveBeenCalledWith("browser-telemetry");
    expect(mocks.createHistogram).toHaveBeenCalledWith("browser.web_vital.lcp", {
      unit: "ms",
      description: "Largest Contentful Paint",
      advice: { explicitBucketBoundaries: expect.arrayContaining([2500]) },
    });
    expect(mocks.record).toHaveBeenCalledWith(1234.5, {
      "http.route": "/products/[id]",
      "browser.web_vital.rating": "good",
      "browser.web_vital.navigation_type": "navigate",
    });
  });

  it("無次元の指標には、0 から 1 の間を刻む計器を使う", async () => {
    const { recordWebVital } = await import("./web-vital-metric.server");

    recordWebVital({ ...vital, name: "CLS", value: 0.03 });

    expect(mocks.createHistogram).toHaveBeenCalledWith("browser.web_vital.cls", {
      unit: "1",
      description: "Cumulative Layout Shift",
      advice: { explicitBucketBoundaries: [0, 0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 1] },
    });
  });

  it("操作の応答は、読み込みの時間と違う刻みで持つ", async () => {
    const { recordWebVital } = await import("./web-vital-metric.server");

    recordWebVital({ ...vital, name: "INP", value: 8 });

    expect(mocks.createHistogram.mock.calls[0]?.[1]).toMatchObject({
      advice: { explicitBucketBoundaries: expect.arrayContaining([16]) },
    });
  });

  it("同じ指標の 2 度目の測定で計器を作り直さない", async () => {
    const { recordWebVital } = await import("./web-vital-metric.server");

    recordWebVital(vital);
    recordWebVital({ ...vital, value: 2000 });

    expect(mocks.createHistogram).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledTimes(2);
  });

  it("指標ごとに別の計器を作る", async () => {
    const { recordWebVital } = await import("./web-vital-metric.server");

    recordWebVital(vital);
    recordWebVital({ ...vital, name: "INP", value: 8 });

    expect(mocks.createHistogram).toHaveBeenCalledTimes(2);
  });
});
