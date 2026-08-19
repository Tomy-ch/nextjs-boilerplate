"use client";

import type { CursorPage } from "@/model/pagination";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";

import { purchaseDetailPath } from "../../../facade/paths/paths";
import type { PeriodSelection } from "../../period";
import { useInfinitePurchases } from "../../use-infinite-purchases";
import { PurchaseLoadMoreList } from "../purchase-list/purchase-list";

/** `PurchaseInfiniteList` の props。 */
export type PurchaseInfiniteListProps = {
  /** Server Component が取得した最初のページ。 */
  initial: CursorPage<PurchaseHistoryEntry>;
  /** いま効いている期間。続きの取得へそのまま渡す。 */
  period: PeriodSelection;
  /** 1 度に読み込む件数。 */
  pageSize: number;
};

/**
 * 読み進められる購入履歴。
 *
 * @remarks
 * 取得と見た目をつなぐだけです。見た目は {@link PurchaseLoadMoreList} が持ち、取得と末尾到達の
 * 検知は `useInfinitePurchases` が持ちます。分けてあるのは、見え方の確認に取得を必要としない
 * ようにするためです。
 *
 * 詳細への行き先をここで組みます。ルートを知っているのはこの feature で、行の側は渡された
 * 行き先を描くだけです。
 */
export function PurchaseInfiniteList({ initial, period, pageSize }: PurchaseInfiniteListProps) {
  const { items, loadMore, sentinelRef } = useInfinitePurchases(initial, period, pageSize);

  return (
    <PurchaseLoadMoreList
      entries={items.map((purchase) => ({ purchase, href: purchaseDetailPath(purchase.code) }))}
      loadMore={loadMore}
      sentinelRef={sentinelRef}
    />
  );
}
