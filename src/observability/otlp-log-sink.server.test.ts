import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  getLogger: vi.fn(),
}));

vi.mock("@opentelemetry/api-logs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@opentelemetry/api-logs")>();
  return {
    ...actual,
    logs: { getLogger: mocks.getLogger },
  };
});

describe("createOtlpLogSink", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.emit.mockReset();
    mocks.getLogger.mockReset();
    mocks.getLogger.mockReturnValue({ emit: mocks.emit });
  });

  it("OTel Logs API へ対応する severity と属性を送る", async () => {
    const { createOtlpLogSink } = await import("./otlp-log-sink.server");
    const sink = createOtlpLogSink("Boilerplate Web");

    sink({
      level: "warn",
      message: "認証に失敗しました",
      fields: {
        retry_count: 1,
        retryable: true,
        value: null,
        nested: { reason: "expired" },
        binary: new Uint8Array([1]),
        values: ["one", 2],
        invalid_values: ["one", Symbol("value")],
        unsupported: Symbol("value"),
      },
    });

    expect(mocks.getLogger).toHaveBeenCalledWith("Boilerplate Web");
    expect(mocks.emit).toHaveBeenCalledWith({
      severityNumber: 13,
      severityText: "warn",
      body: "認証に失敗しました",
      attributes: {
        retry_count: 1,
        retryable: true,
        value: null,
        nested: { reason: "expired" },
        binary: new Uint8Array([1]),
        values: ["one", 2],
      },
    });
  });
});
