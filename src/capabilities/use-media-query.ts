"use client";

import { useCallback, useSyncExternalStore } from "react";

/** サーバでは media query を評価できないため、一致していない側を返す。 */
function serverSnapshot(): boolean {
  return false;
}

/**
 * media query の一致を購読する。
 *
 * @remarks
 * `useSyncExternalStore` を用いるのは、`matchMedia` の変化が React の外で起きるためです。
 * `useEffect` で state に写すと、最初の描画が常に一致していない側になり、そのぶん余計な
 * 再描画が挟まります。
 *
 * **サーバでは常に `false` を返します。** 一致した側にだけ現れる UI は hydration の後に現れ、
 * 一致した側でだけ消える UI は hydration まで残ります。したがって、この hook で出し分けるのは
 * 「有無で本文の位置が動かないもの」に限ります。本文の幅や順序が変わる出し分けは、CSS の
 * media query（Tailwind の `md:` など）で行ってください。
 *
 * @param query - `matchMedia` へ渡す media query
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);

      list.addEventListener("change", onStoreChange);

      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
