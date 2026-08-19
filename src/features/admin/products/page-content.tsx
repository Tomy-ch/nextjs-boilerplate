import { Suspense } from "react";

import { getProductCategories, getProductStatuses } from "@/adapters/server/api/product-masters";
import { parseProductQuery } from "@/adapters/server/api/products";
import { InvalidQueryFeedback } from "@/components/app-starter/invalid-query-feedback/invalid-query-feedback";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { ADMIN_PRODUCT_LIST_PATH } from "../paths";
import { toFilterOptions } from "./filter-option";
import { ADMIN_PRODUCT_PAGE_SIZE } from "./page-size";
import {
  CURSOR_KEY,
  FILTER_KEY,
  FILTER_KEY_LABEL,
  type RawSearchParams,
  toAdminProductListLocation,
} from "./query";
import { AdminProductListResults } from "./results";
import { AdminProductListSkeleton } from "./ui/skeleton/skeleton";
import { AdminProductListView } from "./view";

/** `AdminProductListPageContent` の props。 */
export type AdminProductListPageContentProps = {
  /** page が受け取った素の検索条件。 */
  searchParams: RawSearchParams;
};

/**
 * 管理側の商品一覧の枠。URL の解釈と、画面の組み立てを行う。
 *
 * @remarks
 * **条件によって変わらないものだけを取得します。** 分類と状態のマスタは絞り込みの入力欄そのもので、
 * 検索条件では変わりません。取り直す範囲は {@link AdminProductListResults} が持ちます。
 *
 * 2 つのマスタを並行して取ります。直列にすると、片方が返るまでもう片方の取得が始まりません。
 *
 * URL の条件は `parseProductQuery`（取得の口）へ通し、独自の変換を持ちません。写せなかった条件は
 * 一覧の代わりに {@link InvalidQueryFeedback} へ渡します（検証の契約は
 * `src/features/admin/README.md`「条件の検証と失敗」）。
 *
 * 待機表示の境界に鍵を与えるのは、条件やページが変われば表が総入れ替えになるためです。鍵を
 * 与えないと、次の結果が届くまで前のページの行が残ります。通ってきた道は取得に効かないため
 * 鍵に含めません。含めると、同じ結果を出す遷移でも表が組み直されます。**鍵は値を一意に表す形で
 * 作ります。** 区切り文字で連結すると、値に区切り文字が現れた時点で別の条件が同じ鍵になります。
 */
export async function AdminProductListPageContent({
  searchParams,
}: AdminProductListPageContentProps) {
  const location = toAdminProductListLocation(searchParams);
  const parsed = parseProductQuery({
    ...(location.keyword === "" ? {} : { [FILTER_KEY.KEYWORD]: location.keyword }),
    ...(location.categoryCodes.length === 0
      ? {}
      : { [FILTER_KEY.CATEGORY]: location.categoryCodes }),
    ...(location.statusCodes.length === 0 ? {} : { [FILTER_KEY.STATUS]: location.statusCodes }),
    ...(location.cursor === null ? {} : { [CURSOR_KEY]: location.cursor }),
    first: String(ADMIN_PRODUCT_PAGE_SIZE),
  });

  if (!parsed.ok) {
    return (
      <InvalidQueryFeedback
        invalidKeys={parsed.invalidKeys}
        keyLabels={FILTER_KEY_LABEL}
        message={getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message}
        resetHref={ADMIN_PRODUCT_LIST_PATH}
        resetLabel="条件を外して一覧を見る"
        title="この条件では商品を表示できません"
      />
    );
  }

  const [categories, statuses] = await Promise.all([getProductCategories(), getProductStatuses()]);

  return (
    <AdminProductListView
      categoryOptions={toFilterOptions(categories)}
      conditions={location}
      statusOptions={toFilterOptions(statuses)}
    >
      <Suspense
        fallback={<AdminProductListSkeleton />}
        key={JSON.stringify([
          location.keyword,
          location.categoryCodes,
          location.statusCodes,
          location.cursor,
        ])}
      >
        <AdminProductListResults location={location} query={parsed.query} />
      </Suspense>
    </AdminProductListView>
  );
}
