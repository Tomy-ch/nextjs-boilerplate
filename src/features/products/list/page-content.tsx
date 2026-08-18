import { Suspense } from "react";

import { getProductCategories } from "@/adapters/server/api/product-masters";
import {
  PRODUCT_CATEGORY_LIMIT,
  PRODUCT_SORT,
  parseProductQuery,
} from "@/adapters/server/api/products";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import type { ProductCategory } from "@/model/product/product";
import { COUNT_KEY, FILTER_KEY, toProductListSearchParams } from "../facade/list-url/list-url";
import {
  type FilterOption,
  normalizeSearchParams,
  PRODUCT_PAGE_SIZE,
  type RawSearchParams,
} from "./query";
import { ProductListResults } from "./results";
import { ProductInvalidQuery } from "./ui/invalid-query/invalid-query";
import { ProductListSkeleton } from "./ui/skeleton/skeleton";
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

/**
 * 分類のマスタを選択肢へ直す。
 *
 * @remarks
 * 値に `code` を使います。契約が分類の絞り込みで受け取るのは UUID ではなくこの番号です。
 */
function toOptions(categories: readonly ProductCategory[]): readonly FilterOption[] {
  return categories.map(({ code, name }) => ({ value: String(code), label: name }));
}

/**
 * 商品一覧の枠。取得条件の解釈と、画面の組み立てを行う。
 *
 * @remarks
 * **条件によって変わらないものだけを取得します。** 分類の一覧は絞り込みの入力欄そのもので、
 * 検索条件では変わりません。ここで一覧まで取ると、条件が変わるたびに入力欄まで待機表示へ落ち、
 * 続けて絞り込む操作の足場が消えます。条件で変わるものは
 * {@link ProductListResults} が持ち、待機表示の境界もそこに掛かります。
 *
 * 待機表示の境界に条件を鍵として与えるのは、条件が変われば一覧が総入れ替えになるためです。
 * 鍵を与えないと、次の一覧が届くまで前の条件の一覧が残ります。
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

  const categories = toOptions(await getProductCategories());
  // 既定の並びは URL に載せないため、明示された既定値は選択肢側の「指定なし」へ寄せる。
  const displayed =
    selection[FILTER_KEY.SORT] === PRODUCT_SORT.NEWEST
      ? { ...selection, [FILTER_KEY.SORT]: "" }
      : selection;

  return (
    <ProductListView
      categories={categories}
      categoryLimit={PRODUCT_CATEGORY_LIMIT}
      selection={displayed}
      sortOptions={SORT_OPTIONS}
    >
      <Suspense
        fallback={<ProductListSkeleton />}
        key={toProductListSearchParams(selection).toString()}
      >
        <ProductListResults query={parsed.query} selection={selection} />
      </Suspense>
    </ProductListView>
  );
}
