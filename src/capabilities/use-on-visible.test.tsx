// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOnVisible } from "./use-on-visible";

/** 直近に作られた observer と、そこへ渡された引数。 */
let observed: Element[] = [];
let disconnected = 0;
let options: IntersectionObserverInit | undefined;
let fire: (entries: { isIntersecting: boolean }[]) => void = () => undefined;

beforeEach(() => {
  observed = [];
  disconnected = 0;
  options = undefined;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        callback: (entries: { isIntersecting: boolean }[]) => void,
        init?: IntersectionObserverInit,
      ) {
        options = init;
        fire = callback;
      }
      observe(target: Element): void {
        observed.push(target);
      }
      disconnect(): void {
        disconnected += 1;
      }
    },
  );
});

/** 何もしない処理。描画のたびに作り直さないよう、外へ出す。 */
const noop = () => undefined;

function Subject({ onVisible, enabled }: { onVisible: () => void; enabled?: boolean }) {
  const ref = useOnVisible(onVisible, { enabled, rootMargin: "400px" });

  return <div data-testid="sentinel" ref={ref} />;
}

describe("useOnVisible", () => {
  // ----- 正常系 -----
  it("渡した要素を見張る", () => {
    const { getByTestId } = render(<Subject onVisible={noop} />);

    expect(observed).toEqual([getByTestId("sentinel")]);
    expect(options).toEqual({ rootMargin: "400px" });
  });

  it("見えたら知らせる", () => {
    const onVisible = vi.fn();

    render(<Subject onVisible={onVisible} />);
    fire([{ isIntersecting: true }]);

    expect(onVisible).toHaveBeenCalledOnce();
  });

  it("いちばん新しい処理を呼ぶ", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Subject onVisible={first} />);

    rerender(<Subject onVisible={second} />);
    fire([{ isIntersecting: true }]);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("見張らない指定では購読を持たない", () => {
    render(<Subject enabled={false} onVisible={noop} />);

    expect(observed).toEqual([]);
  });

  // ----- 異常系 -----
  it("交差していない知らせでは呼ばない", () => {
    const onVisible = vi.fn();

    render(<Subject onVisible={onVisible} />);
    fire([{ isIntersecting: false }]);

    expect(onVisible).not.toHaveBeenCalled();
  });

  it("外れるときに購読を解く", () => {
    const { unmount } = render(<Subject onVisible={noop} />);

    unmount();

    expect(disconnected).toBe(1);
  });
});
