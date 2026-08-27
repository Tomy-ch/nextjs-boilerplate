"use client";

import { useState } from "react";

/**
 * 一度 true になったら、以後 true を保つ。
 *
 * @remarks
 * **「見えているか」と「一度でも見えたか」は別の問いです。** 前者は器が持ちますが、後者を要求する
 * のは中身の側の事情 —— 開いた時点の内容からしか組み立てられない編集面、送信に載せる必要がある
 * 入力欄のように、**外すと復元できないもの**を抱えているときです。器が閉じるたびに外すと、その
 * 中身は作り直しになります。
 *
 * 描画中に前回値との差分で state を調整する形にしてあるのは、effect にすると調整前の描画が 1 度
 * 挟まるためです。React はこの形を認めており、**その回の描画結果を捨てて即座に描き直す**ため、
 * 呼び出し側へ返るのは調整後の値です（`latched` をそのまま返してよいのはこのため）。
 *
 * @param active - いま満たしているか。
 * @returns 一度でも満たしたか。
 *
 * @example
 * ```tsx
 * function Panel({ active, children }: { active: boolean; children: ReactNode }) {
 *   const latched = useLatched(active);
 *
 *   return <div hidden={!active}>{latched ? children : null}</div>;
 * }
 * ```
 */
export function useLatched(active: boolean): boolean {
  const [latched, setLatched] = useState(active);

  if (active && !latched) {
    setLatched(true);
  }

  return latched;
}
