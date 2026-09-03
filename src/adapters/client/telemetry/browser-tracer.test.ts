// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn<(config: { contextManager: ContextManager }) => void>(),
  forceFlush: vi.fn(),
  updateName: vi.fn(),
  setAttribute: vi.fn(),
  enableInstrumentation: vi.fn(),
  provider: vi.fn(),
  processor: vi.fn(),
  serialize: vi.fn(),
  sendBeacon: vi.fn(),
  instrumentation: vi.fn(),
  stackActive: vi.fn(),
}));

const SPAN_CONTEXT = {
  traceId: "0af7651916cd43dd8448eb211c80319c",
  spanId: "b7ad6b7169203331",
  traceFlags: 1,
};

vi.mock("@opentelemetry/otlp-transformer", () => ({
  JsonTraceSerializer: { serializeRequest: mocks.serialize },
}));

vi.mock("@opentelemetry/sdk-trace-web", () => ({
  WebTracerProvider: class {
    constructor(options: unknown) {
      mocks.provider(options);
    }
    register = mocks.register;
    forceFlush = mocks.forceFlush;
  },
  BatchSpanProcessor: class {
    constructor(exporter: unknown, options: unknown) {
      mocks.processor(exporter, options);
    }
  },
  StackContextManager: class {
    active(): unknown {
      return mocks.stackActive();
    }
    enable(): this {
      return this;
    }
  },
}));

vi.mock("@opentelemetry/instrumentation-fetch", () => ({
  FetchInstrumentation: class {
    constructor(config: unknown) {
      mocks.instrumentation(config);
    }
    enable = mocks.enableInstrumentation;
  },
}));

import { type Context, type ContextManager, ROOT_CONTEXT, trace } from "@opentelemetry/api";

/** 立ち上げ済みかを覚えるので、1 件ごとに読み直す。 */
async function load(): Promise<typeof import("./browser-tracer")> {
  return import("./browser-tracer");
}

const TRACEPARENT = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";

/** 立ち上げ時に登録された文脈の実装から、有効な文脈を読む。 */
function activeContext(): Context {
  const manager = mocks.register.mock.calls[0]?.[0].contextManager;

  if (manager === undefined) {
    throw new Error("文脈の実装が登録されていない");
  }

  return manager.active();
}

/** 立ち上げ時に組まれた送出の口へ、span を渡す。 */
function exportSpans(spans: unknown[], done: (result: { code: number }) => void): void {
  const built: unknown = mocks.processor.mock.calls[0]?.[0];

  if (
    typeof built !== "object" ||
    built === null ||
    !("export" in built) ||
    typeof built.export !== "function"
  ) {
    throw new Error("送出の口が組まれていない");
  }

  built.export(spans, done);
}

/** 送出の口が持つ、待ちの口を呼ぶ。 */
async function awaitExporter(name: "shutdown" | "forceFlush"): Promise<unknown> {
  const built: Readonly<Record<string, unknown>> = mocks.processor.mock.calls[0]?.[0];
  const method = built[name];

  if (typeof method !== "function") {
    throw new Error("送出の口が組まれていない");
  }

  return method();
}

/** 立ち上げ時に渡された、span を名づけるフックを取り出す。 */
function nameSpan(request: Request | RequestInit, result: unknown): void {
  const config: unknown = mocks.instrumentation.mock.calls[0]?.[0];
  const hook =
    typeof config === "object" && config !== null && "applyCustomAttributesOnSpan" in config
      ? config.applyCustomAttributesOnSpan
      : undefined;

  if (typeof hook !== "function") {
    throw new Error("span を名づけるフックが渡されていない");
  }

  hook({ updateName: mocks.updateName, setAttribute: mocks.setAttribute }, request, result);
}

let listeners: (() => void)[] = [];

