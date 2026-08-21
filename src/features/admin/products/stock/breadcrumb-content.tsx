import { getProduct } from "@/adapters/server/api/products";
import type { ProductId } from "@/model/product/product";

import { ProductBreadcrumbTrail } from "../ui/breadcrumb-trail/breadcrumb-trail";

/** `AdminProductStockBreadcrumbContent` の props。 */
export type AdminProductStockBreadcrumbContentProps = {
  /** 在庫を動かしている商品。 */
  id: ProductId;
};

/**
 * 在庫を動かす画面の、現在地までの階層。
 *
 * @remarks
 * 商品名を出すために取得します。本文と同じ取得を通るため、同じ描画の中では 1 回にまとまります。
 */
export async function AdminProductStockBreadcrumbContent({
  id,
}: AdminProductStockBreadcrumbContentProps) {
  const product = await getProduct(id);

  return <ProductBreadcrumbTrail trail={[product.name, "在庫補充"]} />;
}
