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
 * **未公開の商品も母集団に含めます。** ここは管理の画面で、公開前の商品を出せないと編集に辿り
 * 着けません。契約の既定は公開済みだけで、含める指定は管理の役割を持つ主体しか通りません。
 * 母集団を変えると並び順の軸も登録日時に変わるため、ページ送りの鍵は同じ指定の中でだけ使えます
 * —— この画面は指定を切り替えないので、鍵が別の母集団へ持ち越されることはありません。
 *
 * 商品とマスタを並行して取ります。状態に色を付けるには、商品が持つ指し先とマスタのコードを
 * 突き合わせる必要があります（{@link toAdminProductRows}）。マスタは要求をまたいで固定されるため、
 * 突き合わせのために毎回取りに行くわけではありません。
 */
export async function AdminProductListResults({ location, query }: AdminProductListResultsProps) {
  const [page, statuses] = await Promise.all([
    getProducts({ ...query, includeUnpublished: true }),
    getProductStatuses(),
  ]);

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
