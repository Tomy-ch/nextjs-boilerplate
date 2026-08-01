import { TraceFlags, trace } from "@opentelemetry/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractActiveTraceContext } from "./trace-context";

describe("extractActiveTraceContext", () => {
  it("有効な active span の trace_id と span_id を返す", () => {
    const span = trace.wrapSpanContext({
      traceId: "0123456789abcdef0123456789abcdef",
      spanId: "0123456789abcdef",
      traceFlags: TraceFlags.SAMPLED,
    });

    vi.spyOn(trace, "getActiveSpan").mockReturnValue(span);
    const result = extractActiveTraceContext();

    expect(result).toEqual({
      traceId: "0123456789abcdef0123456789abcdef",
      spanId: "0123456789abcdef",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("active span がなければ undefined を返す", () => {
    expect(extractActiveTraceContext()).toBeUndefined();
  });
});
