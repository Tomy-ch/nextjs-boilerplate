import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TelemetryReport } from "@/adapters/http/telemetry-report";

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  recordWebVital: vi.fn(),
  withRemoteTraceContext: vi.fn(),
}));

vi.mock("@/logging/logging.server", () => ({
  getLogger: () => ({ error: mocks.error, debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  reportQuietly: (report: () => void) => {
    try {
      report();
    } catch {
      // production と同じく、記録の失敗を呼び出し元へ持ち出さない。
    }
  },
}));

vi.mock("@/observability/web-vital-metric.server", () => ({
  recordWebVital: mocks.recordWebVital,
}));

vi.mock("@/observability/trace-context.server", () => ({
  withRemoteTraceContext: (traceparent: string | undefined, run: () => void) => {
    mocks.withRemoteTraceContext(traceparent);
    run();
  },
}));

import {
  MAX_TELEMETRY_REPORT_BYTES,
  parseTelemetryReport,
  recordTelemetryReport,
} from "./browser-telemetry";

const webVital = {
  kind: "web-vital",
  route: "/docs/[slug]",
  name: "LCP",
  value: 1234.5,
  rating: "good",
  navigationType: "navigate",
} as const satisfies TelemetryReport;

const clientError = {
  kind: "error",
  route: "/terms",
  name: "TypeError",
  message: "読めない",
  stack: "TypeError: 読めない",
} as const satisfies TelemetryReport;

beforeEach(() => {
  mocks.error.mockReset();
  mocks.recordWebVital.mockReset();
  mocks.withRemoteTraceContext.mockReset();
});

describe("MAX_TELEMETRY_REPORT_BYTES", () => {
  // ----- 正常系 -----
  it("契約が許す最大の報告が収まる大きさである", () => {
    // 1 文字が最も膨らむのは制御文字で、JSON では 1 文字が `\u0001` の 6 バイトになる。
    const worst = (length: number): string => "\u0001".repeat(length);
    const largest = JSON.stringify({
      ...clientError,
      route: worst(200),
      name: worst(100),
      message: worst(300),
      stack: worst(2000),
    });

    expect(new TextEncoder().encode(largest).byteLength).toBeLessThanOrEqual(
      MAX_TELEMETRY_REPORT_BYTES,
    );
  });
});

describe("parseTelemetryReport", () => {
  // ----- 正常系 -----
  it("契約に沿う Web Vitals の報告を読む", () => {
    expect(parseTelemetryReport(webVital)).toEqual(webVital);
  });

  it("契約に沿う例外の報告を読む", () => {
    expect(parseTelemetryReport(clientError)).toEqual(clientError);
  });

  it("stack を持たない例外の報告を読む", () => {
    const withoutStack = { ...clientError, stack: undefined };

    expect(parseTelemetryReport(withoutStack)).toEqual({
      kind: "error",
      route: "/terms",
      name: "TypeError",
      message: "読めない",
    });
  });

  // ----- 異常系 -----
  it("種別を名乗らない本体を落とす", () => {
    expect(parseTelemetryReport({ route: "/" })).toBeUndefined();
  });

  it("契約に無い指標の報告を落とす", () => {
    expect(parseTelemetryReport({ ...webVital, name: "TBT" })).toBeUndefined();
  });

  it("測定値が数でない報告を落とす", () => {
    expect(parseTelemetryReport({ ...webVital, value: "1234" })).toBeUndefined();
  });

  it("契約より長い文言の報告を落とす", () => {
    const tooLong = { ...clientError, message: "あ".repeat(301) };

    expect(parseTelemetryReport(tooLong)).toBeUndefined();
  });

  it("契約より長い分類名の報告を落とす", () => {
    const tooLong = { ...clientError, name: "N".repeat(101) };

    expect(parseTelemetryReport(tooLong)).toBeUndefined();
  });

  it("契約より長い stack の報告を落とす", () => {
    const tooLong = { ...clientError, stack: "s".repeat(2001) };

    expect(parseTelemetryReport(tooLong)).toBeUndefined();
  });

  it("契約より長い route の報告を落とす", () => {
    const tooLong = { ...webVital, route: "/".repeat(201) };

    expect(parseTelemetryReport(tooLong)).toBeUndefined();
  });
});

describe("recordTelemetryReport", () => {
  // ----- 正常系 -----
  it("Web Vitals を metric として記録する", () => {
    recordTelemetryReport(webVital);

    expect(mocks.recordWebVital).toHaveBeenCalledWith(webVital);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("例外を semconv の属性を付けた構造化ログとして記録する", () => {
    recordTelemetryReport(clientError);

    expect(mocks.error).toHaveBeenCalledWith("ブラウザで捕捉されない例外が発生しました", {
      "exception.type": "TypeError",
      "exception.message": "読めない",
      "exception.stacktrace": "TypeError: 読めない",
      "http.route": "/terms",
    });
  });

  it("報告が持つ trace の文脈で記録する", () => {
    const traceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";

    recordTelemetryReport({ ...clientError, traceparent });

    expect(mocks.withRemoteTraceContext).toHaveBeenCalledWith(traceparent);
  });

  it("trace の文脈が渡らない報告では、文脈を空にして記録する", () => {
    recordTelemetryReport(clientError);

    expect(mocks.withRemoteTraceContext).toHaveBeenCalledWith(undefined);
  });

  it("stack を持たない例外では stacktrace を載せない", () => {
    recordTelemetryReport({ kind: "error", route: "/", name: "Error", message: "失敗" });

    expect(mocks.error).toHaveBeenCalledWith("ブラウザで捕捉されない例外が発生しました", {
      "exception.type": "Error",
      "exception.message": "失敗",
      "http.route": "/",
    });
  });

  // ----- 異常系 -----
  it("記録が失敗しても呼び出し元へ持ち出さず、ログにも積まない", () => {
    mocks.recordWebVital.mockImplementation(() => {
      throw new Error("送出できない");
    });

    expect(() => {
      recordTelemetryReport(webVital);
    }).not.toThrow();
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
