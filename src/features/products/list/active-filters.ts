import { FILTER_KEY, type ProductListSelection, toProductListHref } from "./query";
import type { FilterGroup } from "./ui/filter-fields/filter-fields";

/** いま効いている条件 1 件。解除先まで含めて、表示側が組み立て直さずに済む形で持つ。 */
export type ActiveFilter = {
  /** URL に載せているキー。並びの安定と React の鍵に使う。 */
  readonly key: string;
  /** 条件の名前。「カテゴリ」「キーワード」など。 */
  readonly label: string;
  /** 条件の値。利用者が選んだ表示名で、ID ではない。 */
  readonly value: string;
  /** この条件だけを外した URL。 */
  readonly removeHref: string;
};

/** キーワードの条件名。群と違い選択肢を持たないため、ここで名前を与える。 */
const KEYWORD_LABEL = "キーワード";

/**
 * いま効いている条件を、解除先付きの一覧へ写す。
 *
 * @remarks
 * 並び替えを含めません。常に値を持つため条件として並べると外せない chip が居座り、外せるものと
 * 外せないものが同じ見た目で混ざります。
 *
 * 値には選択肢の表示名を使います。URL に載っているのは ID で、そのまま出しても利用者には何を
 * 選んだのか分かりません。選択肢に無い ID は、契約を外れた値か消えた分類なので飛ばします。
 * 出すと存在しない条件が効いているように読めます。
 *
 * 解除先は URL を組む側と同じ経路で作ります。ここで文字列を削ると、位置のキーを落とす規則を
 * 二重に持つことになります。
 */
export function toActiveFilters(
  groups: readonly FilterGroup[],
  selection: ProductListSelection,
): readonly ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  for (const group of groups) {
    const selected = selection[group.key] ?? "";
    const option = group.options.find((candidate) => candidate.value === selected);

    if (selected === "" || option === undefined) {
      continue;
    }

    filters.push({
      key: group.key,
      label: group.legend,
      value: option.label,
      removeHref: toProductListHref({ ...selection, [group.key]: "" }),
    });
  }

  const keyword = selection[FILTER_KEY.KEYWORD] ?? "";

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
