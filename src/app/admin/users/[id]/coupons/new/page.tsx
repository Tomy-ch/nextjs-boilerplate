import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminUserCouponNewPageContent } from "@/features/admin/users/coupon-new/page-content";
import { AdminUserCouponNewSkeleton } from "@/features/admin/users/coupon-new/ui/skeleton/skeleton";
import { toUserId } from "@/model/user/user";

import { issueUserCouponAction } from "../../../actions";

export const metadata: Metadata = {
  title: "クーポンの発行",
  robots: { index: false, follow: false },
};

async function AdminUserCouponNewContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <AdminUserCouponNewPageContent id={toUserId(id)} issueAction={issueUserCouponAction} />;
}

export default function AdminUserCouponNewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>クーポンの発行</PageHeaderTitle>
          <PageHeaderDescription>
            利用者 1 人に、クーポンを 1 枚発行します。発行は取り消せません。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminUserCouponNewSkeleton />}>
        <AdminUserCouponNewContent params={params} />
      </Suspense>
    </ContentContainer>
  );
}
