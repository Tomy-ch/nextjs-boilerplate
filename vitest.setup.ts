import "@testing-library/jest-dom/vitest";
import { act, cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { mockServer } from "./mocks/node";

// dev サーバーと同じ契約駆動ハンドラをテストでも使う。テスト専用のスタブを別に持つと、
// 契約が変わってもテストだけが古い形のまま通り続ける。
//
// 素通しを既定にするのは、ハンドラの無い宛先を落とすと、fetch を直接差し替えて検証している
// 単体テストまでモックの管轄に引き込まれるため。
beforeAll(() => {
  mockServer.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
});

afterAll(() => {
  mockServer.close();
});

vi.mock("server-only", () => ({}));

// jsdom は Pointer Events の capture API を実装しない。ドラッグを扱う部品（vaul の drawer など）は
// pointerdown で setPointerCapture を呼ぶため、実際の入力列を再現する user-event がそこで落ちる。
// 回避のために click だけを直接発火させると、ドラッグ判定の経路を 1 行も通らないテストになる。
// jsdom は transform の計算値を空文字で返す。vaul は `style.transform || style.webkitTransform ||
// style.mozTransform` の形で読むため、空文字だと undefined へ落ちて文字列操作で例外になる。
if (typeof window !== "undefined") {
  const computeStyle = window.getComputedStyle.bind(window);

  window.getComputedStyle = ((element: Element, pseudoElement?: string | null) => {
    const style = computeStyle(element, pseudoElement ?? undefined);

    if (style.transform === "") {
      style.transform = "none";
    }

    return style;
  }) as typeof window.getComputedStyle;
}

// jsdom は matchMedia を実装しない。幅や入力方式で見せ方を変える部品は購読の時点で例外になり、
// 検証したい分岐まで届かない。個別のテストで補うと、同じ形のスタブが部品の数だけ増える。
//
// 既定を「一致しない」にするのは、jsdom がレイアウトを持たず、どの条件も評価できないためである。
// 一致する側の振る舞いを確かめたいテストは、そのケースだけ `vi.stubGlobal` で上書きする
// （幅や入力方式の想定はケースごとに明示する）。購読と解除を受け付けるのは、条件の変化を追う
// 部品が effect の後片付けで `removeEventListener` を呼ぶためで、無いと unmount で落ちる。
if (typeof window !== "undefined" && window.matchMedia === undefined) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

/** 疑似 touch の 1 点。ジェスチャーの判定が読む値だけを持つ。 */
export type StubTouch = {
  /** 指の識別子。複数指のうちどれが動いたかを判定に使う。 */
  readonly identifier: number;
  readonly clientY: number;
};

/**
 * touch の入力列を発火する。
 *
 * @remarks
 * jsdom は `TouchEvent` も `Touch` も実装しないため、`window` へ流す形をここで組み立てます。
 * 個別のテストで発火方法を変えると、ジェスチャー判定の経路を通らないテストが生まれるので、
 * 補いは 1 箇所に置きます。
 *
 * `touches` は画面に触れている指、`changedTouches` はその発火で状態が変わった指という
 * ブラウザの区別をそのまま持ちます。省略時に前者を後者へ流用するのは、指が 1 本のときは
 * 両者が一致するためです。
 */
export function dispatchTouch(
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  init: { touches?: readonly StubTouch[]; changedTouches?: readonly StubTouch[] } = {},
): void {
  const touches = init.touches ?? [];
  const event = Object.assign(new Event(type), {
    touches,
    changedTouches: init.changedTouches ?? touches,
  });

  act(() => {
    window.dispatchEvent(event);
  });
}

if (typeof Element !== "undefined" && Element.prototype.setPointerCapture === undefined) {
  const captured = new WeakMap<Element, Set<number>>();

  Element.prototype.setPointerCapture = function setPointerCapture(pointerId: number): void {
    const ids = captured.get(this) ?? new Set<number>();

    ids.add(pointerId);
    captured.set(this, ids);
  };

  Element.prototype.releasePointerCapture = function releasePointerCapture(
    pointerId: number,
  ): void {
    captured.get(this)?.delete(pointerId);
  };

  Element.prototype.hasPointerCapture = function hasPointerCapture(pointerId: number): boolean {
    return captured.get(this)?.has(pointerId) ?? false;
  };
}

// jsdom はスクロールの API を実装しない。carousel の送りは領域の横スクロールそのものなので、
// 送る操作・拡大表示・追従する一覧はいずれもここを通る。個別のテストで呼び出しを避けると、
// 位置を合わせる経路を 1 行も通らないテストになる。
//
// 記録も再現もしないのは、jsdom がレイアウトを持たず矩形がすべて 0 になり、スクロール量に
// 意味を与えられないためである。**量そのものが主題のテストは矩形を明示して単体で検証する**
// （`carousel-scroll.test.ts`）。ここが担うのは、経路を通せるようにすることだけである。
if (typeof Element !== "undefined" && Element.prototype.scrollBy === undefined) {
  Element.prototype.scrollBy = function scrollBy(): void {
    // 何もしない。経路を通せるようにすることだけが目的である。
  };
}
