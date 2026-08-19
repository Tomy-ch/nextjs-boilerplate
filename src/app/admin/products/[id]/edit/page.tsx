import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { getHttpConfig } from "@/config/http/http.server";
import { AdminProductEditPageContent } from "@/features/admin/products/edit/page-content";
import { AdminProductListSkeleton } from "@/features/admin/products/ui/skeleton/skeleton";
import { toProductId } from "@/model/product/product";

import { updateProductAction, uploadProductImageAction } from "../../actions";

export const metadata: Metadata = {
  title: "商品の編集",
  robots: { index: false, follow: false },
};

/**
 * 商品を編集する画面。
 *
 * @remarks
 * 在庫数はここで扱いません。在庫は加算で動かすもので、読んで書き戻す形にすると読んでから送るまで
 * の間に売れた分を打ち消します。
 */
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>商品の編集</PageHeaderTitle>
          <PageHeaderDescription>
            観点を選んで直します。更新すると一覧へ戻ります。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminProductListSkeleton />}>
        <AdminProductEditPageContent
          id={toProductId(id)}
          maxUploadBytes={getHttpConfig().maxUploadBytes}
          updateAction={updateProductAction}
          uploadAction={uploadProductImageAction}
        />
      </Suspense>
    </ContentContainer>
  );
}
