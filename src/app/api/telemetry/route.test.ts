import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  parseTelemetryReport as parseTelemetryReportType,
  recordTelemetryReport as recordTelemetryReportType,
} from "@/adapters/server/telemetry/browser-telemetry";

const { parseTelemetryReport, recordTelemetryReport } = vi.hoisted(() => ({
  parseTelemetryReport: vi.fn<typeof parseTelemetryReportType>(),
  recordTelemetryReport: vi.fn<typeof recordTelemetryReportType>(),
}));

vi.mock("@/adapters/server/telemetry/browser-telemetry", () => ({
  MAX_TELEMETRY_REPORT_BYTES: 16 * 1024,
  parseTelemetryReport,
  recordTelemetryReport,
}));

import { POST } from "./route";

const report = {
  kind: "web-vital",
  route: "/products/[id]",
  name: "LCP",
  value: 1234.5,
  rating: "good",
  navigationType: "navigate",
} as const;

function requestWith(body: string, contentType: string | null = "application/json"): Request {
  return new Request("http://localhost/api/telemetry", {
    method: "POST",
    ...(contentType === null ? {} : { headers: { "content-type": contentType } }),
    body,
  });
}

beforeEach(() => {
  parseTelemetryReport.mockReset();
  parseTelemetryReport.mockReturnValue(report);
  recordTelemetryReport.mockReset();
});

describe("POST", () => {
  // ----- 正常系 -----
  it("契約に沿う報告を記録し、内容を返さずに応える", async () => {
    const response = await POST(requestWith(JSON.stringify(report)));

    expect(response.status).toBe(204);
    expect(recordTelemetryReport).toHaveBeenCalledWith(report);
  });

  it("引数の付いた content-type も JSON として受ける", async () => {
    const response = await POST(
      requestWith(JSON.stringify(report), "Application/JSON; charset=utf-8"),
    );

    expect(response.status).toBe(204);
  });

  it("読み込んだ本体をそのまま検証へ渡す", async () => {
    await POST(requestWith(JSON.stringify(report)));

    expect(parseTelemetryReport).toHaveBeenCalledWith(report);
  });

  // ----- 異常系 -----
  it("JSON を名乗らない本体を 415 で落とす", async () => {
    const response = await POST(requestWith("name=LCP", "application/x-www-form-urlencoded"));

    expect(response.status).toBe(415);
    expect(parseTelemetryReport).not.toHaveBeenCalled();
  });

  it("型を名乗らない要求を 415 で落とす", async () => {
    const response = await POST(requestWith("{}", null));

    expect(response.status).toBe(415);
  });

  it("宣言された長さが上限を超える要求を、本体を読まずに 413 で落とす", async () => {
    const request = new Request("http://localhost/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": `${16 * 1024 + 1}` },
      body: "{}",
    });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(parseTelemetryReport).not.toHaveBeenCalled();
  });

  it("長さを偽った本体を、読んだうえで 413 で落とす", async () => {
    const response = await POST(requestWith(`"${"あ".repeat(16 * 1024)}"`));

    expect(response.status).toBe(413);
    expect(parseTelemetryReport).not.toHaveBeenCalled();
  });

  it("契約に沿わない本体を 400 で落とす", async () => {
    parseTelemetryReport.mockReturnValue(undefined);

    const response = await POST(requestWith("{}"));

    expect(response.status).toBe(400);
    expect(recordTelemetryReport).not.toHaveBeenCalled();
  });

  it("JSON として読めない本体を 400 で落とす", async () => {
    const response = await POST(requestWith("{"));

    expect(response.status).toBe(400);
    expect(parseTelemetryReport).not.toHaveBeenCalled();
  });
});
