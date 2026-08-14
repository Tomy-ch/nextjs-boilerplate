// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerViewport,
} from "./message-scroller";

const VIEWPORT_HEIGHT = 200;
const CONTENT_HEIGHT = 1000;

type ScrollMetrics = { clientHeight: number; scrollHeight: number; scrollTop: number };

const metrics = new WeakMap<HTMLElement, ScrollMetrics>();
let resizeCallbacks: ResizeObserverCallback[] = [];

function metricsOf(element: HTMLElement): ScrollMetrics {
  const current = metrics.get(element);

  if (current) {
    return current;
  }

  const created: ScrollMetrics = {
    clientHeight: VIEWPORT_HEIGHT,
    scrollHeight: CONTENT_HEIGHT,
    scrollTop: 0,
  };
  metrics.set(element, created);

  return created;
}

function maxScrollTop(element: HTMLElement): number {
  const { clientHeight, scrollHeight } = metricsOf(element);

  return Math.max(0, scrollHeight - clientHeight);
}

function getViewport(): HTMLElement {
  return screen.getByRole("region", { name: "やり取り" });
}

/** 利用者が viewport を動かしたことを、jsdom に無い layout の代わりに再現する。 */
function scrollTo(element: HTMLElement, top: number): void {
  metricsOf(element).scrollTop = Math.min(Math.max(0, top), maxScrollTop(element));
  fireEvent.scroll(element);
}

/** 内容が伸びたことを ResizeObserver の通知として再現する。 */
function growContent(element: HTMLElement, by: number): void {
  metricsOf(element).scrollHeight += by;

  for (const callback of resizeCallbacks) {
    callback([], { disconnect: () => {}, observe: () => {}, unobserve: () => {} });
  }
}

beforeAll(() => {
  // jsdom は layout を持たないため scroll 量が常に 0 になる。実装から scroll 制御を落とさず、
  // 測定に使う 3 つの値と scrollTo をここで代替する。
  for (const name of ["clientHeight", "scrollHeight"] as const) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get(this: HTMLElement) {
        return metricsOf(this)[name];
      },
    });
  }

  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get(this: HTMLElement) {
      return metricsOf(this).scrollTop;
    },
    set(this: HTMLElement, value: number) {
      metricsOf(this).scrollTop = Math.min(Math.max(0, value), maxScrollTop(this));
    },
  });

  Object.defineProperty(Element.prototype, "scrollTo", {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions) {
      this.scrollTop = options.top ?? 0;
    },
  });

  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  });
});

afterAll(() => {
  for (const name of ["clientHeight", "scrollHeight", "scrollTop"]) {
    Reflect.deleteProperty(HTMLElement.prototype, name);
  }

  Reflect.deleteProperty(Element.prototype, "scrollTo");
  Reflect.deleteProperty(globalThis, "ResizeObserver");
});

beforeEach(() => {
  resizeCallbacks = [];
});

