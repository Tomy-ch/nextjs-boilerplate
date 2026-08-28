import { describe, expect, it } from "vitest";

import {
  formatCspViolation,
  formatProblems,
  isReportableConsoleError,
  isServerError,
  isTransportFailure,
} from "./browser-errors";

describe("isTransportFailure", () => {
  // ----- 正常系 -----
  it("接続そのものの失敗を異常として数える", () => {
    expect(isTransportFailure("net::ERR_CONNECTION_REFUSED")).toBe(true);
  });

  // ----- 異常系 -----
  it("Chromium が報せる打ち切りを異常として数えない", () => {
    expect(isTransportFailure("net::ERR_ABORTED")).toBe(false);
  });

  it("Firefox が報せる打ち切りを異常として数えない", () => {
    expect(isTransportFailure("NS_BINDING_ABORTED")).toBe(false);
  });

  it("WebKit が報せる打ち切りを異常として数えない", () => {
    expect(isTransportFailure("Load request cancelled")).toBe(false);
  });

  it("理由が読めない失敗を異常として数えない", () => {
    expect(isTransportFailure(undefined)).toBe(false);
  });
});

describe("isReportableConsoleError", () => {
  // ----- 正常系 -----
  it("JavaScript が書いた error を異常として数える", () => {
    expect(isReportableConsoleError("error", 1)).toBe(true);
  });

  // ----- 異常系 -----
  it("ブラウザ自身が書いた error を異常として数えない", () => {
    expect(isReportableConsoleError("error", 0)).toBe(false);
  });

  it("警告を異常として数えない", () => {
    expect(isReportableConsoleError("warning", 1)).toBe(false);
  });

  it("開発中の出力を異常として数えない", () => {
    expect(isReportableConsoleError("log", 1)).toBe(false);
  });
});

describe("isServerError", () => {
  // ----- 正常系 -----
  it("5xx を異常として数える", () => {
    expect(isServerError(500)).toBe(true);
  });

  // ----- 異常系 -----
  it("5xx の 1 つ手前を異常として数えない", () => {
    expect(isServerError(499)).toBe(false);
  });

  it("設計された 4xx を異常として数えない", () => {
    expect(isServerError(404)).toBe(false);
  });

  it("成功を異常として数えない", () => {
    expect(isServerError(200)).toBe(false);
  });
});

describe("formatCspViolation", () => {
  // ----- 正常系 -----
  it("拒んだディレクティブと読み込み先に、出所を添える", () => {
    expect(
      formatCspViolation({
        violatedDirective: "script-src-elem",
        blockedURI: "https://probe.invalid/script.js",
        sourceFile: "http://127.0.0.1:3000/about",
        lineNumber: 12,
      }),
    ).toBe(
      "script-src-elem が https://probe.invalid/script.js を拒否 (http://127.0.0.1:3000/about:12)",
    );
  });

  // ----- 異常系 -----
  it("出所が採れなければ場所を省く", () => {
    expect(
      formatCspViolation({
        violatedDirective: "img-src",
        blockedURI: "data",
        sourceFile: "",
        lineNumber: 0,
      }),
    ).toBe("img-src が data を拒否");
  });
});

describe("formatProblems", () => {
  // ----- 正常系 -----
  it("経路を頭に出して 1 行ずつ並べる", () => {
    expect(
      formatProblems([
        { kind: "console", detail: "Hydration failed" },
        { kind: "exception", detail: "TypeError" },
      ]),
    ).toBe("[console] Hydration failed\n[exception] TypeError");
  });

  it("異常が無ければ空文字を返す", () => {
    expect(formatProblems([])).toBe("");
  });
});
