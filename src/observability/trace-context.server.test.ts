import {
  type Context,
  type ContextManager,
  context,
  ROOT_CONTEXT,
  TraceFlags,
  trace,
} from "@opentelemetry/api";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  extractActiveTraceContext,
  findActiveTraceparent,
  withRemoteTraceContext,
} from "./trace-context.server";

const TRACE_ID = "0af7651916cd43dd8448eb211c80319c";
const SPAN_ID = "b7ad6b7169203331";

/**
 * 文脈を運ぶ最小の実装。
 *
 * 注入された文脈を読むには、それを運ぶ実装が要る。本番では起動境界の SDK が非同期をまたげる
 * ものを登録するが、ここで確かめるのは同期の入れ子だけなので、その範囲で足りるものを置く。
 */
class SynchronousContextManager implements ContextManager {
  #active: Context = ROOT_CONTEXT;

  active(): Context {
    return this.#active;
  }

  with<Args extends unknown[], Fn extends (...args: Args) => ReturnType<Fn>>(
    next: Context,
    fn: Fn,
    thisArg?: ThisParameterType<Fn>,
    ...args: Args
  ): ReturnType<Fn> {
    const previous = this.#active;
    this.#active = next;

    try {
      return fn.call(thisArg, ...args);
    } finally {
      this.#active = previous;
    }
  }

  bind<Target>(_next: Context, target: Target): Target {
    return target;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this.#active = ROOT_CONTEXT;
    return this;
  }
}

beforeAll(() => {
  context.setGlobalContextManager(new SynchronousContextManager());
});

afterAll(() => {
  context.disable();
});

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

describe("findActiveTraceparent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----- 正常系 -----
  it("採取された span を W3C の traceparent として書き出す", () => {
    vi.spyOn(trace, "getActiveSpan").mockReturnValue(
      trace.wrapSpanContext({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.SAMPLED }),
    );

    expect(findActiveTraceparent()).toBe(`00-${TRACE_ID}-${SPAN_ID}-01`);
  });

  it("採取されていない span でも書き出す", () => {
    vi.spyOn(trace, "getActiveSpan").mockReturnValue(
      trace.wrapSpanContext({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.NONE }),
    );

    expect(findActiveTraceparent()).toBe(`00-${TRACE_ID}-${SPAN_ID}-00`);
  });

  it("active span がなければ undefined を返す", () => {
    expect(findActiveTraceparent()).toBeUndefined();
  });
});

describe("withRemoteTraceContext", () => {
  // ----- 正常系 -----
  it("渡された traceparent を、その中の記録の trace にする", () => {
    withRemoteTraceContext(`00-${TRACE_ID}-${SPAN_ID}-01`, () => {
      expect(extractActiveTraceContext()).toEqual({ traceId: TRACE_ID, spanId: SPAN_ID });
    });
  });

  it("渡されなければ、外側の trace も引き継がない", () => {
    withRemoteTraceContext(`00-${TRACE_ID}-${SPAN_ID}-01`, () => {
      withRemoteTraceContext(undefined, () => {
        expect(extractActiveTraceContext()).toBeUndefined();
      });
    });
  });

  // ----- 異常系 -----
  it("形の違う値を受け付けない", () => {
    withRemoteTraceContext(`01-${TRACE_ID}-${SPAN_ID}-01`, () => {
      expect(extractActiveTraceContext()).toBeUndefined();
    });
    withRemoteTraceContext("読めない値", () => {
      expect(extractActiveTraceContext()).toBeUndefined();
    });
  });

  it("全 0 の識別子を受け付けない", () => {
    withRemoteTraceContext("00-00000000000000000000000000000000-0000000000000000-01", () => {
      expect(extractActiveTraceContext()).toBeUndefined();
    });
  });
});
