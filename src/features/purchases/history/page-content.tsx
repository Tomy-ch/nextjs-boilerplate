import { Suspense } from "react";
import type { RawSearchParams } from "@/model/search-params";
import { withScreenSpan } from "@/observability/render-span";
import { toPeriodSearchParams } from "./period";
import { toPeriodSelection } from "./read-period";
import { PurchaseHistoryResults } from "./results";
import { PurchaseHistorySkeleton } from "./ui/skeleton/skeleton";
import { PurchaseHistoryView } from "./view";

/** `PurchaseHistoryPageContent` の props。 */
export type PurchaseHistoryPageContentProps = {
  /** page が受け取った素の検索条件。 */
  searchParams: RawSearchParams;
};

/**
 * 購入履歴の枠。取得条件の解釈と、画面の組み立てを行う。
 *
 * @remarks
 * **条件によって変わらないものはここに持ちません。** この画面が引くのは購入履歴だけで、
 * 絞り込みの選択肢は契約から来る値を持ちません（区分は固定、日付は利用者が入れる）。
 *
 * 待機表示の境界に条件を鍵として与えるのは、期間が変われば一覧が総入れ替えになるためです。
 * 鍵を与えないと、次の一覧が届くまで前の期間の一覧が残ります。
 */
export const PurchaseHistoryPageContent = withScreenSpan(
  "features/purchases/history/page-content",
  ({ searchParams }: PurchaseHistoryPageContentProps) => {
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
  },
);
