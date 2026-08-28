import { AdminProductStockBreadcrumbContent } from "@/features/admin/products/stock/breadcrumb-content";
import { toProductId } from "@/model/product/product";

/** 在庫を補充する画面の slot。 */
export default async function AdminProductStockBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminProductStockBreadcrumbContent id={toProductId(id)} />;
}
