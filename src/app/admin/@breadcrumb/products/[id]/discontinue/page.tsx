import { AdminProductDiscontinueBreadcrumbContent } from "@/features/admin/products/discontinue/breadcrumb-content";
import { toProductId } from "@/model/product/product";

/** 商品を廃番にする画面の slot。 */
export default async function AdminProductDiscontinueBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminProductDiscontinueBreadcrumbContent id={toProductId(id)} />;
}
