// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { dispatchTouch } from "../../../../vitest.setup";
import { PullToRefresh } from "./pull-to-refresh";
import { PULL_STATE, RESISTANCE, TRIGGER_DISTANCE } from "./pull-to-refresh.definition";

/** 実行の域に届く指の移動量。 */
const REACHING_MOVE = TRIGGER_DISTANCE / RESISTANCE + 1;

/** 引き始める指。 */
const FIRST_FINGER = 0;

/**
 * touch を持つ環境として観測させる。
 *
 * @remarks
 * 共有の補い（`vitest.setup.ts`）が与える既定は「一致しない」なので、目印が出る側の
 * 見え方を確かめるケースだけをここで上書きする。
 */
function stubCoarsePointer(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function pull(move: number): void {
  dispatchTouch("touchstart", { touches: [{ identifier: FIRST_FINGER, clientY: 0 }] });
  dispatchTouch("touchmove", { touches: [{ identifier: FIRST_FINGER, clientY: move }] });
}

/** 引き始めた指を離す。 */
function release(): void {
  dispatchTouch("touchend", { changedTouches: [{ identifier: FIRST_FINGER, clientY: 0 }] });
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
    stubCoarsePointer();

    const { container } = render(<PullToRefresh />);

    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.IDLE);
    expect(indicatorIn(container)).toHaveClass("opacity-0");
  });

  it("引くと目印が現れて指に追従する", () => {
    stubCoarsePointer();
    const { container } = render(<PullToRefresh />);

    pull(40);

    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.PULLING);
    expect(indicatorIn(container)).toHaveClass("opacity-100");
    expect(indicatorIn(container)).toHaveStyle({ transform: "translateY(18px)" });
  });

  it("実行の域まで引いて離すと route を取り直す", () => {
    stubCoarsePointer();
    const { container } = render(<PullToRefresh />);

    pull(REACHING_MOVE);
    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.READY);
    release();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // ----- 異常系 -----
  it("touch を持たない環境では何も描かない", () => {
    const { container } = render(<PullToRefresh />);

    expect(container).toBeEmptyDOMElement();
  });

  it("実行の域に届かずに離しても取り直さない", () => {
    stubCoarsePointer();
    const { container } = render(<PullToRefresh />);

    pull(40);
    release();

    expect(refresh).not.toHaveBeenCalled();
    expect(markerIn(container)).toHaveAttribute("data-state", PULL_STATE.IDLE);
  });
});
