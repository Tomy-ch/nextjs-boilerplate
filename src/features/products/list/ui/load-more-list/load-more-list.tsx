import type { RefObject } from "react";

import { LoadMore } from "@/components/app-starter/load-more/load-more";
import type { LoadMoreState } from "@/components/app-starter/load-more/load-more.definition";
import type { ProductListItem } from "@/model/product/product";
import { withPartSpan } from "@/observability/render-span";
import { ProductGrid } from "../grid/grid";
import { ProductListSkeleton } from "../skeleton/skeleton";

/** `ProductLoadMoreList` の props。 */
export type ProductLoadMoreListProps = {
  /** 読み込み済みのすべての商品。 */
  items: readonly ProductListItem[];
  /** 条件に一致する総数。分からなければ省く。 */
  total?: number;
  /** 続きの読み込みの状態。 */
  loadMore: LoadMoreState;
  /** 末尾到達を見張る目印を置く先。scroll で読み進める側が渡す。 */
  sentinelRef?: RefObject<HTMLDivElement | null>;
};

/**
 * 読み進めた一覧の見た目。
 *
 * @remarks
 * 取得を持ちません。読み込み済みの件数と並びだけを描き、続きの読み込みの見え方は
 * [`LoadMore`](../../../../../components/app-starter/load-more/README.md) が持ちます。
 *
 * 総数は一覧の応答から取れないため、分かる場合だけ受け取って添えます。読み込んだ数だけを
 * 「全体の何件中」の形に見せると、実際には知らない数を知っているように読めます。
 *
 * `FilterBarSummary` は使いません。あちらの母数は「絞り込む前の総件数」で、ここで出したいのは
 * 「条件に一致する総数のうち何件を読み終えたか」だからです。文字列は似ますが、絞り込みが何件を
 * 削ったかという情報は持っていません。
 *
 * 件数を読み上げへ伝えます。追加された商品は一覧の末尾に増えるだけなので、伝えないと画面を
 * 見ていない利用者には何も起きていないのと区別が付きません。読み込み中の報告を同じ文へ
 * まとめないのは、読み込みのたびに件数まで読み直されるためです。
 */
export const ProductLoadMoreList = withPartSpan(
  "features/products/list/ui/load-more-list/load-more-list",
  ({ items, total, loadMore, sentinelRef }: ProductLoadMoreListProps) => {
    return (
      <div className="space-y-6">
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {total === undefined
            ? `${items.length} 件を表示中`
            : `全 ${total} 件中 ${items.length} 件を表示中`}
        </p>
        <ProductGrid items={items} />
        <LoadMore
          placeholder={<ProductListSkeleton />}
          sentinelRef={sentinelRef}
          state={loadMore}
        />
      </div>
    );
  },
);
