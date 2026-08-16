"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/cn";

import {
  CartRemovalNotice,
  type RemovedCartLine,
  usePendingRemovals,
} from "../removal-notice/removal-notice";

/** `CartLineList` の props。 */
export type CartLineListProps = {
  /** 明細 1 行ずつ。組み立ては server 側で済ませ、この器は並べる順だけを持つ。 */
  rows: readonly ReactNode[];
  /** いまカートに入っている商品。戻せるかどうかの判定に使う。 */
  presentProductIds: readonly string[];
  /** 器の見た目。呼び出し元が渡す。 */
  className?: string;
};

/**
 * 取り消しを、行の位置ごとに束ねる。
 *
 * @remarks
 * 取り除いた時点の位置が今の行数を超えることがあります（後から他の行も消えた場合）。その分は
 * 末尾へ寄せます。
 */
function groupByPosition(
  pending: readonly RemovedCartLine[],
  rowCount: number,
): Map<number, RemovedCartLine[]> {
  const grouped = new Map<number, RemovedCartLine[]>();

  for (const line of pending) {
    const at = Math.min(line.index, rowCount);

    grouped.set(at, [...(grouped.get(at) ?? []), line]);
  }

  return grouped;
}

/**
 * 明細を並べ、取り除いた行の位置に取り消しを差し込む器。
 *
 * @remarks
 * **消えた行と同じ位置に案内を置きます。** ゴミ箱を押した場所と案内の出る場所がずれると、どの行が
 * 消えたのかを利用者が目で辿り直すことになります。押した行がそのまま「削除しました」に差し替わる
 * 形にして、視線を動かさずに取り消せるようにしています。
 *
 * **続けて取り除いた場合は、その数だけ並びます。** 先に取り除いた案内を後の削除で置き換えると、
 * 戻す手段が先の 1 件だけ失われます。
 *
 * 行そのものは server が組み立てたものを受け取ります。この器が持つのは並べる順だけで、明細の
 * 見た目は知りません。
 */
export function CartLineList({ rows, presentProductIds, className }: CartLineListProps) {
  const pending = usePendingRemovals(presentProductIds);
  const grouped = groupByPosition(pending, rows.length);
  const items: ReactNode[] = [];

  const pushNoticesAt = (position: number) => {
    for (const line of grouped.get(position) ?? []) {
      items.push(
        <li className="py-4" key={`removed-${line.productId}`}>
          <CartRemovalNotice removed={line} />
        </li>,
      );
    }
  };

  rows.forEach((row, index) => {
    pushNoticesAt(index);
    items.push(row);
  });
  pushNoticesAt(rows.length);

  return (
    <ul className={cn("flex flex-col divide-y", className)} data-slot="cart-line-list">
      {items}
    </ul>
  );
}
