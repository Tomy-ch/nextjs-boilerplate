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

describe("runRenderSpan", () => {
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

  // ----- 正常系 -----
  it("同期の描画の戻り値をそのまま返し、span を閉じる", async () => {
    const { runRenderSpan } = await import("./render-span-runner.server");

    expect(runRenderSpan("features/example/view", () => <p>見出し</p>)).toEqual(<p>見出し</p>);
    expect(mocks.startActiveSpan).toHaveBeenCalledWith(
      "render features/example/view",
      expect.any(Function),
    );
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(mocks.setStatus).not.toHaveBeenCalled();
  });

  it("非同期の描画は解決を待って span を閉じる", async () => {
    const { runRenderSpan } = await import("./render-span-runner.server");

    const result = runRenderSpan("features/example/page-content", async () => <p>本文</p>);

    expect(mocks.end).not.toHaveBeenCalled();
    await expect(result).resolves.toEqual(<p>本文</p>);
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("同期の描画が投げると、失敗として記録して投げ直す", async () => {
    const { SpanStatusCode } = await import("@opentelemetry/api");
    const { runRenderSpan } = await import("./render-span-runner.server");
    const failure = new Error("描画に失敗しました");

    expect(() =>
      runRenderSpan("features/example/view", (): never => {
        throw failure;
      }),
    ).toThrow(failure);
    expect(mocks.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(mocks.recordException).toHaveBeenCalledWith(failure);
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  it("非同期の描画が失敗すると、失敗として記録する", async () => {
    const { SpanStatusCode } = await import("@opentelemetry/api");
    const { runRenderSpan } = await import("./render-span-runner.server");
    const failure = new Error("取得に失敗しました");

    await expect(
      runRenderSpan("features/example/page-content", async () => {
        throw failure;
      }),
    ).rejects.toThrow(failure);
    expect(mocks.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  it("Error でない値は exception として記録しない", async () => {
    const { runRenderSpan } = await import("./render-span-runner.server");

    expect(() =>
      runRenderSpan("features/example/view", (): never => {
        throw "失敗";
      }),
    ).toThrow("失敗");
    expect(mocks.setStatus).toHaveBeenCalledOnce();
    expect(mocks.recordException).not.toHaveBeenCalled();
  });

  it("Next が制御に使う throw は失敗として記録しない", async () => {
    const { runRenderSpan } = await import("./render-span-runner.server");

    expect(() =>
      runRenderSpan("features/example/page-content", (): never => {
        notFound();
      }),
    ).toThrow();
    expect(mocks.setStatus).not.toHaveBeenCalled();
    expect(mocks.recordException).not.toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
