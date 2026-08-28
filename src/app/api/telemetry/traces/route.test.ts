import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  forwardTraceExport as forwardTraceExportType,
  parseTraceExport as parseTraceExportType,
} from "@/adapters/server/telemetry/browser-traces";

const { forwardTraceExport, parseTraceExport } = vi.hoisted(() => ({
  forwardTraceExport: vi.fn<typeof forwardTraceExportType>(),
  parseTraceExport: vi.fn<typeof parseTraceExportType>(),
}));

vi.mock("@/adapters/server/telemetry/browser-traces", () => ({
  MAX_TRACE_EXPORT_BYTES: 128 * 1024,
  forwardTraceExport,
  parseTraceExport,
}));

import { POST } from "./route";

const traces = { resourceSpans: [{ scopeSpans: [] }] };

function requestWith(body: string, contentType: string | null = "application/json"): Request {
  return new Request("http://localhost/api/telemetry/traces", {
    method: "POST",
    ...(contentType === null ? {} : { headers: { "content-type": contentType } }),
    body,
  });
}

beforeEach(() => {
  parseTraceExport.mockReset();
  parseTraceExport.mockReturnValue(traces);
  forwardTraceExport.mockReset();
  forwardTraceExport.mockResolvedValue(undefined);
});

describe("POST", () => {
  // ----- 正常系 -----
  it("OTLP の封筒を中継し、内容を返さずに応える", async () => {
    const response = await POST(requestWith(JSON.stringify(traces)));

    expect(response.status).toBe(204);
    expect(forwardTraceExport).toHaveBeenCalledWith(traces);
  });

  it("引数の付いた content-type も JSON として受ける", async () => {
    const response = await POST(
      requestWith(JSON.stringify(traces), "Application/JSON; charset=utf-8"),
    );

    expect(response.status).toBe(204);
  });

  it("読み込んだ本体をそのまま検証へ渡す", async () => {
    await POST(requestWith(JSON.stringify(traces)));

    expect(parseTraceExport).toHaveBeenCalledWith(traces);
  });

  // ----- 異常系 -----
  it("JSON を名乗らない本体を 415 で落とす", async () => {
    const response = await POST(requestWith("resourceSpans=1", "text/plain"));

    expect(response.status).toBe(415);
    expect(parseTraceExport).not.toHaveBeenCalled();
  });

  it("型を名乗らない要求を 415 で落とす", async () => {
    const response = await POST(requestWith("{}", null));

    expect(response.status).toBe(415);
  });

  it("宣言された長さが上限を超える要求を、本体を読まずに 413 で落とす", async () => {
    const request = new Request("http://localhost/api/telemetry/traces", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": `${128 * 1024 + 1}` },
      body: "{}",
    });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(parseTraceExport).not.toHaveBeenCalled();
  });

  it("長さを偽った本体を、読んだうえで 413 で落とす", async () => {
    const response = await POST(requestWith(`"${"あ".repeat(128 * 1024)}"`));

    expect(response.status).toBe(413);
    expect(parseTraceExport).not.toHaveBeenCalled();
  });

  it("封筒に見えない本体を 400 で落とす", async () => {
    parseTraceExport.mockReturnValue(undefined);

    const response = await POST(requestWith("{}"));

    expect(response.status).toBe(400);
    expect(forwardTraceExport).not.toHaveBeenCalled();
  });

  it("JSON として読めない本体を 400 で落とす", async () => {
    const response = await POST(requestWith("{"));

    expect(response.status).toBe(400);
    expect(parseTraceExport).not.toHaveBeenCalled();
  });
});
