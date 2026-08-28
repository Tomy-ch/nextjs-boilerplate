import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportClientError, reportWebVital } from "./report-telemetry";

const TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

const measurement = {
  name: "LCP",
  value: 1234.5,
  rating: "good",
  navigationType: "navigate",
} as const;

function sentBody(beacon: ReturnType<typeof vi.fn>): Promise<string> {
  const blob: unknown = beacon.mock.calls[0]?.[1];

  return blob instanceof Blob ? blob.text() : Promise.reject(new Error("Blob が送られていない"));
}

function stubBeacon(accepted: boolean): ReturnType<typeof vi.fn> {
  const beacon = vi.fn(() => accepted);

  vi.stubGlobal("navigator", { sendBeacon: beacon });

  return beacon;
}

beforeEach(() => {
  stubBeacon(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reportWebVital", () => {
  // ----- 正常系 -----
  it("測定と route を中継の受け口へ送る", async () => {
    const beacon = stubBeacon(true);

    reportWebVital(measurement, "/products/[id]");

    expect(beacon.mock.calls[0]?.[0]).toBe("/api/telemetry");
    await expect(sentBody(beacon)).resolves.toBe(
      JSON.stringify({
        kind: "web-vital",
        route: "/products/[id]",
        name: "LCP",
        value: 1234.5,
        rating: "good",
        navigationType: "navigate",
      }),
    );
  });

  it("本体の型を JSON として名乗る", async () => {
    const beacon = stubBeacon(true);

    reportWebVital(measurement, "/");

    const blob: unknown = beacon.mock.calls[0]?.[1];

    expect(blob instanceof Blob ? blob.type : undefined).toBe("application/json");
    await expect(sentBody(beacon)).resolves.toContain("web-vital");
  });

  it("beacon を受け付けない実行では、離脱後も送る取得へ落とす", () => {
    stubBeacon(false);
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchImpl);

    reportWebVital(measurement, "/");

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: "POST", keepalive: true });
  });

  // ----- 異常系 -----
  it("契約に無い指標を送らない", () => {
    const beacon = stubBeacon(true);

    reportWebVital({ ...measurement, name: "Next.js-hydration" }, "/");

    expect(beacon).not.toHaveBeenCalled();
  });

  it("契約に無い評価を送らない", () => {
    const beacon = stubBeacon(true);

    reportWebVital({ ...measurement, rating: "unknown" }, "/");

    expect(beacon).not.toHaveBeenCalled();
  });

  it("契約に無い遷移種別を送らない", () => {
    const beacon = stubBeacon(true);

    reportWebVital({ ...measurement, navigationType: "soft-navigate" }, "/");

    expect(beacon).not.toHaveBeenCalled();
  });

  it("取得が失敗しても、その拒否を呼び出し元へ持ち出さない", async () => {
    stubBeacon(false);
    const rejected = new Error("送れない");
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw rejected;
    });
    vi.stubGlobal("fetch", fetchImpl);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    reportWebVital(measurement, "/");
    await new Promise((resolve) => setImmediate(resolve));
    process.off("unhandledRejection", unhandled);

    expect(fetchImpl).toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe("reportClientError", () => {
  // ----- 正常系 -----
  it("例外の分類・文言・stack を route と併せて送る", async () => {
    const beacon = stubBeacon(true);
    const error = new TypeError("読めない");
    error.stack = "TypeError: 読めない\n    at page";

    reportClientError(error, "/cart", TRACEPARENT);

    await expect(sentBody(beacon)).resolves.toBe(
      JSON.stringify({
        kind: "error",
        route: "/cart",
        name: "TypeError",
        message: "読めない",
        stack: "TypeError: 読めない\n    at page",
        traceparent: TRACEPARENT,
      }),
    );
  });

  it("stack を持たない例外では stack を載せない", async () => {
    const beacon = stubBeacon(true);
    const error = new Error("素の失敗");
    error.stack = undefined;

    reportClientError(error, "/", undefined);

    await expect(sentBody(beacon)).resolves.toBe(
      JSON.stringify({ kind: "error", route: "/", name: "Error", message: "素の失敗" }),
    );
  });

  // ----- 異常系 -----
  it("Error ではない値を、分類の付かない例外として送る", async () => {
    const beacon = stubBeacon(true);

    reportClientError("文字列が投げられた", "/", undefined);

    await expect(sentBody(beacon)).resolves.toBe(
      JSON.stringify({
        kind: "error",
        route: "/",
        name: "UnknownError",
        message: "文字列が投げられた",
      }),
    );
  });

  it("契約より長い文言と stack を切り詰めて送る", async () => {
    const beacon = stubBeacon(true);
    const error = new Error("あ".repeat(400));
    error.stack = "い".repeat(3000);

    reportClientError(error, "/", undefined);

    const sent: unknown = JSON.parse(await sentBody(beacon));

    expect(sent).toMatchObject({ message: "あ".repeat(300), stack: "い".repeat(2000) });
  });

  it("契約より長い分類名を切り詰めて送る", async () => {
    const beacon = stubBeacon(true);
    const error = new Error("失敗");
    error.name = "E".repeat(150);

    reportClientError(error, "/", undefined);

    const sent: unknown = JSON.parse(await sentBody(beacon));

    expect(sent).toMatchObject({ name: "E".repeat(100) });
  });
});
