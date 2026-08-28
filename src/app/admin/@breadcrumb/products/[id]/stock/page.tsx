import { AdminProductStockBreadcrumbContent } from "@/features/admin/products/stock/breadcrumb-content";
import { toProductId } from "@/model/product/product";
import { Suspense } from "react";

/**
 * パンくずの中身。
 *
 * @remarks
 * **`params` を解くのはここです。** slot の側で待つと、器ごと待つことになります
 * （[0041](../../../../../../../docs/adr/0041-cache-components-decision.md)）。
 */
async function AdminProductStockBreadcrumbBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <AdminProductStockBreadcrumbContent id={toProductId(id)} />;
}

/** 在庫を補充する画面の slot。 */
export default function AdminProductStockBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <AdminProductStockBreadcrumbBody params={params} />
    </Suspense>
  );
}
