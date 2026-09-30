// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { dispatchTouch, type StubTouch } from "./vitest.setup";

const FIRST: StubTouch = { identifier: 0, clientY: 10 };
const SECOND: StubTouch = { identifier: 1, clientY: 40 };

const detach: (() => void)[] = [];

type Received = { type: string; touches: unknown; changedTouches: unknown };

/** `window` へ届いた event を 1 件だけ受け取る。 */
function listen(type: string): Received[] {
  const received: Received[] = [];
  const listener = (event: Event): void => {
    received.push({
      type: event.type,
      touches: Reflect.get(event, "touches"),
      changedTouches: Reflect.get(event, "changedTouches"),
    });
  };

  window.addEventListener(type, listener, { once: true });
  detach.push(() => window.removeEventListener(type, listener));

  return received;
}

/** 受け取った touch の数を描く。 */
function TouchCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const increment = (): void => setCount((current) => current + 1);

    window.addEventListener("touchstart", increment);

    return () => window.removeEventListener("touchstart", increment);
  }, []);

  return <output>{count}</output>;
}

afterEach(() => {
  for (const remove of detach.splice(0)) remove();
});

describe("dispatchTouch", () => {
  it("指定した種類の event を window へ同期に届ける", () => {
    const received = listen("touchend");

    dispatchTouch("touchend", { touches: [FIRST] });

    expect(received.map(({ type }) => type)).toEqual(["touchend"]);
  });

  it("発火で起きた描画の更新を、呼び出しから戻るまでに反映する", () => {
    render(<TouchCounter />);

    dispatchTouch("touchstart", { touches: [FIRST] });

    expect(screen.getByRole("status")).toHaveTextContent("1");
  });

  it("changedTouches を省くと、touches と同じ指を変化した指として載せる", () => {
    const received = listen("touchstart");

    dispatchTouch("touchstart", { touches: [FIRST] });

    expect(received[0]).toEqual({
      type: "touchstart",
      touches: [FIRST],
      changedTouches: [FIRST],
    });
  });

  it("changedTouches を渡すと、touches とは別にその指を載せる", () => {
    const received = listen("touchmove");

    dispatchTouch("touchmove", { touches: [FIRST, SECOND], changedTouches: [SECOND] });

    expect(received[0]).toEqual({
      type: "touchmove",
      touches: [FIRST, SECOND],
      changedTouches: [SECOND],
    });
  });

  it("指を渡さなければ、どちらも空の並びで載せる", () => {
    const received = listen("touchcancel");

    dispatchTouch("touchcancel");

    expect(received[0]).toEqual({ type: "touchcancel", touches: [], changedTouches: [] });
  });
});
