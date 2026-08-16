import {
  getProductCount,
  getProductListPage,
  type ProductQuery,
} from "@/adapters/server/api/products";

import { type ProductListSelection, toConditions } from "../facade/list-url/list-url";
import { ProductInfiniteList } from "./ui/infinite-list/infinite-list";

/** `ProductListResults` の props。 */
export type ProductListResultsProps = {
  /** 契約に照らし終えた取得条件。 */
  query: ProductQuery;
  /** URL に載っている条件。続きの取得へそのまま渡す。 */
  selection: ProductListSelection;
};

/**
 * 条件に一致する一覧。
 *
 * @remarks
 * **条件が変わったときに取り直す範囲がここです。** 一覧と件数だけを持ち、検索欄・条件の chip・
 * 絞り込みの入力欄は外側にあります。分けていないと、条件を 1 つ変えるたびに分類の一覧まで
 * 取り直され、絞り込みの操作面ごと待機表示へ落ちます。
 *
 * 一覧と件数を並行して取得します。直列にすると、件数が返るまで一覧の取得が始まりません。
 */
export async function ProductListResults({ query, selection }: ProductListResultsProps) {
  const [page, total] = await Promise.all([getProductListPage(query), getProductCount(query)]);

  return (
    <ProductInfiniteList
      initial={page}
      // 取り直した結果で積み上げを捨てるための鍵。読み進めた分は island の state にあり、
      // props が変わっても入れ替わらない。中身から鍵を作れば、変わったときだけ積み直り、
      // 変わっていなければ読み進めた位置が保たれる。
      key={JSON.stringify(page.items)}
      query={toConditions(selection)}
      total={total}
    />
  );
}
