"use client";

import { useSyncExternalStore } from "react";

/** 直近のスクロールの向き。 */
export type ScrollDirection = "up" | "down";

/**
 * 向きが変わったと見なす移動量。
 *
 * @remarks
 * 1px でも動いたら向きを切り替えると、指の震えや慣性の揺り返しで姿が入れ替わり続けます。
 */
const THRESHOLD_PX = 8;

let direction: ScrollDirection = "up";
let lastY = 0;
const listeners = new Set<() => void>();

function handleScroll(): void {
  const delta = window.scrollY - lastY;

  if (Math.abs(delta) < THRESHOLD_PX) {
    return;
  }

  lastY = window.scrollY;

  const next: ScrollDirection = delta > 0 ? "down" : "up";

  if (next === direction) {
    return;
  }

  direction = next;

  for (const listener of listeners) {
    listener();
  }
}

function subscribe(onStoreChange: () => void): () => void {
  if (listeners.size === 0) {
    lastY = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);

    if (listeners.size === 0) {
      window.removeEventListener("scroll", handleScroll);
    }
  };
}

function snapshot(): ScrollDirection {
  return direction;
}

/** サーバではスクロール位置を知れないため、まだ下へ動いていない側を返す。 */
function serverSnapshot(): ScrollDirection {
  return "up";
}

/**
 * 直近のスクロールの向きを購読する。
 *
 * @remarks
 * **サーバでは常に `up` を返します。** 下へ動いたときだけ現れる表示は hydration の後に現れます。
 * 本文の幅や順序が変わる出し分けには使えません。
 *
 * 購読は全体で 1 つに畳みます。向きは画面に 1 つしかない値で、購読する部品の数だけ listener を
 * 張ると、スクロールのたびに同じ計算がその数だけ走ります。
 */
export function useScrollDirection(): ScrollDirection {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
