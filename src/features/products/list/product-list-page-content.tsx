import { getProducts } from "@/adapters/server/api/products";
import { resolveMediaUrl } from "@/adapters/server/media/media-url";

import { ProductList } from "./product-list";
import { ProductPagination } from "./product-pagination";
import type { RawSearchParams } from "./product-query";
import { toProductQuery } from "./product-query";
import { ProductSearch } from "./product-search";

/** `ProductsPageContent` の props。 */
export type ProductsPageContentProps = {
  /** page が受け取った素の検索条件。 */
  searchParams: RawSearchParams;
};

/**
 * 商品一覧の中身。取得と組み立てを行う。
 *
 * @remarks
 * 取得を page ではなくここで行うのは、待機表示の境界を実際にデータを待つ部分の近くへ置く
 * ためです（[0080](../../../docs/adr/0080-error-handling.md)）。page 全体を 1 つの待機表示で
 * 覆うと、検索欄まで一緒に消えて操作できなくなります。
 *
 * 画像 URL の解決をここでまとめているのは、`adapters` を呼べるのが feature までであり、
 * 表示部品に設定を持ち込まないためです。
 */
export async function ProductsPageContent({ searchParams }: ProductsPageContentProps) {
  const query = toProductQuery(searchParams);
  const page = await getProducts(query);
  const items = page.products.map((product) => ({
    product,
    imageUrl: resolveMediaUrl(product.imagePath),
  }));

  return (
    <div className="space-y-6">
      <ProductSearch defaultKeyword={query.keyword ?? ""} />
      <ProductList items={items} />
      <ProductPagination nextCursor={page.nextCursor} searchParams={searchParams} />
    </div>
  );
}
