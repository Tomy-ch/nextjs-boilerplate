import { Suspense } from "react";

import { getMyPurchases } from "@/adapters/server/api/purchases";

import {
  type PeriodSelection,
  toPeriodSearchParams,
  toPeriodSelection,
  toPurchaseHistoryHref,
  toPurchaseHistoryQuery,
} from "./period";
import { PURCHASE_PAGE_SIZE, type RawSearchParams } from "./query";
import { PurchaseHistoryEmpty } from "./ui/empty/empty";
import { PurchaseInfiniteList } from "./ui/infinite-list/infinite-list";
import { PurchaseHistorySkeleton } from "./ui/skeleton/skeleton";
import { PurchaseHistoryView } from "./view";

/** `PurchaseHistoryPageContent` の props。 */
export type PurchaseHistoryPageContentProps = {
  /** page が受け取った素の検索条件。 */
  searchParams: RawSearchParams;
};

/**
 * 条件で変わる部分。先頭ページを取得して一覧を組む。
 *
 * @remarks
 * 待機表示の境界をこの単位に掛けます。絞り込みの操作は外側にあり、期間を変えても操作の足場が
 * 待機表示へ落ちません（[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * 期間の条件をそのまま契約へ渡します。**取得済みのページに日付を掛けません。** 読み込んで
 * あるのは新しいほうから数ページぶんでしかなく、そこへ条件を掛けると「該当する古い購入」が
 * 落ちた一覧になります。
 */
async function PurchaseHistoryResults({ period }: { readonly period: PeriodSelection }) {
  const first = await getMyPurchases(toPurchaseHistoryQuery(period, PURCHASE_PAGE_SIZE));

  if (first.items.length === 0) {
    return period.kind === "all" ? (
      <PurchaseHistoryEmpty reason="none" />
    ) : (
      <PurchaseHistoryEmpty reason="filtered" resetHref={toPurchaseHistoryHref({ kind: "all" })} />
    );
  }

  return <PurchaseInfiniteList initial={first} pageSize={PURCHASE_PAGE_SIZE} period={period} />;
}

/**
 * 購入履歴の枠。取得条件の解釈と、画面の組み立てを行う。
 *
 * @remarks
 * **条件によって変わらないものはここに持ちません。** この画面が引くのは購入履歴だけで、
 * 絞り込みの選択肢は契約から来る値を持たない（区分は固定、日付は利用者が入れる）ためです。
 *
 * 待機表示の境界に条件を鍵として与えるのは、期間が変われば一覧が総入れ替えになるためです。
 * 鍵を与えないと、次の一覧が届くまで前の期間の一覧が残ります。
 */
export function PurchaseHistoryPageContent({ searchParams }: PurchaseHistoryPageContentProps) {
  const period = toPeriodSelection(searchParams);

  return (
    <PurchaseHistoryView period={period}>
      <Suspense
        fallback={<PurchaseHistorySkeleton />}
        key={toPeriodSearchParams(period).toString()}
      >
        <PurchaseHistoryResults period={period} />
      </Suspense>
    </PurchaseHistoryView>
  );
}
