import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminProductDiscontinuePageContent } from "@/features/admin/products/discontinue/page-content";
import { AdminProductDiscontinueSkeleton } from "@/features/admin/products/discontinue/ui/skeleton/skeleton";
import { toProductId } from "@/model/product/product";

import { discontinueProductAction } from "../../actions";

export const metadata: Metadata = {
  title: "商品の廃番",
  robots: { index: false, follow: false },
};

/**
 * 廃番の中身。
 *
 * @remarks
 * **`params` を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません。
 * 器は promise のまま渡し、穴の内側で解きます。
 */
async function AdminProductDiscontinueContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminProductDiscontinuePageContent
      discontinueAction={discontinueProductAction}
      id={toProductId(id)}
    />
  );
}

/** 商品を廃番にする画面。 */
export default function AdminProductDiscontinuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>商品の廃番</PageHeaderTitle>
          <PageHeaderDescription>
            影響を確かめてから、代替クーポンの条件を決めて廃番にします。廃番は取り消せません。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminProductDiscontinueSkeleton />}>
        <AdminProductDiscontinueContent params={params} />
      </Suspense>
    </ContentContainer>
  );
}
