import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTracer: vi.fn(),
  startActiveSpan: vi.fn(),
  end: vi.fn(),
  setStatus: vi.fn(),
  recordException: vi.fn(),
}));

vi.mock("@opentelemetry/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@opentelemetry/api")>();
  return {
    ...actual,
    trace: { ...actual.trace, getTracer: mocks.getTracer },
  };
});

/**
 * 注入まで済ませた計装を読み込む。範囲を渡さない呼び出しは、注入を受けていない実行を表す。
 *
 * @remarks
 * 注入先は realm の registered symbol なので `vi.resetModules()` では消えません。テストごとに
 * 消して、前のケースの範囲を持ち越さないようにします。
 */
async function loadRenderSpan(scope?: { screens: boolean; parts: boolean }) {
  Reflect.deleteProperty(globalThis, Symbol.for("nextjs-boilerplate.observability.render-spans"));

  const module = await import("./render-span");

  if (scope !== undefined) {
    module.configureRenderSpans(scope);
  }

  return module;
}

describe("withScreenSpan", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
    mocks.startActiveSpan.mockImplementation((_name: string, run: (span: unknown) => unknown) =>
      run({ end: mocks.end, setStatus: mocks.setStatus, recordException: mocks.recordException }),
    );
    mocks.getTracer.mockReturnValue({ startActiveSpan: mocks.startActiveSpan });
  });

  it("範囲が注入されていなければ span を作らず、描画をそのまま返す", async () => {
    const { withScreenSpan } = await loadRenderSpan();
    const Component = withScreenSpan("features/example/view", () => <p>見出し</p>);

    expect(Component()).toEqual(<p>見出し</p>);
    expect(mocks.startActiveSpan).not.toHaveBeenCalled();
  });

  it("screens が無効なら span を作らない", async () => {
    const { withScreenSpan } = await loadRenderSpan({ screens: false, parts: true });
    const Component = withScreenSpan("features/example/view", () => <p>見出し</p>);

    expect(Component()).toEqual(<p>見出し</p>);
    expect(mocks.startActiveSpan).not.toHaveBeenCalled();
  });

  it("同期の描画の戻り値をそのまま返し、span を閉じる", async () => {
    const { withScreenSpan } = await loadRenderSpan({ screens: true, parts: false });
    const Component = withScreenSpan("features/example/view", ({ label }: { label: string }) => (
      <p>{label}</p>
    ));

    expect(Component({ label: "見出し" })).toEqual(<p>見出し</p>);
    expect(mocks.startActiveSpan).toHaveBeenCalledWith(
      "render features/example/view",
      expect.any(Function),
    );
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(mocks.setStatus).not.toHaveBeenCalled();
  });

  it("非同期の描画は解決を待って span を閉じる", async () => {
    const { withScreenSpan } = await loadRenderSpan({ screens: true, parts: false });
    const Component = withScreenSpan("features/example/page-content", async () => <p>本文</p>);

    const result = Component();

    expect(mocks.end).not.toHaveBeenCalled();
    await expect(result).resolves.toEqual(<p>本文</p>);
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  it("同期の描画が投げると、失敗として記録して投げ直す", async () => {
    const { SpanStatusCode } = await import("@opentelemetry/api");
    const { withScreenSpan } = await loadRenderSpan({ screens: true, parts: false });
    const failure = new Error("描画に失敗しました");
    const Component = withScreenSpan("features/example/view", () => {
      throw failure;
    });

    expect(() => Component()).toThrow(failure);
    expect(mocks.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(mocks.recordException).toHaveBeenCalledWith(failure);
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  it("非同期の描画が失敗すると、失敗として記録する", async () => {
    const { SpanStatusCode } = await import("@opentelemetry/api");
    const { withScreenSpan } = await loadRenderSpan({ screens: true, parts: false });
    const failure = new Error("取得に失敗しました");
    const Component = withScreenSpan("features/example/page-content", async () => {
      throw failure;
    });

    await expect(Component()).rejects.toThrow(failure);
    expect(mocks.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  it("Error でない値は exception として記録しない", async () => {
    const { withScreenSpan } = await loadRenderSpan({ screens: true, parts: false });
    const Component = withScreenSpan("features/example/view", () => {
      throw "失敗";
    });

    expect(() => Component()).toThrow("失敗");
    expect(mocks.setStatus).toHaveBeenCalledOnce();
    expect(mocks.recordException).not.toHaveBeenCalled();
  });

  it("Next が制御に使う throw は失敗として記録しない", async () => {
    const { withScreenSpan } = await loadRenderSpan({ screens: true, parts: false });
    const Component = withScreenSpan("features/example/page-content", () => {
      notFound();
    });

    expect(() => Component()).toThrow();
    expect(mocks.setStatus).not.toHaveBeenCalled();
    expect(mocks.recordException).not.toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});

describe("withPartSpan", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
    mocks.startActiveSpan.mockImplementation((_name: string, run: (span: unknown) => unknown) =>
      run({ end: mocks.end, setStatus: mocks.setStatus, recordException: mocks.recordException }),
    );
    mocks.getTracer.mockReturnValue({ startActiveSpan: mocks.startActiveSpan });
  });

  it("parts が無効なら span を作らない", async () => {
    const { withPartSpan } = await loadRenderSpan({ screens: true, parts: false });
    const Component = withPartSpan("features/example/ui/card/card", () => <li>商品</li>);

    expect(Component()).toEqual(<li>商品</li>);
    expect(mocks.startActiveSpan).not.toHaveBeenCalled();
  });

  it("parts が有効なら span を作る", async () => {
    const { withPartSpan } = await loadRenderSpan({ screens: false, parts: true });
    const Component = withPartSpan("features/example/ui/card/card", () => <li>商品</li>);

    expect(Component()).toEqual(<li>商品</li>);
    expect(mocks.startActiveSpan).toHaveBeenCalledWith(
      "render features/example/ui/card/card",
      expect.any(Function),
    );
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
