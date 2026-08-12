import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
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
