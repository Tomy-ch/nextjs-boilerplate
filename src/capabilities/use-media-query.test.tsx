// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./use-media-query";

type Listener = () => void;

/** jsdom は `matchMedia` を持たないため、一致と変化を制御できる最小の実装を置く。 */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const state = { matches: initial };

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: state.matches,
    media: query,
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }));

  return {
    change(matches: boolean) {
      state.matches = matches;
      for (const listener of listeners) {
        listener();
      }
    },
    listenerCount: () => listeners.size,
  };
}

function Probe() {
  const matches = useMediaQuery("(max-width: 767px)");

  return <p>{matches ? "一致" : "不一致"}</p>;
}

describe("useMediaQuery", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ----- 正常系 -----
  it("一致している query では真を返す", () => {
    stubMatchMedia(true);
    render(<Probe />);

    expect(screen.getByText("一致")).toBeVisible();
  });

  it("一致していない query では偽を返す", () => {
    stubMatchMedia(false);
    render(<Probe />);

    expect(screen.getByText("不一致")).toBeVisible();
  });

  it("幅が変わったら購読して追従する", () => {
    const media = stubMatchMedia(false);
    render(<Probe />);

    act(() => media.change(true));

    expect(screen.getByText("一致")).toBeVisible();
  });

  it("外れたら購読を解除する", () => {
    const media = stubMatchMedia(true);
    const { unmount } = render(<Probe />);

    unmount();

    expect(media.listenerCount()).toBe(0);
  });

  it("サーバでは query を見ずに偽を返す", () => {
    expect(renderToStaticMarkup(<Probe />)).toBe("<p>不一致</p>");
  });
});
