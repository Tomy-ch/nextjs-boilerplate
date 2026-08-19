import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import {
  AdminAnalyticsPageContent,
  type RawSearchParams,
} from "@/features/admin/dashboard/analytics-content";
import { AdminDashboardSkeleton } from "@/features/admin/dashboard/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "集計",
  robots: { index: false, follow: false },
};

/**
 * 期間を選んで集計を読む画面。
 *
 * @remarks
 * 索引に載せない理由はダッシュボード（`../page.tsx`）と同じです。
 *
 * 待機表示の境界に鍵を与えるのは、期間が変われば数値が総入れ替えになるためです。鍵を与えないと、
 * 次の集計が届くまで前の期間の数が残ります。**鍵は値を一意に表す形で作ります。** 区切り文字で
 * 連結すると、値に区切り文字が現れた時点で別の期間が同じ鍵になります。
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>集計</PageHeaderTitle>
          <PageHeaderDescription>
            期間を選んで売上と注文の状況を読み、売れ筋の商品を確認します。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminDashboardSkeleton />} key={JSON.stringify(params)}>
        <AdminAnalyticsPageContent searchParams={params} />
      </Suspense>
    </ContentContainer>
  );
}
