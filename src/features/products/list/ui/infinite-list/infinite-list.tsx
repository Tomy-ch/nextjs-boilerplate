"use client";

import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";

import type { ProductListSelection } from "../../../facade/list-url/list-url";

import { useInfiniteProducts } from "../../use-infinite-products";
import { ProductLoadMoreList } from "../load-more-list/load-more-list";

/** `ProductInfiniteList` の props。 */
export type ProductInfiniteListProps = {
  /** Server Component が取得した最初のページ。 */
  initial: CursorPage<ProductListItem>;
  /** いま効いている検索条件。続きの取得へそのまま渡す。 */
  query: ProductListSelection;
  /** 条件に一致する総数。分からなければ省く。 */
  total?: number;
};

/**
 * 読み進められる商品の一覧。
 *
 * @remarks
 * 取得と見た目をつなぐだけです。見た目は {@link ProductLoadMoreList} が持ち、取得と末尾到達の
 * 検知は `useInfiniteProducts` が持ちます。分けてあるのは、見え方の確認に取得を必要としない
 * ようにするためです。
 */
export function ProductInfiniteList({ initial, query, total }: ProductInfiniteListProps) {
  const { items, hasNext, loading, failed, loadMore, sentinelRef } = useInfiniteProducts(
    initial,
    query,
  );

  return (
    <ProductLoadMoreList
      failed={failed}
      hasNext={hasNext}
      items={items}
      loading={loading}
      onLoadMore={loadMore}
      sentinelRef={sentinelRef}
      total={total}
    />
  );
}
