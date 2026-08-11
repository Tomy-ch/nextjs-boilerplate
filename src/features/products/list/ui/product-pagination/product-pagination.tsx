import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";

import type { RawSearchParams } from "./product-query";

/** `ProductPagination` の props。 */
export type ProductPaginationProps = {
  /** 次ページのカーソル。最終ページなら null。 */
  nextCursor: string | null;
  /** 現在の検索条件。次ページのリンクへ引き継ぐ。 */
  searchParams: RawSearchParams;
};

/**
 * cursor 方式のページ送り。
 *
 * @remarks
 * 番号付きのページ送りは作れません。cursor は「次」を指すだけで、総件数も任意ページへの
 * 飛び先も持たないためです（[0073](../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 *
 * 遷移をボタンではなくリンクにしています。次ページが URL として存在すれば、共有と戻る操作が
 * そのまま成立し、JavaScript の読み込み前でも辿れます。
 */
export function ProductPagination({ nextCursor, searchParams }: ProductPaginationProps) {
  if (nextCursor === null) {
    return null;
  }

  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const found = Array.isArray(value) ? value[0] : value;

    if (found !== undefined && found !== "" && key !== "after") {
      next.set(key, found);
    }
  }

  next.set("after", nextCursor);

  return (
    <nav aria-label="ページ送り" className="flex justify-center">
      <Button asChild variant="outline">
        <Link href={`/products?${next.toString()}`}>次の商品を見る</Link>
      </Button>
    </nav>
  );
}
