"use client";

import type { ProductListSelection } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";
import { useFilterDraft } from "../../use-filter-draft";
import { useFilteredCount } from "../../use-filtered-count";
import { ProductFilterPanel } from "../filter-panel/filter-panel";

/** `ProductFilterSidebar` の props。 */
export type ProductFilterSidebarProps = {
  /** 選べる分類。 */
  categories: readonly FilterOption[];
  /** いま効いている条件。 */
  selection: ProductListSelection;
};

/**
 * 脇に常設する絞り込み。条件を組み立ててから、まとめて反映する。
 *
 * @remarks
 * 下書きと件数の取得をつなぐだけです。見た目は {@link ProductFilterPanel} が持ちます。
 *
 * 選ぶたびに反映しません。条件が価格の範囲・分類・在庫状況に増えた画面では、1 つ選ぶごとに
 * 取得が走る形は、捨てられる取得を並べるだけになります。**代わりに、確定する前の件数を
 * 出します**（{@link useFilteredCount}）。反映を待たずに結果の大きさが分かるので、確定を
 * 明示にしても選び直す手数は増えません。
 *
 * 出す幅の判断は持ちません。脇の領域を出す下限は
 * [0051](../../../../../../docs/adr/0051-styling-system.md) §2 が決めており、置く側が担います。
 * landmark も持ちません。この画面には検索と条件をまとめた `FilterBar` が既にあり、入れ子にすると
 * 同じ目的の landmark が 2 つ並びます。脇の領域そのものの名前は置く側が `aside` に与えます。
 */
export function ProductFilterSidebar({ categories, selection }: ProductFilterSidebarProps) {
  const { draft, pending, change, apply } = useFilterDraft(selection);
  const { count, loading } = useFilteredCount(draft);

  return (
    <ProductFilterPanel
      categories={categories}
      count={count}
      counting={loading}
      draft={draft}
      onApply={apply}
      onChange={change}
      pending={pending}
    />
  );
}
