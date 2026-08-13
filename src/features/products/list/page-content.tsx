import { getProductCategories } from "@/adapters/server/api/product-masters";
import {
  getProductListPage,
  getProductTotalCount,
  PRODUCT_SORT,
  parseProductQuery,
} from "@/adapters/server/api/products";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import type { ProductRef } from "@/model/product/product";

import {
  COUNT_KEY,
  FILTER_KEY,
  type FilterOption,
  normalizeSearchParams,
  PRODUCT_PAGE_SIZE,
  type RawSearchParams,
  toConditions,
} from "./query";
import type { FilterGroup } from "./ui/filter-fields/filter-fields";
import { ProductInfiniteList } from "./ui/infinite-list/infinite-list";
import { ProductInvalidQuery } from "./ui/invalid-query/invalid-query";
import { ProductListView } from "./view";

/** `ProductListPageContent` の props。 */
export type ProductListPageContentProps = {
  /** page が受け取った素の検索条件。 */
  searchParams: RawSearchParams;
};

/** 並び替えの選択肢。既定の並びは URL に載せないため、値を空にしてある。 */
const SORT_OPTIONS: readonly FilterOption[] = [
  { value: "", label: "新着順" },
  { value: PRODUCT_SORT.OLDEST, label: "古い順" },
];

/** マスタを「すべて」付きの選択肢へ直す。 */
function toOptions(refs: readonly ProductRef[]): readonly FilterOption[] {
  return [
    { value: "", label: "すべて" },
    ...refs.map(({ id, name }) => ({ value: id, label: name })),
  ];
}

/**
 * 商品一覧の中身。取得と組み立てを行う。
 *
 * @remarks
 * 取得を page ではなくここで行うのは、待機表示の境界を実際にデータを待つ部分の近くへ置く
 * ためです（[0080](../../../docs/adr/0080-error-handling.md)）。page 全体を 1 つの待機表示で
 * 覆うと、検索欄まで一緒に消えて操作できなくなります。
 *
 * 一覧とマスタを並行して取得します。直列にすると、分類の一覧が返るまで商品の取得が始まりません。
 */
export async function ProductListPageContent({ searchParams }: ProductListPageContentProps) {
  const selection = normalizeSearchParams(searchParams);
  const parsed = parseProductQuery({
    ...selection,
    [COUNT_KEY]: selection[COUNT_KEY] ?? String(PRODUCT_PAGE_SIZE),
  });

  if (!parsed.ok) {
    return (
      <ProductInvalidQuery
        invalidKeys={parsed.invalidKeys}
        message={getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message}
      />
    );
  }

  const [page, total, categories] = await Promise.all([
    getProductListPage(parsed.query),
    getProductTotalCount(),
    getProductCategories(),
  ]);

  const groups: readonly FilterGroup[] = [
    { key: FILTER_KEY.CATEGORY, legend: "カテゴリ", options: toOptions(categories) },
  ];
  // 既定の並びは URL に載せないため、明示された既定値は選択肢側の「指定なし」へ寄せる。
  const displayed =
    selection[FILTER_KEY.SORT] === PRODUCT_SORT.NEWEST
      ? { ...selection, [FILTER_KEY.SORT]: "" }
      : selection;

  return (
    <ProductListView groups={groups} selection={displayed} sortOptions={SORT_OPTIONS}>
      <ProductInfiniteList
        initial={page}
        // 取り直した結果で積み上げを捨てるための鍵。読み進めた分は island の state にあり、
        // props が変わっても入れ替わらない。中身から鍵を作れば、変わったときだけ積み直り、
        // 変わっていなければ読み進めた位置が保たれる。
        key={JSON.stringify(page.items)}
        query={toConditions(selection)}
        total={total}
      />
    </ProductListView>
  );
}
