import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminProductListPageContent } from "@/features/admin/products/page-content";
import type { RawSearchParams } from "@/features/admin/products/query";
import { AdminProductListSkeleton } from "@/features/admin/products/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "商品一覧管理",
  robots: { index: false, follow: false },
};

/**
 * 管理側の商品一覧管理。
 *
 * @remarks
 * 検索エンジンに拾わせません。管理の面は認可の内側にあり、索引に載っても辿り着けないうえ、
 * 存在だけが外へ出ます（[0044](../../../../docs/adr/0044-seo-metadata-strategy.md)）。
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>商品一覧管理</PageHeaderTitle>
          <PageHeaderDescription>
            公開済みの商品を確認し、作成・編集・在庫の補充へ進みます。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminProductListSkeleton />}>
        <AdminProductListPageContent searchParams={params} />
      </Suspense>
    </ContentContainer>
  );
}
