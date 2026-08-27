import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { MAX_UPLOAD_BYTES } from "@/config/http/http.client";
import { AdminProductCreatePageContent } from "@/features/admin/products/new/page-content";
import { AdminProductCreateSkeleton } from "@/features/admin/products/new/ui/skeleton/skeleton";

import { createProductAction, uploadProductImageAction } from "../actions";

export const metadata: Metadata = {
  title: "商品の新規作成",
  robots: { index: false, follow: false },
};

/**
 * 商品を作る画面。
 *
 * @remarks
 * 受け付ける大きさをここで読んで渡します。config を読んでよいのは起動・ビルドの境界と app 層で、
 * 画面の側は受け取った値で判定するだけです。
 */
export default function AdminProductNewPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>商品の新規作成</PageHeaderTitle>
          <PageHeaderDescription>
            基本情報から公開までを順に入力します。登録すると一覧へ戻ります。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminProductCreateSkeleton />}>
        <AdminProductCreatePageContent
          createAction={createProductAction}
          maxUploadBytes={MAX_UPLOAD_BYTES}
          uploadAction={uploadProductImageAction}
        />
      </Suspense>
    </ContentContainer>
  );
}
