// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchTouch } from "../../../../vitest.setup";
import {
  MAX_DISTANCE,
  PULL_STATE,
  RESISTANCE,
  TRIGGER_DISTANCE,
} from "./pull-to-refresh.definition";
import { usePullGesture } from "./use-pull-gesture";

type Listener = () => void;

/** 実行の域に届く指の移動量。 */
const REACHING_MOVE = TRIGGER_DISTANCE / RESISTANCE + 1;

/** 引き始める指。複数指のケースで基準の指を名指しする。 */
const FIRST_FINGER = 0;

/** 引き始めた後に触れる指。 */
const SECOND_FINGER = 1;

/**
 * touch を持つ環境として観測させる。
 *
 * @remarks
 * 共有の補い（`vitest.setup.ts`）が与える既定は「一致しない」なので、一致する側と、
 * 後から一致するようになる経路だけをここで上書きする。
 */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const state = { matches: initial };

  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return state.matches;
    },
    media: query,
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }));

  return {
    change(matches: boolean) {
      state.matches = matches;
      act(() => {
        for (const listener of listeners) {
          listener();
        }
      });
    },
  };
}

function stubScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", { configurable: true, value });
}

function pull(move: number): void {
  dispatchTouch("touchstart", { touches: [{ identifier: FIRST_FINGER, clientY: 0 }] });
  dispatchTouch("touchmove", { touches: [{ identifier: FIRST_FINGER, clientY: move }] });
}

/** 引き始めた指を離す。画面に残る指は無い。 */
function release(type: "touchend" | "touchcancel" = "touchend"): void {
  dispatchTouch(type, { changedTouches: [{ identifier: FIRST_FINGER, clientY: 0 }] });
}

function Probe({ onRelease, modal = false }: { onRelease: () => void; modal?: boolean }) {
  const { enabled, state, distance } = usePullGesture(onRelease);

  return (
    <div>
      <p>{enabled ? "受け付ける" : "受け付けない"}</p>
      <p>{state}</p>
      <p>{`${distance}px`}</p>
      {modal ? <div aria-modal="true" role="dialog" /> : null}
    </div>
  );
}

function overscroll(): string {
  return document.documentElement.style.overscrollBehaviorY;
}

