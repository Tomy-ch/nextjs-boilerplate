import { AdminProductEditBreadcrumbContent } from "@/features/admin/products/edit/breadcrumb-content";
import { toProductId } from "@/model/product/product";
import { Suspense } from "react";

/**
 * パンくずの中身。
 *
 * @remarks
 * **`params` を解くのはここです。** slot の側で待つと、器ごと待つことになります
 * （[0041](../../../../../../../docs/adr/0041-cache-components-decision.md)）。
 */
async function AdminProductEditBreadcrumbBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <AdminProductEditBreadcrumbContent id={toProductId(id)} />;
}

/** 商品を編集する画面の slot。 */
export default function AdminProductEditBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <AdminProductEditBreadcrumbBody params={params} />
    </Suspense>
  );
}
