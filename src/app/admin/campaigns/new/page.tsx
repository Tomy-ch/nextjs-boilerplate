import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminCampaignCreatePageContent } from "@/features/admin/campaigns/new/page-content";
import { AdminCampaignCreateSkeleton } from "@/features/admin/campaigns/new/ui/skeleton/skeleton";

import { createCampaignAction } from "../actions";

export const metadata: Metadata = {
  title: "キャンペーンの新規作成",
  robots: { index: false, follow: false },
};

/** キャンペーンを定義する画面。 */
export default function AdminCampaignNewPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>キャンペーンの新規作成</PageHeaderTitle>
          <PageHeaderDescription>
            コードと、受け取った人へ配るクーポンの内容を決めます。定義すると一覧へ戻ります。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminCampaignCreateSkeleton />}>
        <AdminCampaignCreatePageContent createAction={createCampaignAction} />
      </Suspense>
    </ContentContainer>
  );
}