afterEach(() => {
  for (const remove of listeners) {
    remove();
  }
  listeners = [];
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.resetModules();

  // production は畳む口を持たないので、登録そのものをここで捕まえて afterEach で外す。
  const add = document.addEventListener.bind(document);
  vi.spyOn(document, "addEventListener").mockImplementation((type, handler, options) => {
    add(type, handler, options);
    listeners.push(() => {
      document.removeEventListener(type, handler, options);
    });
  });

  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }

  mocks.stackActive.mockReturnValue(ROOT_CONTEXT);
  mocks.serialize.mockReturnValue(new TextEncoder().encode('{"resourceSpans":[]}'));
  vi.stubGlobal("navigator", { sendBeacon: mocks.sendBeacon });
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

describe("startBrowserTracing", () => {
  // ----- 正常系 -----
  it("計装を大域へ登録する", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);

    expect(mocks.register).toHaveBeenCalled();
  });

  it("1 回に送る span の数を、中継の上限に収まる数で切る", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);

    expect(mocks.processor.mock.calls[0]?.[1]).toEqual({ maxExportBatchSize: 32 });
  });

  it("ブラウザが出す要求をすべて包む", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);

    expect(mocks.enableInstrumentation).toHaveBeenCalled();
  });

  it("何も囲まれていないとき、画面を組んだ要求を親にする", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);

    expect(trace.getSpanContext(activeContext())).toMatchObject({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
    });
  });

  it("囲まれている間は、その内側の文脈を親にする", async () => {
    const inner = trace.setSpanContext(ROOT_CONTEXT, SPAN_CONTEXT);
    (await load()).startBrowserTracing(TRACEPARENT);
    mocks.stackActive.mockReturnValue(inner);

    expect(activeContext()).toBe(inner);
  });

  it("span を要求の方式とパスで名づけ、クエリを名前に載せない", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    nameSpan(new Request("http://localhost/api/docs?first=20"), undefined);

    expect(mocks.updateName).toHaveBeenCalledWith("GET /api/docs");
    expect(mocks.setAttribute).toHaveBeenCalledWith("url.path", "/api/docs");
  });

  it("要求先を応答からも読む", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    nameSpan({ method: "POST" }, { url: "http://localhost/api/telemetry" });

    expect(mocks.updateName).toHaveBeenCalledWith("POST /api/telemetry");
  });

  it("方式を名乗らない要求を GET として名づける", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    nameSpan({}, { url: "http://localhost/docs/42?_rsc=abc" });

    expect(mocks.updateName).toHaveBeenCalledWith("GET /docs/42");
  });

  it("span を OTLP へ直列化して中継へ送る", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    const done = vi.fn();

    exportSpans([{ name: "GET /api/docs" }], done);

    expect(mocks.serialize).toHaveBeenCalledWith([{ name: "GET /api/docs" }]);
    expect(mocks.sendBeacon.mock.calls[0]?.[0]).toBe("/api/telemetry/traces");
    expect(done).toHaveBeenCalledWith({ code: 0 });
  });

  it("画面が隠れたときに溜めた span を送り切る", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(mocks.forceFlush).toHaveBeenCalled();
  });

  it("画面が見えている間は送り切らない", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    document.dispatchEvent(new Event("visibilitychange"));

    expect(mocks.forceFlush).not.toHaveBeenCalled();
  });

  it("2 度目の呼び出しでは何もしない", async () => {
    const tracing = await load();

    tracing.startBrowserTracing(TRACEPARENT);
    tracing.startBrowserTracing(TRACEPARENT);

    expect(mocks.provider).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.enableInstrumentation).toHaveBeenCalledTimes(1);
  });

  // ----- 異常系 -----
  it("画面を組んだ要求が渡らないときは、新しい trace を始める", async () => {
    (await load()).startBrowserTracing(undefined);

    expect(activeContext()).toBe(ROOT_CONTEXT);
  });

  it("直列化できない span を送らず、送出を終わったものとして閉じる", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    mocks.serialize.mockReturnValue(undefined);
    const done = vi.fn();

    exportSpans([], done);

    expect(mocks.sendBeacon).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith({ code: 0 });
  });

  it("送出は beacon が引き受けるので、待つ口は何もしない", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);

    await expect(awaitExporter("shutdown")).resolves.toBeUndefined();
    await expect(awaitExporter("forceFlush")).resolves.toBeUndefined();
  });

  it("要求先が読めないときは名づけ直さない", async () => {
    (await load()).startBrowserTracing(TRACEPARENT);
    nameSpan({}, { message: "取得できない" });
    nameSpan({}, { url: "" });
    nameSpan({}, null);
    nameSpan({}, "応答ではない値");

    expect(mocks.updateName).not.toHaveBeenCalled();
  });
});
