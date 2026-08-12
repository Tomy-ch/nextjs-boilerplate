"use client";

import { Button } from "@/components/design-system/action/button/button";
import type { CursorPage } from "@/model/pagination";
import type { ProductListItem } from "@/model/product/product";

import { useInfiniteProducts } from "../../use-infinite-products";
import { ProductList } from "../../view";

/** `ProductInfiniteList` の props。 */
export type ProductInfiniteListProps = {
  /** Server Component が取得した最初のページ。 */
  initial: CursorPage<ProductListItem>;
  /** いま効いている検索条件。続きの取得へそのまま渡す。 */
  query: Readonly<Record<string, string>>;
};

/**
 * 読み進められる商品の一覧。
 *
 * @remarks
 * 末尾に近づくと続きを読みますが、操作としての「もっと見る」も併せて置きます。scroll だけを
 * 引き金にすると、keyboard や支援技術で読む利用者に続きを読む手段が無くなります
 * （[0100](../../../../../docs/adr/0100-accessibility-target.md)）。
 *
 * 件数を「表示中」と書いて総件数を添えないのは、契約が総件数を返さないためです。読み込んだ数を
 * 「全体の何件中」の形に見せると、実際には知らない数を知っているように読めます。
 *
 * 読み込み状況を `aria-live` で伝えます。追加された商品は一覧の末尾に増えるだけなので、画面を
 * 見ていない利用者には何も起きていないのと区別が付きません。
 */
export function ProductInfiniteList({ initial, query }: ProductInfiniteListProps) {
  const { items, hasNext, loading, failed, loadMore, sentinelRef } = useInfiniteProducts(
    initial,
    query,
  );

  return (
    <div className="space-y-6">
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {loading
          ? `${items.length} 件を表示中（続きを読み込んでいます）`
          : `${items.length} 件を表示中`}
      </p>
      <ProductList items={items} />
      {hasNext ? (
        <div className="flex flex-col items-center gap-3" ref={sentinelRef}>
          {failed ? (
            <p className="text-destructive text-sm">
              続きを読み込めませんでした。もう一度お試しください。
            </p>
          ) : null}
          <Button disabled={loading} onClick={loadMore} type="button" variant="outline">
            {loading ? "読み込み中" : "もっと見る"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
