import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminProductStockPageContent } from "@/features/admin/products/stock/page-content";
import { AdminProductStockSkeleton } from "@/features/admin/products/stock/ui/skeleton/skeleton";
import { toProductId } from "@/model/product/product";

import { adjustProductStockAction } from "../../actions";

export const metadata: Metadata = {
  title: "在庫の補充",
  robots: { index: false, follow: false },
};

/**
 * 在庫を補充する画面。
 *
 * @remarks
 * 在庫以外はここで扱いません。編集の画面が持ちます。
 */
export default async function AdminProductStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>在庫の補充</PageHeaderTitle>
          <PageHeaderDescription>
            増やす量・減らす量を指定します。更新すると一覧へ戻ります。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminProductStockSkeleton />}>
        <AdminProductStockPageContent
          adjustAction={adjustProductStockAction}
          id={toProductId(id)}
        />
      </Suspense>
    </ContentContainer>
  );
}
