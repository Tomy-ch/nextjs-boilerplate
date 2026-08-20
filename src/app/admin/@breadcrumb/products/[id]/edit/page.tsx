import { AdminProductEditBreadcrumbContent } from "@/features/admin/products/edit/breadcrumb-content";
import { toProductId } from "@/model/product/product";

/** 商品を編集する画面の slot。 */
export default async function AdminProductEditBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminProductEditBreadcrumbContent id={toProductId(id)} />;
}
