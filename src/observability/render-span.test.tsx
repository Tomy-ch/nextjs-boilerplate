import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RenderSpanRunner } from "./render-span";

const CONFIGURATION_KEY = Symbol.for("nextjs-boilerplate.observability.render-spans");

/** 前のケースが注入した構成を捨てる。registered symbol なので `vi.resetModules()` では消えない。 */
function clearConfiguration(): void {
  Reflect.deleteProperty(globalThis, CONFIGURATION_KEY);
}

/** 呼ばれたことを記録するだけの実装。描画はそのまま通す。 */
function createRunner(): { run: RenderSpanRunner; calls: ReturnType<typeof vi.fn> } {
  const calls = vi.fn();
  const run: RenderSpanRunner = (name, render) => {
    calls(name, render);

    return render();
  };

  return { run, calls };
}

describe("configureRenderSpans", () => {
  beforeEach(() => {
    vi.resetModules();
    clearConfiguration();
  });

  it("注入した構成は、別のモジュールインスタンスから読んでも同じである", async () => {
    const { run, calls } = createRunner();
    const { configureRenderSpans } = await import("./render-span");

    configureRenderSpans({ screens: true, parts: true, run });
    // `vi.resetModules()` を挟んで読み直す。起動境界と描画で別々に評価される状況にあたる。
    vi.resetModules();
    const { withPartSpan } = await import("./render-span");

    withPartSpan("features/example/ui/row/row", () => <li>一件</li>)();

    expect(calls).toHaveBeenCalledOnce();
  });
});

describe("withScreenSpan", () => {
  beforeEach(() => {
    vi.resetModules();
    clearConfiguration();
  });

  it("構成が注入されていなければ、描画をそのまま返す", async () => {
    const { withScreenSpan } = await import("./render-span");
    const Component = withScreenSpan("features/example/view", () => <p>見出し</p>);

    expect(Component()).toEqual(<p>見出し</p>);
  });

  it("screens が無効なら実装を呼ばない", async () => {
    const { run, calls } = createRunner();
    const { configureRenderSpans, withScreenSpan } = await import("./render-span");
    configureRenderSpans({ screens: false, parts: true, run });
    const Component = withScreenSpan("features/example/view", () => <p>見出し</p>);

    expect(Component()).toEqual(<p>見出し</p>);
    expect(calls).not.toHaveBeenCalled();
  });

  it("screens が有効なら、span 名と描画を実装へ渡す", async () => {
    const { run, calls } = createRunner();
    const { configureRenderSpans, withScreenSpan } = await import("./render-span");
    configureRenderSpans({ screens: true, parts: false, run });
    const Component = withScreenSpan("features/example/view", ({ label }: { label: string }) => (
      <p>{label}</p>
    ));

    expect(Component({ label: "見出し" })).toEqual(<p>見出し</p>);
    expect(calls).toHaveBeenCalledWith("features/example/view", expect.any(Function));
  });
});

describe("withPartSpan", () => {
  beforeEach(() => {
    vi.resetModules();
    clearConfiguration();
  });

  it("parts が無効なら実装を呼ばない", async () => {
    const { run, calls } = createRunner();
    const { configureRenderSpans, withPartSpan } = await import("./render-span");
    configureRenderSpans({ screens: true, parts: false, run });
    const Component = withPartSpan("features/example/ui/row/row", () => <li>一件</li>);

    expect(Component()).toEqual(<li>一件</li>);
    expect(calls).not.toHaveBeenCalled();
  });

  it("parts が有効なら、span 名と描画を実装へ渡す", async () => {
    const { run, calls } = createRunner();
    const { configureRenderSpans, withPartSpan } = await import("./render-span");
    configureRenderSpans({ screens: false, parts: true, run });
    const Component = withPartSpan("features/example/ui/row/row", () => <li>一件</li>);

    expect(Component()).toEqual(<li>一件</li>);
    expect(calls).toHaveBeenCalledWith("features/example/ui/row/row", expect.any(Function));
  });
});
