"use client";

import { useCallback, useState } from "react";

import { useScrollDirection } from "./use-scroll-direction";

/** 引き出しを出すかどうかと、その切り替え。 */
export type DockVisibility = {
  shown: boolean;
  toggle: () => void;
};

/**
 * 画面の下から出す器を、出すかどうかを決める。
 *
 * @remarks
 * **下へ読み進めるあいだだけ出します。** 内容が増えるほど末尾の集計は画面外へ遠ざかり、確かめるために
 * 送ることになります。逆に上へ戻るときは読みたいのが本文なので、置いて行かれる形で隠します。
 *
 * **引き手で開いた状態はスクロールの向きより優先します。** 向きに任せるだけだと、下へ動かせない位置
 * （末尾や短い一覧）で到達する手段が無くなります。自分で開けたものが勝手に消えると、操作と結果が
 * 対応しません。
 *
 * 器から切り出してあるのは、出す条件と器の見た目が別々に変わるためです。
 */
export function useDockVisibility(): DockVisibility {
  const [pinned, setPinned] = useState(false);
  const direction = useScrollDirection();
  const toggle = useCallback(() => setPinned((current) => !current), []);

  return { shown: pinned || direction === "down", toggle };
}
