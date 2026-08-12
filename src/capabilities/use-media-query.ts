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
 * **サーバでは常に `false` を返します。** 一致した側にだけ現れる UI は hydration の後に現れ、
 * 一致した側でだけ消える UI は hydration まで残ります。**初回描画は一致していない側の姿で、
 * 操作できるかどうかもその姿に従います。**
 *
 * したがって本文の幅・順序が変わる出し分けや、押せる必要のある操作の有無は、この hook ではなく CSS の
 * media query（Tailwind の `lg:` など）で行ってください。この hook を使うのは、focus trap のように
 * DOM を残したままでは成立しないものに限ります。
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