function Fixture({ autoFollow }: { autoFollow?: boolean }) {
  return (
    <MessageScroller autoFollow={autoFollow}>
      <MessageScrollerViewport aria-label="やり取り">
        <MessageScrollerContent>
          <p>1 件目</p>
          <p>2 件目</p>
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
}

describe("MessageScroller", () => {
  it("スクロールする枠を名前つきの region として、一覧を log として公開する", () => {
    render(<Fixture />);

    const viewport = getViewport();

    expect(viewport.tagName).toBe("SECTION");
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("log")).toHaveAttribute("aria-relevant", "additions");
  });

  it("初期表示で末尾を映す", () => {
    render(<Fixture />);

    const viewport = getViewport();

    expect(viewport.scrollTop).toBe(maxScrollTop(viewport));
  });

  it("末尾にいる間は末尾へ戻す操作を置かない", () => {
    render(<Fixture />);

    expect(screen.queryByRole("button", { name: "最新へ移動" })).not.toBeInTheDocument();
  });

  it("上へ動かすと追従を外し、末尾へ戻す操作が現れる", () => {
    render(<Fixture />);

    scrollTo(getViewport(), 0);

    expect(screen.getByRole("button", { name: "最新へ移動" })).toBeVisible();
  });

  it("末尾へ戻す操作で末尾まで戻り、操作が消える", () => {
    render(<Fixture />);
    const viewport = getViewport();
    scrollTo(viewport, 0);

    fireEvent.click(screen.getByRole("button", { name: "最新へ移動" }));

    expect(viewport.scrollTop).toBe(maxScrollTop(viewport));
    expect(screen.queryByRole("button", { name: "最新へ移動" })).not.toBeInTheDocument();
  });

  it("末尾にいる間は内容が増えても末尾へ追従する", () => {
    render(<Fixture />);
    const viewport = getViewport();

    growContent(viewport, 500);

    expect(viewport.scrollTop).toBe(maxScrollTop(viewport));
    expect(screen.queryByRole("button", { name: "最新へ移動" })).not.toBeInTheDocument();
  });

  it("追従を外した後は内容が増えても位置を保つ", () => {
    render(<Fixture />);
    const viewport = getViewport();
    scrollTo(viewport, 0);

    growContent(viewport, 500);

    expect(viewport.scrollTop).toBe(0);
    expect(screen.getByRole("button", { name: "最新へ移動" })).toBeVisible();
  });

  it("autoFollow を切ると末尾にいても追従しない", () => {
    render(<Fixture autoFollow={false} />);
    const viewport = getViewport();
    const before = viewport.scrollTop;

    growContent(viewport, 500);

    expect(viewport.scrollTop).toBe(before);
  });

  it("末尾へ戻す操作の文言を呼び出し元が置き換えられる", () => {
    render(
      <MessageScroller>
        <MessageScrollerViewport aria-label="やり取り">
          <MessageScrollerContent>
            <p>1 件目</p>
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton>最新の発言へ</MessageScrollerButton>
      </MessageScroller>,
    );

    scrollTo(getViewport(), 0);

    expect(screen.getByRole("button", { name: "最新の発言へ" })).toBeVisible();
  });

  it("末尾へ届かない下方向の移動では追従を戻さない", () => {
    render(<Fixture />);
    const viewport = getViewport();
    scrollTo(viewport, 0);

    scrollTo(viewport, 400);
    growContent(viewport, 500);

    expect(viewport.scrollTop).toBe(400);
    expect(screen.getByRole("button", { name: "最新へ移動" })).toBeVisible();
  });

  it("自分で末尾まで戻すと追従も戻る", () => {
    render(<Fixture />);
    const viewport = getViewport();
    scrollTo(viewport, 0);

    scrollTo(viewport, maxScrollTop(viewport));
    growContent(viewport, 500);

    expect(viewport.scrollTop).toBe(maxScrollTop(viewport));
    expect(screen.queryByRole("button", { name: "最新へ移動" })).not.toBeInTheDocument();
  });

  it("viewport を持たない構成でも例外を出さない", () => {
    render(
      <MessageScroller>
        <MessageScrollerContent>
          <p>1 件目</p>
        </MessageScrollerContent>
        <MessageScrollerButton />
      </MessageScroller>,
    );

    expect(() => growContent(screen.getByRole("log"), 500)).not.toThrow();
    expect(screen.queryByRole("button", { name: "最新へ移動" })).not.toBeInTheDocument();
  });

  it("viewport を持たず追従もしない構成でも例外を出さない", () => {
    render(
      <MessageScroller autoFollow={false}>
        <MessageScrollerContent>
          <p>1 件目</p>
        </MessageScrollerContent>
      </MessageScroller>,
    );

    expect(() => growContent(screen.getByRole("log"), 500)).not.toThrow();
  });

  it("呼び出し元の ref へ viewport と一覧の要素を渡す", () => {
    const viewportRef: { current: HTMLElement | null } = { current: null };
    let contentElement: HTMLElement | null = null;
    const captureContent = (element: HTMLDivElement | null) => {
      contentElement = element;
    };

    render(
      <MessageScroller>
        <MessageScrollerViewport aria-label="やり取り" ref={viewportRef}>
          <MessageScrollerContent ref={captureContent}>
            <p>1 件目</p>
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>,
    );

    expect(viewportRef.current).toBe(getViewport());
    expect(contentElement).toBe(screen.getByRole("log"));
  });

  it("MessageScroller の外で subcomponent を使うと知らせる", () => {
    expect(() => render(<MessageScrollerViewport aria-label="やり取り" />)).toThrow(
      "MessageScrollerViewport は MessageScroller の中で使ってください。",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);

    const result = await axe(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

describe("MessageScrollerViewport", () => {
  it("スクロールする枠として slot を持つ要素を、名前つきで描画する", () => {
    render(<Fixture />);

    expect(screen.getByRole("region", { name: "やり取り" })).toHaveAttribute(
      "data-slot",
      "message-scroller-viewport",
    );
  });
});

describe("MessageScrollerContent", () => {
  it("やり取りの本体として slot を持つ要素を描画する", () => {
    const { container } = render(<Fixture />);

    expect(container.querySelector('[data-slot="message-scroller-content"]')).not.toBeNull();
  });
});

describe("MessageScrollerButton", () => {
  it("末尾に居る間は最新へ戻る操作を描画しない", () => {
    const { container } = render(<Fixture />);

    expect(container.querySelector('[data-slot="message-scroller-button"]')).toBeNull();
  });
});
