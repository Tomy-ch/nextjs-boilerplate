import type { Product } from "@/model/product/product";

import { ProductCard } from "./product-card";

/** 一覧に並べる 1 件と、その画像 URL の対。 */
export type ProductListItem = {
  product: Product;
  imageUrl: string | null;
};

/** `ProductList` の props。 */
export type ProductListProps = {
  /** 表示する商品。空なら空状態を描く。 */
  items: readonly ProductListItem[];
};

/** 一覧の先頭何件を LCP 候補として扱うか。折り返し前に見える範囲に合わせる。 */
const LEADING_COUNT = 3;

/**
 * 商品の一覧。
 *
 * @remarks
 * 取得は行いません。渡されたものを並べるだけにしてあるのは、同じ並びを検索結果・カテゴリ別・
 * ランキングのいずれからも使うためです。
 *
 * 空の場合に「0 件」とだけ出さないのは、利用者が次に何をすればよいか分からないためです。
 */
export function ProductList({ items }: ProductListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="font-medium">条件に合う商品がありません</p>
        <p className="mt-2 text-sm text-muted-foreground">
          キーワードを短くするか、絞り込みを外してください。
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ product, imageUrl }, index) => (
        <li key={product.id}>
          <ProductCard product={product} imageUrl={imageUrl} leading={index < LEADING_COUNT} />
        </li>
      ))}
    </ul>
  );
}
