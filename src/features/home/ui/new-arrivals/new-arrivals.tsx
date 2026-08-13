import Link from "next/link";

import { PRODUCT_LIST_PATH } from "@/features/products/facade/list-url/list-url";
import type { ProductListItem } from "@/model/product/product";

import { ProductTeaser } from "../product-teaser/product-teaser";

/** `NewArrivals` の props。 */
export type NewArrivalsProps = {
  /** 公開日時の新しい順に並んだ商品。空なら節ごと描かない。 */
  items: readonly ProductListItem[];
};

/** 折り返し前に見える位置として扱う件数。段が最も多いときの 1 行分に合わせる。 */
const LEADING_COUNT = 4;

/**
 * 新着商品。
 *
 * @remarks
 * 段の数は器の幅で決めます。トップは脇に何も置きませんが、同じ節を脇のある画面へ移したときに
 * viewport 基準だと詰まって見える帯ができます（[0051](../../../../docs/adr/0051-styling-system.md) §2）。
 *
 * 一覧への導線を節の見出しの隣に置いています。ここに並ぶのは先頭の数件だけで、続きがあることを
 * 示さないと、これが全部だと読めてしまいます。
 */
export function NewArrivals({ items }: NewArrivalsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">新着商品</h2>
        <Link
          className="rounded-xs text-sm text-muted-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          href={PRODUCT_LIST_PATH}
        >
          すべての商品を見る
        </Link>
      </div>
      <div className="@container/new-arrivals mt-4">
        <ul className="grid grid-cols-2 gap-4 @2xl/new-arrivals:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.id}>
              <ProductTeaser item={item} leading={index < LEADING_COUNT} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
