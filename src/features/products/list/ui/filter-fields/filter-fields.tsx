"use client";

import { useCallback } from "react";

import {
  FILTER_KEY,
  type ProductListSelection,
  toSelectedValues,
} from "../../../facade/list-url/list-url";
import { applyPriceRange, type PriceRange, toPriceRange } from "../../price-range";
import type { FilterOption } from "../../query";
import {
  applyStockAvailability,
  type StockAvailability,
  toStockAvailability,
} from "../../stock-availability";
import { ProductCategoryField } from "../category-field/category-field";
import { ProductPriceField } from "../price-field/price-field";
import { ProductStockField } from "../stock-field/stock-field";

/** `ProductFilterFields` の props。 */
export type ProductFilterFieldsProps = {
  /** 選べる分類。 */
  categories: readonly FilterOption[];
  /** 一度に選べる分類の数。 */
  categoryLimit: number;
  /** いま組み立てている条件。 */
  draft: ProductListSelection;
  /** 条件が変わったときに呼ぶ。 */
  onChange: (next: ProductListSelection) => void;
};

/**
 * 絞り込みの入力欄。
 *
 * @remarks
 * 確定を持ちません。同じ入力欄を、脇に常設する領域と overlay の両方から使うためです。どこで
 * 確定するかは呼び出し元が決めます。
 *
 * 入力欄と URL のキーの対応をここだけが知ります。各入力欄が受け取るのは自分の条件そのもの
 * （価格の位置・分類の並び・在庫の有無）で、それがどのキーに載るかは知りません。分けておくと、
 * 契約のクエリ名が変わっても入力欄は動きません。
 *
 * 価格を先頭に置きます。予算は商品を探す前から決まっていることが多く、分類を跨いで効きます。
 * 在庫状況を最後に置くのは、これが結果を絞るための条件というより、出てきた結果から買えないものを
 * 外す条件だからです。
 */
export function ProductFilterFields({
  categories,
  categoryLimit,
  draft,
  onChange,
}: ProductFilterFieldsProps) {
  const changePrice = useCallback(
    (range: PriceRange) => {
      onChange(applyPriceRange(draft, range));
    },
    [draft, onChange],
  );

  const changeCategories = useCallback(
    (values: readonly string[]) => {
      onChange({ ...draft, [FILTER_KEY.CATEGORY]: values });
    },
    [draft, onChange],
  );

  const changeStock = useCallback(
    (availability: StockAvailability) => {
      onChange(applyStockAvailability(draft, availability));
    },
    [draft, onChange],
  );

  return (
    <div className="grid gap-6">
      <ProductPriceField onChange={changePrice} value={toPriceRange(draft)} />
      <ProductCategoryField
        onChange={changeCategories}
        limit={categoryLimit}
        options={categories}
        selected={toSelectedValues(draft, FILTER_KEY.CATEGORY)}
      />
      <ProductStockField onChange={changeStock} value={toStockAvailability(draft)} />
    </div>
  );
}
