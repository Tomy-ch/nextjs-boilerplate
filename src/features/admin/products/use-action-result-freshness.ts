"use client";

import { useCallback, useState } from "react";

/** 直前の送信の結果を、いま出してよいか。 */
export type ActionResultFreshness = {
  /** 利用者が結果を下げたか。 */
  readonly dismissed: boolean;
  /** 結果を下げる。 */
  readonly dismiss: () => void;
  /** この描画で結果が入れ替わったか。 */
  readonly resultIsNew: boolean;
};

/**
 * 送信の結果の鮮度を数える。
 *
 * @remarks
 * **結果は下げられ、送り直せばまた出ます。**下げた印を戻さないと、一度下げたあとに送り直した
 * 結果がどこにも出ず、押しても何も起きない画面になります。戻す合図は「結果そのものが入れ替わった
 * こと」で、それはこの hook が覚えている直前の結果との同一性で判ります。
 *
 * 題材を知りません。`useActionState` の結果を持つフォームなら、何を送るものでも同じように使えます。
 *
 * @param state - `useActionState` が返す現在の結果
 */
export function useActionResultFreshness<T>(state: T): ActionResultFreshness {
  const [dismissed, setDismissed] = useState(false);
  const [seenState, setSeenState] = useState(state);

  const resultIsNew = seenState !== state;

  if (resultIsNew) {
    setSeenState(state);
    setDismissed(false);
  }

  const dismiss = useCallback(() => setDismissed(true), []);

  return { dismissed, dismiss, resultIsNew };
}
