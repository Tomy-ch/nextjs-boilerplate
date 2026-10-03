import {
  FILTER_KEY,
  type ProductListSelection,
  toSelectedValue,
} from "../facade/list-url/list-url";
import { formatRangeEdge, formatRangeLabel, type RangeEdge } from "./range-label";

/**
 * 価格の目盛り。下限と上限をこの位置から選ぶ。
 *
 * @remarks
 * 両端は値ではなく「指定なし」を表します。位置に値が無いことが、その端で区切らないことに
 * そのまま対応します。
 *
 * 端を並びに含めてあるので、下限と上限をひとつの操作面（レンジスライダー）に載せても左右の
 * 向きが崩れません。「指定なし」を並びの外に置くと、上限の「指定なし」だけが最大値より右へ
 * はみ出します。
 *
 * 選べる値を目盛りに限るのは、下限と上限をセレクトボックスからも選ぶためです。連続値を許すと、
 * 2 つの操作面が同じ条件を別の粒度で表すことになります。
 */
export const PRICE_SCALE: readonly (number | null)[] = [
  null,
  10,
  25,
  50,
  100,
  250,
  500,
  1000,
  null,
];

/** 下限の位置として選べる範囲の先頭。 */
export const PRICE_RANGE_MIN = 0;

/** 上限の位置として選べる範囲の末尾。 */
export const PRICE_RANGE_MAX = PRICE_SCALE.length - 1;

/** 下限と上限の位置。 */
export type PriceRange = readonly [number, number];

/**
 * 目盛りの位置を、契約が受け取る十進文字列へ写す。指定なしの端は `undefined`。
 *
 * @param index - 目盛りの位置
 * @returns 十進文字列。指定なしの端は `undefined`
 */
function toBound(index: number): string | undefined {
  return PRICE_SCALE[index]?.toString();
}

/**
 * 十進文字列がどの位置に当たるかを探す。目盛りに無い値は `undefined`。
 *
 * @param value - 十進文字列
 * @returns 目盛りの位置。無ければ `undefined`
 */
function toIndex(value: string): number | undefined {
  const found = value === "" ? -1 : PRICE_SCALE.indexOf(Number(value));

  return found === -1 ? undefined : found;
}

/**
 * いま効いている価格の条件を、目盛りの位置へ写す。
 *
 * @remarks
 * 目盛りに無い値は「指定なし」の端として読みます。URL は利用者が直接編集できるため、目盛りの
 * 外の値がそのまま届きます。その条件自体は効いたままで、効いていることは条件の chip が伝えます。
 * 操作面の側は、次に動かしたときどの値になるかを見せられる位置に置きます。
 *
 * @param selection - いま効いている条件
 * @returns 下限と上限の位置
 */
export function toPriceRange(selection: ProductListSelection): PriceRange {
  return [
    toIndex(toSelectedValue(selection, FILTER_KEY.MIN_PRICE)) ?? PRICE_RANGE_MIN,
    toIndex(toSelectedValue(selection, FILTER_KEY.MAX_PRICE)) ?? PRICE_RANGE_MAX,
  ];
}

/**
 * 目盛りの位置を検索条件へ書き戻す。
 *
 * @param selection - いま効いている条件
 * @param range - 下限と上限の位置
 * @returns 書き戻した後の条件
 */
export function applyPriceRange(
  selection: ProductListSelection,
  [low, high]: PriceRange,
): ProductListSelection {
  return {
    ...selection,
    [FILTER_KEY.MIN_PRICE]: toBound(low) ?? "",
    [FILTER_KEY.MAX_PRICE]: toBound(high) ?? "",
  };
}

/**
 * 目盛りの位置を、その端の役割に合った表示へ写す。
 *
 * @param index - 目盛りの位置
 * @param edge - 表示する端。指定なしの表示文言を選ぶために使う
 * @returns 表示用の文字列
 */
export function formatPriceBound(index: number, edge: RangeEdge): string {
  return formatRangeEdge(toBound(index) ?? "", edge, formatPrice);
}

/**
 * 契約が受け取る十進文字列を、通貨付きの表示へ写す。
 *
 * @param value - 十進文字列
 * @returns 表示用の文字列
 */
function formatPrice(value: string): string {
  return `$${value}`;
}

/**
 * いま効いている価格の条件を、下限と上限をまとめた 1 つの表示へ写す。
 *
 * @remarks
 * 目盛りの位置ではなく URL の値から作ります。目盛りに無い値も条件としては効いており、位置へ
 * 写すと「指定なし」の端に見えて、効いている条件が表示から消えます。
 *
 * @param selection - いま効いている条件
 * @returns 表示用の文字列。下限も上限も指定が無ければ `undefined`
 */
export function formatPriceCondition(selection: ProductListSelection): string | undefined {
  return formatRangeLabel(
    toSelectedValue(selection, FILTER_KEY.MIN_PRICE),
    toSelectedValue(selection, FILTER_KEY.MAX_PRICE),
    formatPrice,
  );
}
