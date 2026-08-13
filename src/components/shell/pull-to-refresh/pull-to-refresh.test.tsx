// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { PullToRefresh } from "./pull-to-refresh";
import { PULL_STATE, RESISTANCE, TRIGGER_DISTANCE } from "./pull-to-refresh.definition";

/** 実行の域に届く指の移動量。 */
const REACHING_MOVE = TRIGGER_DISTANCE / RESISTANCE + 1;

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function touch(type: string, clientY?: number): void {
  const event = Object.assign(new Event(type), {
    touches: clientY === undefined ? [] : [{ clientY }],
  });

  act(() => {
    window.dispatchEvent(event);
  });
}

function pull(move: number): void {
  touch("touchstart", 0);
  touch("touchmove", move);
}

function markerIn(container: HTMLElement): HTMLElement {
  const found = container.querySelector<HTMLElement>('[data-slot="pull-to-refresh"]');

  if (found === null) {
    throw new Error("目印が描かれていません");
  }

  return found;
}

function indicatorIn(container: HTMLElement): HTMLElement {
  const found = markerIn(container).firstElementChild;

  if (!(found instanceof HTMLElement)) {
    throw new Error("目印の中身が描かれていません");
  }

  return found;
}

describe("PullToRefresh", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    refresh.mockClear();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.overscrollBehaviorY = "";
  });

  // ----- 正常系 -----
  it("touch を持つ環境では目印を伏せた状態で置く", () => {
    stubMatchMedia(true);

    const { container } = render(<PullToRefresh />);

    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.IDLE);
    expect(indicatorIn(container)).toHaveClass("opacity-0");
  });

  it("引くと目印が現れて指に追従する", () => {
    stubMatchMedia(true);
    const { container } = render(<PullToRefresh />);

    pull(40);

    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.PULLING);
    expect(indicatorIn(container)).toHaveClass("opacity-100");
    expect(indicatorIn(container)).toHaveStyle({ transform: "translateY(18px)" });
  });

  it("実行の域まで引いて離すと route を取り直す", () => {
    stubMatchMedia(true);
    const { container } = render(<PullToRefresh />);

    pull(REACHING_MOVE);
    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.READY);
    touch("touchend");

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // ----- 異常系 -----
  it("touch を持たない環境では何も描かない", () => {
    stubMatchMedia(false);

    const { container } = render(<PullToRefresh />);

    expect(container).toBeEmptyDOMElement();
  });

  it("実行の域に届かずに離しても取り直さない", () => {
    stubMatchMedia(true);
    const { container } = render(<PullToRefresh />);

    pull(40);
    touch("touchend");

    expect(refresh).not.toHaveBeenCalled();
    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.IDLE);
  });
});
