import { getMyPurchases } from "@/adapters/server/api/purchases";

import { type PeriodSelection, toPurchaseHistoryHref, toPurchaseHistoryQuery } from "./period";
import { PURCHASE_PAGE_SIZE } from "./query";
import { PurchaseHistoryEmpty } from "./ui/empty/empty";
import { PurchaseInfiniteList } from "./ui/infinite-list/infinite-list";

/** `PurchaseHistoryResults` の props。 */
export type PurchaseHistoryResultsProps = {
  /** いま効いている期間。 */
  period: PeriodSelection;
};

/**
 * 期間に一致する購入履歴。
 *
 * @remarks
 * **期間が変わったときに取り直す範囲がここです。** 一覧だけを持ち、絞り込みの入力欄は外側に
 * あります。分けていないと、期間を変えるたびに操作面ごと待機表示へ落ち、続けて絞り込む足場が
 * 消えます。
 *
 * 期間の条件はそのまま契約へ渡します。**取得済みのページに日付を掛けません。** 読み込んで
 * あるのは新しいほうから数ページぶんでしかなく、そこへ条件を掛けると「該当する古い購入」が
 * 落ちた一覧になります。
 *
 * 1 件も無いときの言い方を期間で変えます。絞り込んだ結果が 0 件であることを「購入がありません」
 * とだけ伝えると、条件を外せば出てくることが画面から読み取れません。
 */
export async function PurchaseHistoryResults({ period }: PurchaseHistoryResultsProps) {
  const first = await getMyPurchases(toPurchaseHistoryQuery(period, PURCHASE_PAGE_SIZE));

  if (first.items.length === 0) {
    return period.kind === "all" ? (
      <PurchaseHistoryEmpty reason="none" />
    ) : (
      <PurchaseHistoryEmpty reason="filtered" resetHref={toPurchaseHistoryHref({ kind: "all" })} />
    );
  }

  return (
    <PurchaseInfiniteList
      initial={first}
      // 取り直した結果で積み上げを捨てるための鍵。読み進めた分は island の state にあり、
      // props が変わっても入れ替わらない。
      key={JSON.stringify(first.items)}
      pageSize={PURCHASE_PAGE_SIZE}
      period={period}
    />
  );
}