describe("usePullGesture", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubScrollY(0);
    document.documentElement.style.overscrollBehaviorY = "auto";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.overscrollBehaviorY = "";
  });

  // ----- 正常系 -----
  it("touch を持つ環境では受け付け、ブラウザ既定の引き下げを止める", () => {
    stubMatchMedia(true);

    render(<Probe onRelease={vi.fn()} />);

    expect(screen.getByText("受け付ける")).toBeVisible();
    expect(overscroll()).toBe("contain");
  });

  it("後から touch の環境になれば受け付ける", () => {
    const media = stubMatchMedia(false);
    render(<Probe onRelease={vi.fn()} />);

    media.change(true);

    expect(screen.getByText("受け付ける")).toBeVisible();
    expect(overscroll()).toBe("contain");
  });

  it("引き始めると引き量に抵抗を掛けて追従する", () => {
    stubMatchMedia(true);
    render(<Probe onRelease={vi.fn()} />);

    pull(40);

    expect(screen.getByText(PULL_STATE.PULLING)).toBeVisible();
    expect(screen.getByText("18px")).toBeVisible();
  });

  it("実行の域まで引くと離せば実行される段階になる", () => {
    stubMatchMedia(true);
    render(<Probe onRelease={vi.fn()} />);

    pull(REACHING_MOVE);

    expect(screen.getByText(PULL_STATE.READY)).toBeVisible();
  });

  it("上限を超えて引いても引き量は頭打ちになる", () => {
    stubMatchMedia(true);
    render(<Probe onRelease={vi.fn()} />);

    pull(MAX_DISTANCE * 10);

    expect(screen.getByText(`${MAX_DISTANCE}px`)).toBeVisible();
  });

  it("実行の域まで引いて離すと実行し、引き量を戻す", () => {
    stubMatchMedia(true);
    const onRelease = vi.fn();
    render(<Probe onRelease={onRelease} />);

    pull(REACHING_MOVE);
    release();

    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("引き始めた指が離れれば、他の指が残っていても実行する", () => {
    stubMatchMedia(true);
    const onRelease = vi.fn();
    render(<Probe onRelease={onRelease} />);

    pull(REACHING_MOVE);
    dispatchTouch("touchend", {
      touches: [{ identifier: SECOND_FINGER, clientY: 200 }],
      changedTouches: [{ identifier: FIRST_FINGER, clientY: REACHING_MOVE }],
    });

    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("観測をやめたらブラウザ既定の引き下げを戻す", () => {
    stubMatchMedia(true);
    const view = render(<Probe onRelease={vi.fn()} />);

    view.unmount();

    expect(overscroll()).toBe("auto");
  });

  // ----- 異常系 -----
  it("touch を持たない環境では受け付けず、引いても何も起きない", () => {
    const onRelease = vi.fn();
    render(<Probe onRelease={onRelease} />);

    pull(REACHING_MOVE);
    release();

    expect(screen.getByText("受け付けない")).toBeVisible();
    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(onRelease).not.toHaveBeenCalled();
    expect(overscroll()).toBe("auto");
  });

  it("実行の域に届かずに離すと実行しない", () => {
    stubMatchMedia(true);
    const onRelease = vi.fn();
    render(<Probe onRelease={onRelease} />);

    pull(40);
    release();

    expect(onRelease).not.toHaveBeenCalled();
    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("引いている途中で中断されると実行せずに戻す", () => {
    stubMatchMedia(true);
    const onRelease = vi.fn();
    render(<Probe onRelease={onRelease} />);

    pull(40);
    release("touchcancel");

    expect(onRelease).not.toHaveBeenCalled();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("引いていない指を離しても実行しない", () => {
    stubMatchMedia(true);
    const onRelease = vi.fn();
    render(<Probe onRelease={onRelease} />);

    pull(REACHING_MOVE);
    dispatchTouch("touchend", {
      touches: [{ identifier: FIRST_FINGER, clientY: REACHING_MOVE }],
      changedTouches: [{ identifier: SECOND_FINGER, clientY: 200 }],
    });

    expect(onRelease).not.toHaveBeenCalled();
    expect(screen.getByText(PULL_STATE.READY)).toBeVisible();
  });

  it("引き始めていないのに指が離れても実行しない", () => {
    stubMatchMedia(true);
    const onRelease = vi.fn();
    render(<Probe onRelease={onRelease} />);

    release();

    expect(onRelease).not.toHaveBeenCalled();
    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
  });

  it("2 本目が触れた開始は拾わない", () => {
    stubMatchMedia(true);
    render(<Probe onRelease={vi.fn()} />);

    dispatchTouch("touchstart", {
      touches: [
        { identifier: FIRST_FINGER, clientY: 0 },
        { identifier: SECOND_FINGER, clientY: 0 },
      ],
    });
    dispatchTouch("touchmove", { touches: [{ identifier: FIRST_FINGER, clientY: REACHING_MOVE }] });

    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("上端にいないときは拾わない", () => {
    stubMatchMedia(true);
    stubScrollY(120);
    render(<Probe onRelease={vi.fn()} />);

    pull(REACHING_MOVE);

    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("modal が開いている間は拾わない", () => {
    stubMatchMedia(true);
    render(<Probe modal onRelease={vi.fn()} />);

    pull(REACHING_MOVE);

    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("触れた位置が取れない開始は拾わない", () => {
    stubMatchMedia(true);
    render(<Probe onRelease={vi.fn()} />);

    dispatchTouch("touchstart");
    dispatchTouch("touchmove", { touches: [{ identifier: FIRST_FINGER, clientY: REACHING_MOVE }] });

    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });

  it("指の位置が取れない移動は引き量を変えない", () => {
    stubMatchMedia(true);
    render(<Probe onRelease={vi.fn()} />);

    pull(40);
    dispatchTouch("touchmove");

    expect(screen.getByText(PULL_STATE.PULLING)).toBeVisible();
    expect(screen.getByText("18px")).toBeVisible();
  });

  it("引いた後に始点より上へ戻すと引き量が 0 に戻る", () => {
    stubMatchMedia(true);
    render(<Probe onRelease={vi.fn()} />);
    dispatchTouch("touchstart", { touches: [{ identifier: FIRST_FINGER, clientY: 100 }] });
    dispatchTouch("touchmove", { touches: [{ identifier: FIRST_FINGER, clientY: 140 }] });
    expect(screen.getByText(PULL_STATE.PULLING)).toBeVisible();

    dispatchTouch("touchmove", { touches: [{ identifier: FIRST_FINGER, clientY: 40 }] });

    expect(screen.getByText(PULL_STATE.IDLE)).toBeVisible();
    expect(screen.getByText("0px")).toBeVisible();
  });
});
