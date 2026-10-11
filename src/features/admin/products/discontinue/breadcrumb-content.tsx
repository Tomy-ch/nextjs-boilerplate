import { getProductIncludingUnpublished } from "@/adapters/server/api/products";
import type { ProductId } from "@/model/product/product";

import { ProductBreadcrumbTrail } from "../ui/breadcrumb-trail/breadcrumb-trail";

/** `AdminProductDiscontinueBreadcrumbContent` の props。 */
export type AdminProductDiscontinueBreadcrumbContentProps = {
  /** 廃番にしようとしている商品。 */
  id: ProductId;
};

/**
 * 商品を廃番にする画面の、現在地までの階層。
 *
 * @remarks
 * 商品名を出すために取得します。本文と同じ取得を通るため、同じ描画の中では 1 回にまとまります。
 *
 * @param props - 廃番にする対象の識別子。
 */
export async function AdminProductDiscontinueBreadcrumbContent({
  id,
}: AdminProductDiscontinueBreadcrumbContentProps) {
  const product = await getProductIncludingUnpublished(id);

  return <ProductBreadcrumbTrail trail={[product.name, "廃番"]} />;
}
