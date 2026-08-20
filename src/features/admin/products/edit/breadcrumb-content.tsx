import { getProduct } from "@/adapters/server/api/products";
import type { ProductId } from "@/model/product/product";

import { ProductBreadcrumbTrail } from "../ui/breadcrumb-trail/breadcrumb-trail";

/** `AdminProductEditBreadcrumbContent` の props。 */
export type AdminProductEditBreadcrumbContentProps = {
  /** 編集している商品。 */
  id: ProductId;
};

/**
 * 商品を編集する画面の、現在地までの階層。
 *
 * @remarks
 * 商品名を出すために取得します。本文と同じ取得を通るため、同じ描画の中では 1 回にまとまります。
 */
export async function AdminProductEditBreadcrumbContent({
  id,
}: AdminProductEditBreadcrumbContentProps) {
  const product = await getProduct(id);

  return <ProductBreadcrumbTrail trail={[product.name, "編集"]} />;
}
