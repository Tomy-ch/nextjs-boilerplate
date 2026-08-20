import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import {
  AdminAnalyticsPageContent,
  type RawSearchParams,
} from "@/features/admin/analytics/page-content";

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
 * **待機の境界をここに置きません。** 期間を選び直したときに待つのは集計だけで、選択肢まで
 * 置き換わると押したものが消えてから戻ってきます。境界の位置は中身が持ちます
 * （`features/admin/analytics/page-content.tsx`）。
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
      <AdminAnalyticsPageContent searchParams={params} />
    </ContentContainer>
  );
}
