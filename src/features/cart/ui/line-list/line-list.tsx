"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/cn";

import {
  CartRemovalNotice,
  useCartRemovalNotice,
  useHasPendingRemoval,
} from "../removal-notice/removal-notice";

/** `CartLineList` の props。 */
export type CartLineListProps = {
  /** 明細 1 行ずつ。組み立ては server 側で済ませ、この器は並べ替えだけを行う。 */
  rows: readonly ReactNode[];
  /** いまカートに入っている商品。取り除けたかどうかの判定に使う。 */
  presentProductIds: readonly string[];
  /** 器の見た目。呼び出し元が渡す。 */
  className?: string;
};

/**
 * 明細を並べ、取り除いた行の位置に取り消しを差し込む器。
 *
 * @remarks
 * **消えた行と同じ位置に案内を置きます。** ゴミ箱を押した場所と案内の出る場所がずれると、どの行が
 * 消えたのかを利用者が目で辿り直すことになります。押した行がそのまま「削除しました」に差し替わる
 * 形にして、視線を動かさずに取り消せるようにしています。
 *
 * 行そのものは server が組み立てたものを受け取ります。この器が持つのは並べる順だけで、明細の
 * 見た目は知りません。
 *
 * 取り除いた位置が末尾より後ろになることはありません（行が 1 つ減っているため）。位置が行数を
 * 超える場合は末尾へ置きます。
 */
export function CartLineList({ rows, presentProductIds, className }: CartLineListProps) {
  const notice = useCartRemovalNotice();
  const pending = useHasPendingRemoval(presentProductIds);
  const at = pending && notice?.removed != null ? Math.min(notice.removed.index, rows.length) : -1;

  return (
    <ul className={cn("flex flex-col divide-y", className)} data-slot="cart-line-list">
      {rows.slice(0, at === -1 ? rows.length : at)}
      {at === -1 ? null : (
        <li className="py-4">
          <CartRemovalNotice presentProductIds={presentProductIds} />
        </li>
      )}
      {at === -1 ? null : rows.slice(at)}
    </ul>
  );
}
