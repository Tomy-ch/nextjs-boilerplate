import type { AdminProductFilterOption } from "./filter-option";
import {
  type AdminProductListConditions,
  DISCONTINUED_FILTER_LABEL,
  FILTER_KEY,
  FILTER_KEY_LABEL,
  toConditionHref,
} from "./query";

/** いま効いている条件 1 件。解除先まで含めて、表示側が組み立て直さずに済む形で持つ。 */
export type AdminActiveFilter = {
  /** 並びの安定と React の鍵に使う。 */
  readonly key: string;
  /** 条件の名前。「キーワード」「分類」など。 */
  readonly label: string;
  /** 条件の値。利用者が選んだ表示名で、コードではない。 */
  readonly value: string;
  /** この条件だけを外した URL。 */
  readonly removeHref: string;
};

/**
 * 選ばれたコードを、解除先付きの条件へ写す。
 *
 * @remarks
 * URL に載っているのはマスタ行を指す番号で、そのまま出しても何を選んだのかは読めません。
 * 選択肢に無い番号は条件として出しません。
 *
 * **外すのはその 1 つだけ**です（理由は `docs/spec/route/admin/products/page.function.md#the-url-holds-the-search-conditions`）。
 *
 * @param codes - 選ばれたコードの一覧
 * @param options - コードを表示名へ直す候補
 * @param label - 各条件に付ける表示名
 * @param key - 条件のキーに使う接頭辞
 * @param toConditions - 1 件を外した残りのコードから条件を組み立てる関数
 * @returns 解除先付きの条件の一覧
 */
function toFilters(
  codes: readonly string[],
  options: readonly AdminProductFilterOption[],
  label: string,
  key: string,
  toConditions: (remaining: readonly string[]) => AdminProductListConditions,
): readonly AdminActiveFilter[] {
  return codes.flatMap((code) => {
    const option = options.find((candidate) => candidate.value === code);

    if (option === undefined) {
      return [];
    }

    return [
      {
        key: `${key}:${code}`,
        label,
        value: option.label,
        removeHref: toConditionHref(toConditions(codes.filter((kept) => kept !== code))),
      },
    ];
  });
}

/**
 * いま効いている条件を、解除先付きの一覧へ写す。
 *
 * @remarks
 * 別に並べる理由は `AdminProductListView` が持ちます。
 *
 * 解除先は URL を組む側と同じ経路で作ります。ここで文字列を削ると、位置のキーを落とす規則を
 * 二重に持つことになります。
 *
 * @param conditions - いま効いている条件
 * @param categoryOptions - 選べる分類。コードを表示名へ直すために使う
 * @param statusOptions - 選べる状態。同上
 * @returns 解除先付きの条件の一覧
 */
export function toAdminActiveFilters(
  conditions: AdminProductListConditions,
  categoryOptions: readonly AdminProductFilterOption[],
  statusOptions: readonly AdminProductFilterOption[],
): readonly AdminActiveFilter[] {
  const filters: AdminActiveFilter[] = [];

  if (conditions.keyword !== "") {
    filters.push({
      key: "keyword",
      label: FILTER_KEY_LABEL[FILTER_KEY.KEYWORD],
      value: conditions.keyword,
      removeHref: toConditionHref({ ...conditions, keyword: "" }),
    });
  }

  filters.push(
    ...toFilters(
      conditions.categoryCodes,
      categoryOptions,
      FILTER_KEY_LABEL[FILTER_KEY.CATEGORY],
      "category",
      (categoryCodes) => ({ ...conditions, categoryCodes }),
    ),
    ...toFilters(
      conditions.statusCodes,
      statusOptions,
      FILTER_KEY_LABEL[FILTER_KEY.STATUS],
      "status",
      (statusCodes) => ({
        ...conditions,
        statusCodes,
      }),
    ),
  );

  if (conditions.discontinued !== null) {
    filters.push({
      key: FILTER_KEY.DISCONTINUED,
      label: FILTER_KEY_LABEL[FILTER_KEY.DISCONTINUED],
      value: DISCONTINUED_FILTER_LABEL[conditions.discontinued],
      removeHref: toConditionHref({ ...conditions, discontinued: null }),
    });
  }

  return filters;
}
