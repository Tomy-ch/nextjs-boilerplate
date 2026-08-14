import type { RefObject } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { Spinner } from "@/components/design-system/status/spinner/spinner";
import type { ProductListItem } from "@/model/product/product";

import { ProductGrid } from "../grid/grid";

/** `ProductLoadMoreList` の props。 */
export type ProductLoadMoreListProps = {
  /** 読み込み済みのすべての商品。 */
  items: readonly ProductListItem[];
  /** 条件に一致する総数。分からなければ省く。 */
  total?: number;
  /** まだ続きがあるか。 */
  hasNext: boolean;
  /** 続きを取得している最中か。 */
  loading?: boolean;
  /** 直前の取得に失敗したか。 */
  failed?: boolean;
  /** 続きを読み直す操作。失敗したときだけ使う。 */
  onLoadMore?: () => void;
  /** 末尾到達を見張る目印を置く先。scroll で読み進める側が渡す。 */
  sentinelRef?: RefObject<HTMLDivElement | null>;
};

/**
 * 読み進めた一覧の見た目。
 *
 * @remarks
 * 取得を持ちません。読み込み済みの件数・取得中・失敗・終端という 4 つの見え方を、状態を持たずに
 * 描き分けます。取得と末尾到達の検知は呼び出し元が
 * 持ちます。
 *
 * **続きを読む操作は失敗したときだけ出します。** 読み進めている間は末尾に近づくだけで次が
 * 始まるため、同じことをする入口を並べても選ぶ手数が増えるだけです。失敗した後だけは事情が
 * 違い、末尾到達の検知はその場に留まる限り二度と起きないので、操作が唯一の復帰口になります。
 *
 * この形でも scroll 以外の手段が失われないのは、keyboard の scroll も支援技術の読み進めも
 * 表示位置を動かし、末尾到達の検知はそれで発火するためです
 * （[0100](../../../../../../docs/adr/0100-accessibility-target.md)）。動かしても直らない失敗の
 * 場面にだけ操作を置くのは、この性質と表裏です。
 *
 * 総数は一覧の応答から取れないため、分かる場合だけ受け取って添えます。読み込んだ数だけを
 * 「全体の何件中」の形に見せると、実際には知らない数を知っているように読めます。
 *
 * `FilterBarSummary` は使いません。あちらの母数は「絞り込む前の総件数」で、ここで出したいのは
 * 「条件に一致する総数のうち何件を読み終えたか」だからです。文字列は似ますが、絞り込みが何件を
 * 削ったかという情報は持っていません。
 *
 * 件数と読み込み状況を、それぞれ別に読み上げさせます。件数は結果そのもので、読み込み中は進行の
 * 報告なので、1 つの文へまとめると読み込みのたびに件数まで読み直されます。追加された商品は一覧の
 * 末尾に増えるだけなので、伝えないと画面を見ていない利用者には何も起きていないのと区別が付きません。
 */
export function ProductLoadMoreList({
  items,
  total,
  hasNext,
  loading = false,
  failed = false,
  onLoadMore,
  sentinelRef,
}: ProductLoadMoreListProps) {
  return (
    <div className="space-y-6">
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {total === undefined
          ? `${items.length} 件を表示中`
          : `全 ${total} 件中 ${items.length} 件を表示中`}
      </p>
      <ProductGrid items={items} />
      {hasNext ? (
        <div className="flex min-h-12 flex-col items-center gap-3" ref={sentinelRef}>
          {failed ? (
            <>
              <p className="text-destructive text-sm">続きを読み込めませんでした。</p>
              <Button onClick={onLoadMore} type="button" variant="outline">
                もう一度読み込む
              </Button>
            </>
          ) : null}
          {loading ? (
            <Spinner className="size-6 text-muted-foreground" label="続きを読み込んでいます" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
