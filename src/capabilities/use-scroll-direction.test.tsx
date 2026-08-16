// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScrollDirection } from "./use-scroll-direction";

/** 縦の位置を jsdom へ置く。`scrollY` は読み取り専用のため差し替える。 */
function scrollTo(y: number): void {
  Object.defineProperty(window, "scrollY", { value: y, writable: true, configurable: true });
  window.dispatchEvent(new Event("scroll"));
}

/** いま検証している読み込み。読み込み直すたびに差し替える。 */
let subject: () => ScrollDirection;

/** 向きを表示するだけの部品。 */
function Probe() {
  return <p>{subject()}</p>;
}

/**
 * hook を読み込み直し、{@link Probe} の呼ぶ先を差し替える。
 *
 * @remarks
 * 購読も直近の向きも module が 1 つだけ持つため、読み込みを跨ぐと前のテストの向きが残ります。
 */
async function loadSubject(): Promise<void> {
  vi.resetModules();
  ({ useScrollDirection: subject } = await import("./use-scroll-direction"));
}

beforeEach(() => {
  scrollTo(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useScrollDirection", () => {
  it("まだ動いていないとき up を返す", async () => {
    await loadSubject();

    render(<Probe />);

    expect(screen.getByText("up")).toBeVisible();
  });

  it("下へ動いたら down を返す", async () => {
    await loadSubject();

    render(<Probe />);
    act(() => scrollTo(100));

    expect(screen.getByText("down")).toBeVisible();
  });

  it("下へ動いた後に上へ戻したら up を返す", async () => {
    await loadSubject();

    render(<Probe />);
    act(() => scrollTo(100));
    act(() => scrollTo(20));

    expect(screen.getByText("up")).toBeVisible();
  });

  it("同じ向きへ続けて動いても保ったままにする", async () => {
    await loadSubject();

    render(<Probe />);
    act(() => scrollTo(100));
    act(() => scrollTo(200));

    expect(screen.getByText("down")).toBeVisible();
  });

  it("購読する部品が増えても listener は 1 つに畳む", async () => {
    await loadSubject();
    const addEventListener = vi.spyOn(window, "addEventListener");

    render(
      <>
        <Probe />
        <Probe />
      </>,
    );

    expect(addEventListener.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(1);
  });

  it("最後の部品が外れたら購読を解除する", async () => {
    await loadSubject();
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<Probe />);

    unmount();

    expect(removeEventListener.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(1);
  });

  it("まだ部品が残っているあいだは購読を解除しない", async () => {
    await loadSubject();
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    const first = render(<Probe />);

    render(<Probe />);
    first.unmount();

    expect(removeEventListener.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(0);
  });

  it("震え幅の移動では向きを変えない", async () => {
    await loadSubject();

    render(<Probe />);
    act(() => scrollTo(4));

    expect(screen.getByText("up")).toBeVisible();
  });

  it("サーバではスクロール位置を見ずに up を返す", async () => {
    await loadSubject();

    expect(renderToStaticMarkup(<Probe />)).toBe("<p>up</p>");
  });
});
