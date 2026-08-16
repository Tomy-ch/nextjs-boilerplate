"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/cn";

import {
  CartDisplayedOrder,
  CartRemovalNotice,
  useCartRemovalNotice,
  usePendingRemovals,
} from "../removal-notice/removal-notice";

/** 並べる明細 1 つ。行の組み立ては server 側で済ませ、この器は並べる順だけを持つ。 */
export type CartLineSlot = {
  productId: string;
  row: ReactNode;
};

/** `CartLineList` の props。 */
export type CartLineListProps = {
  /** いまカートに入っている明細。並びはサーバが返した順。 */
  slots: readonly CartLineSlot[];
  /** 器の見た目。呼び出し元が渡す。 */
  className?: string;
};

/**
 * 覚えている並びと、いま並んでいる明細を突き合わせて、描く順を決める。
 *
 * @remarks
 * 覚えている並びは削除の時点で撮ったものです。そこに載っていない明細（その後に足されたもの）は
 * 末尾へ回します。載っているが今は居ない明細は、戻せるあいだだけ場所を保ちます。
 */
function toSequence(
  remembered: readonly string[],
  present: readonly string[],
  pendingIds: readonly string[],
): readonly string[] {
  const kept = remembered.filter((id) => present.includes(id) || pendingIds.includes(id));

  return [...kept, ...present.filter((id) => !kept.includes(id))];
}

/**
 * 明細を並べ、取り除いた行があった場所に取り消しを差し込む器。
 *
 * @remarks
 * **消えた行と同じ場所に案内を置きます。** ゴミ箱を押した場所と案内の出る場所がずれると、どの行が
 * 消えたのかを利用者が目で辿り直すことになります。押した行がそのまま「削除しました」に差し替わる
 * 形にして、視線を動かさずに取り消せるようにしています。
 *
 * **場所は番号ではなく並びで持ちます。** 番号はほかの行が増減するたびに指す先が変わり、続けて
 * 取り除くとずれます。覚えるのは画面が見せていた順そのもので、これはサーバが持たない情報です
 * （[0060](../../../../../docs/adr/0060-state-management.md) の線引き）。
 *
 * 行そのものは server が組み立てたものを受け取ります。この器が持つのは並べる順だけで、明細の
 * 見た目は知りません。
 */
export function CartLineList({ slots, className }: CartLineListProps) {
  const present = slots.map((slot) => slot.productId);
  const remembered = useCartRemovalNotice()?.order ?? [];
  const pending = usePendingRemovals(present);
  const sequence = toSequence(
    remembered,
    present,
    pending.map((line) => line.productId),
  );
  const rows = new Map(slots.map((slot) => [slot.productId, slot.row]));
  const removals = new Map(pending.map((line) => [line.productId, line]));

  return (
    <CartDisplayedOrder order={present}>
      <ul className={cn("flex flex-col divide-y", className)} data-slot="cart-line-list">
        {sequence.map((productId) => {
          const row = rows.get(productId);

          if (row !== undefined) {
            return row;
          }

          const removed = removals.get(productId);

          return removed === undefined ? null : (
            <li className="py-4" key={`removed-${productId}`}>
              <CartRemovalNotice removed={removed} />
            </li>
          );
        })}
      </ul>
    </CartDisplayedOrder>
  );
}
