"use client";

import { type RefObject, useEffect, useRef } from "react";

/** {@link useOnVisible} の調整。 */
export type OnVisibleOptions = {
  /**
   * 見えたと見なす手前の距離（CSS の長さ）。
   *
   * @remarks
   * 画面に入り切る前に知らせたいときに広げます。省略すると、実際に交差した時点で知らせます。
   */
  rootMargin?: string;
  /**
   * 見張るかどうか。既定は見張る。
   *
   * @remarks
   * `false` の間は購読そのものを持ちません。目印を描いたまま知らせだけを止めたい場面
   * （読み終えている、続きが無い）で、要素の出し入れと購読の有無を分けて扱えます。
   */
  enabled?: boolean;
};

/**
 * 要素が見えたことを知る。
 *
 * @remarks
 * `IntersectionObserver` の購読を hook として供給します。**何をするかは持ちません。** 見えた
 * ことを知らせるだけで、そこで何を始めるかは呼び出し側が決めます。
 *
 * **状態ではなく callback で返します。** 「見えている」を state として配ると、読む側はそれを
 * 見張る effect を書くことになり、最新の処理を掴み続けるための ref もそこで要ります。見えた
 * 瞬間に一度だけ何かを始める使い方では、その一式が読む側の数だけ増えます。
 *
 * 渡された処理は毎回いちばん新しいものが呼ばれます。処理が変わるたびに購読を張り直さないのは、
 * 張り直しの瞬間に交差が起きていると知らせが落ちるためです。
 *
 * サーバでは何も起きません。`IntersectionObserver` は browser にしか無く、初回の描画は
 * 「まだ見えていない」として進みます。**位置が動く出し分けには使わないでください**（この hook が
 * 知らせるのは見えたことだけで、レイアウトを決める材料ではありません）。
 *
 * @param onVisible - 要素が見えたときに呼ぶ処理
 * @param options - 手前の距離と、見張るかどうか
 * @returns 見張る要素へ渡す ref
 */
export function useOnVisible(
  onVisible: () => void,
  options: OnVisibleOptions = {},
): RefObject<HTMLDivElement | null> {
  const { rootMargin, enabled = true } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const latest = useRef(onVisible);

  useEffect(() => {
    latest.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const target = ref.current;

    if (target === null || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          latest.current();
        }
      },
      { rootMargin },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return ref;
}
