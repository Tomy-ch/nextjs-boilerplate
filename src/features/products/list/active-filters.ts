import {
  FILTER_KEY,
  type ProductListSelection,
  toProductListHref,
  toSelectedValue,
  toSelectedValues,
} from "../facade/list-url/list-url";
import { formatPriceCondition } from "./price-range";
import type { FilterOption } from "./query";
import {
  applyStockAvailability,
  formatStockAvailability,
  formatStockQuantity,
  STOCK_AVAILABILITY,
  STOCK_AVAILABILITY_LABEL,
  STOCK_QUANTITY_LABEL,
  toStockAvailability,
} from "./stock-availability";

/** いま効いている条件 1 件。解除先まで含めて、表示側が組み立て直さずに済む形で持つ。 */
export type ActiveFilter = {
  /** 並びの安定と React の鍵に使う。同じキーに複数の値が載るため、値まで含める。 */
  readonly key: string;
  /** 条件の名前。「カテゴリ」「キーワード」など。 */
  readonly label: string;
  /** 条件の値。利用者が選んだ表示名で、ID ではない。 */
  readonly value: string;
  /** この条件だけを外した URL。 */
  readonly removeHref: string;
};

/** キーワードの条件名。選択肢を持たないため、ここで名前を与える。 */
const KEYWORD_LABEL = "キーワード";

/** 価格の条件名。 */
const PRICE_LABEL = "価格";

/** 分類の条件名。 */
const CATEGORY_LABEL = "カテゴリ";

/**
 * いま効いている条件を、解除先付きの一覧へ写す。
 *
 * @remarks
 * 並び替えを含めません。常に値を持つため条件として並べると外せない chip が居座り、外せるものと
 * 外せないものが同じ見た目で混ざります。
 *
 * **分類は選んだぶんだけ並べます。** まとめて 1 つにすると、外す操作が「全部外す」しか作れず、
 * 3 つ選んだうちの 1 つを取り下げられません。
 *
 * **価格は下限と上限で 1 つにまとめます。** 片方だけ外せても意味のある操作にならず、範囲は 2 つ
 * そろって初めて 1 つの条件になります。
 *
 * **操作面に写らない値も並べます。** 目盛りに無い価格や、在庫状況のどれにも当たらない在庫数の範囲は、
 * 操作面では「指定なし」に見えても条件としては効いています。ここで落とすと、何で絞り込まれているかを
 * 画面のどこからも読めなくなります。在庫数の範囲は選択肢の名前を持たないため、数のまま出します。
 *
 * 分類の値には選択肢の表示名を使います。URL に載っているのは ID で、そのまま出しても利用者には
 * 何を選んだのか分かりません。選択肢に無い ID は、契約を外れた値か消えた分類なので飛ばします。
 * 出すと存在しない条件が効いているように読めます。
 *
 * 解除先は URL を組む側と同じ経路で作ります。ここで文字列を削ると、位置のキーを落とす規則を
 * 二重に持つことになります。
 *
 * @param categories - 選べる分類。ID を表示名へ直すために使う
 * @param selection - いま効いている条件
 * @returns 解除先付きの、いま効いている条件の一覧
 */
export function toActiveFilters(
  categories: readonly FilterOption[],
  selection: ProductListSelection,
): readonly ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  const price = formatPriceCondition(selection);

  if (price !== undefined) {
    filters.push({
      key: FILTER_KEY.MIN_PRICE,
      label: PRICE_LABEL,
      value: price,
      removeHref: toProductListHref({
        ...selection,
        [FILTER_KEY.MIN_PRICE]: "",
        [FILTER_KEY.MAX_PRICE]: "",
      }),
    });
  }

  const selected = toSelectedValues(selection, FILTER_KEY.CATEGORY);

  for (const id of selected) {
    const option = categories.find((candidate) => candidate.value === id);

    if (option === undefined) {
      continue;
    }

    filters.push({
      key: `${FILTER_KEY.CATEGORY}:${id}`,
      label: CATEGORY_LABEL,
      value: option.label,
      removeHref: toProductListHref({
        ...selection,
        [FILTER_KEY.CATEGORY]: selected.filter((value) => value !== id),
      }),
    });
  }

  const availability = toStockAvailability(selection);
  const quantity = formatStockQuantity(selection);

  if (quantity !== undefined) {
    const named = availability !== STOCK_AVAILABILITY.ALL;

    filters.push({
      key: FILTER_KEY.MIN_QUANTITY,
      label: named ? STOCK_AVAILABILITY_LABEL : STOCK_QUANTITY_LABEL,
      value: named ? formatStockAvailability(availability) : quantity,
      removeHref: toProductListHref(applyStockAvailability(selection, STOCK_AVAILABILITY.ALL)),
    });
  }

  const keyword = toSelectedValue(selection, FILTER_KEY.KEYWORD);

  if (keyword !== "") {
    filters.push({
      key: FILTER_KEY.KEYWORD,
      label: KEYWORD_LABEL,
      value: keyword,
      removeHref: toProductListHref({ ...selection, [FILTER_KEY.KEYWORD]: "" }),
    });
  }

  return filters;
}
