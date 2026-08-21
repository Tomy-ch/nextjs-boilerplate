import { getProductStatuses } from "@/adapters/server/api/product-masters";
import { getProducts, type ProductQuery } from "@/adapters/server/api/products";
import { CursorPagination } from "@/components/app-starter/cursor-pagination/cursor-pagination";
import { type AdminProductListLocation, toNextPageHref, toPreviousPageHref } from "./query";
import { toAdminProductRows } from "./row";
import { AdminProductTable } from "./ui/table/table";

/** `AdminProductListResults` の props。 */
export type AdminProductListResultsProps = {
  /** URL が表す、いま見ている場所。ページ送りの行き先を組むのに使う。 */
  location: AdminProductListLocation;
  /** 契約に照らし終えた取得条件。 */
  query: ProductQuery;
};

/**
 * 条件に一致する 1 ページぶんの商品。
 *
 * @remarks
 * **条件が変わったときに取り直す範囲がここです。** 検索欄・絞り込み・作成への導線は外側にあり、
 * 取り直しの待機表示に巻き込まれません。
 *
 * 商品とマスタを並行して取ります。状態に色を付けるには、商品が持つ指し先とマスタのコードを
 * 突き合わせる必要があります（{@link toAdminProductRows}）。マスタは要求をまたいで固定されるため、
 * 突き合わせのために毎回取りに行くわけではありません。
 */
export async function AdminProductListResults({ location, query }: AdminProductListResultsProps) {
  const [page, statuses] = await Promise.all([getProducts(query), getProductStatuses()]);

  return (
    <AdminProductTable
      items={toAdminProductRows(page.items, statuses)}
      pagination={
        <CursorPagination
          aria-label="商品一覧のページ送り"
          nextHref={
            page.nextCursor === null ? undefined : toNextPageHref(location, page.nextCursor)
          }
          previousHref={toPreviousPageHref(location)}
        />
      }
    />
  );
}
