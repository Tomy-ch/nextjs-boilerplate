import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
  getObservabilityConfig: vi.fn(),
}));

vi.mock("@/logging/logging.server", () => ({
  getLogger: () => ({ warn: mocks.warn, debug: vi.fn(), info: vi.fn(), error: vi.fn() }),
  reportQuietly: (report: () => void) => {
    report();
  },
}));

vi.mock("@/config/observability/observability.server", () => ({
  getObservabilityConfig: mocks.getObservabilityConfig,
}));

import { forwardTraceExport, MAX_TRACE_EXPORT_BYTES, parseTraceExport } from "./browser-traces";

const span = { name: "GET /api/docs", spanId: "b7ad6b7169203331" };

function exportOf(attributes: readonly unknown[] = []): string {
  return JSON.stringify({
    resourceSpans: [{ resource: { attributes }, scopeSpans: [{ spans: [span] }] }],
  });
}

function stubFetch(status: number): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

function sentBody(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>): unknown {
  const body = fetchImpl.mock.calls[0]?.[1]?.body;

  return typeof body === "string" ? JSON.parse(body) : undefined;
}

beforeEach(() => {
  mocks.warn.mockReset();
  mocks.getObservabilityConfig.mockReturnValue({
    tracesEnabled: true,
    otlpEndpoint: "http://collector.example.test",
    serviceName: "Boilerplate Web",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MAX_TRACE_EXPORT_BYTES", () => {
  // ----- 正常系 -----
  it("ブラウザが 1 回に載せる span の数を収められる大きさである", () => {
    const batch = JSON.stringify({
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [{ spans: Array.from({ length: 32 }, () => span) }],
        },
      ],
    });

    expect(new TextEncoder().encode(batch).byteLength).toBeLessThanOrEqual(MAX_TRACE_EXPORT_BYTES);
  });
});

describe("parseTraceExport", () => {
  // ----- 正常系 -----
  it("OTLP の封筒を、中身を読み替えずに通す", () => {
    expect(parseTraceExport(JSON.parse(exportOf()))).toEqual(JSON.parse(exportOf()));
  });

  it("上限ちょうどの resource を並べた本体を通す", () => {
    const atLimit = { resourceSpans: Array.from({ length: 4 }, () => ({ scopeSpans: [] })) };

    expect(parseTraceExport(atLimit)).toEqual(atLimit);
  });

  // ----- 異常系 -----
  it("封筒を名乗らない本体を落とす", () => {
    expect(parseTraceExport({ spans: [span] })).toBeUndefined();
  });

  it("span を 1 つも持たない本体を落とす", () => {
    expect(parseTraceExport({ resourceSpans: [] })).toBeUndefined();
  });

  it("resource を過剰に並べた本体を落とす", () => {
    const many = { resourceSpans: Array.from({ length: 5 }, () => ({ scopeSpans: [] })) };

    expect(parseTraceExport(many)).toBeUndefined();
  });
});

describe("forwardTraceExport", () => {
  // ----- 正常系 -----
  it("collector の trace の口へ OTLP をそのまま渡す", async () => {
    const fetchImpl = stubFetch(200);

    await forwardTraceExport(JSON.parse(exportOf()));

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("http://collector.example.test/v1/traces");
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it("service 名を、このアプリが名乗っているものに揃える", async () => {
    const fetchImpl = stubFetch(200);

    await forwardTraceExport(JSON.parse(exportOf()));

    expect(sentBody(fetchImpl)).toMatchObject({
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: "service.name", value: { stringValue: "Boilerplate Web" } }],
          },
        },
      ],
    });
  });

  it("伏せる名前の属性を、値を差し替えて渡す", async () => {
    const fetchImpl = stubFetch(200);
    const withSecret = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              spans: [
                {
                  name: "GET /api/docs",
                  attributes: [
                    { key: "url.path", value: { stringValue: "/api/docs" } },
                    { key: "Authorization", value: { stringValue: "Bearer 秘密" } },
                    { key: "token", value: { stringValue: "秘密" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    await forwardTraceExport(withSecret);

    const sent = JSON.stringify(sentBody(fetchImpl));

    expect(sent).not.toContain("秘密");
    expect(sent).toContain("[REDACTED]");
    expect(sent).toContain("/api/docs");
  });

  it("span を持たない封筒でも渡せる", async () => {
    const fetchImpl = stubFetch(200);

    await forwardTraceExport(JSON.parse(exportOf()));

    expect(sentBody(fetchImpl)).toMatchObject({
      resourceSpans: [{ scopeSpans: [{ spans: [span] }] }],
    });
  });

  it("ブラウザが名乗った service 名を捨てる", async () => {
    const fetchImpl = stubFetch(200);

    await forwardTraceExport(
      JSON.parse(exportOf([{ key: "service.name", value: { stringValue: "なりすまし" } }])),
    );

    expect(JSON.stringify(sentBody(fetchImpl))).not.toContain("なりすまし");
  });

  it("resource を名乗らない封筒にも service 名を足す", async () => {
    const fetchImpl = stubFetch(200);

    await forwardTraceExport(JSON.parse(JSON.stringify({ resourceSpans: [{ scopeSpans: [] }] })));

    expect(sentBody(fetchImpl)).toMatchObject({
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: "service.name", value: { stringValue: "Boilerplate Web" } }],
          },
        },
      ],
    });
  });

  // ----- 異常系 -----
  it("trace が無効な構成では送らない", async () => {
    const fetchImpl = stubFetch(200);
    mocks.getObservabilityConfig.mockReturnValue({
      tracesEnabled: false,
      otlpEndpoint: "http://collector.example.test",
      serviceName: "Boilerplate Web",
    });

    await forwardTraceExport(JSON.parse(exportOf()));

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("collector が受け付けなかったことを記録する", async () => {
    stubFetch(503);

    await forwardTraceExport(JSON.parse(exportOf()));

    expect(mocks.warn).toHaveBeenCalledWith("ブラウザの span を collector へ渡せませんでした", {
      "http.response.status_code": 503,
    });
  });

  it("collector へ届かなかったことを記録し、呼び出し元へ投げ直さない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(forwardTraceExport(JSON.parse(exportOf()))).resolves.toBeUndefined();
    expect(mocks.warn).toHaveBeenCalledWith("ブラウザの span を collector へ渡せませんでした", {
      "exception.type": "TypeError",
      "exception.message": "TypeError: fetch failed",
    });
  });

  it("Error ではない値が投げられても投げ直さない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw "文字列が投げられた";
      }),
    );

    await expect(forwardTraceExport(JSON.parse(exportOf()))).resolves.toBeUndefined();
    expect(mocks.warn).toHaveBeenCalledWith("ブラウザの span を collector へ渡せませんでした", {
      "exception.type": "UnknownError",
      "exception.message": "文字列が投げられた",
    });
  });
});
