import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { getClockConfig } from "@/config/clock/clock.server";
import { AdminAnalyticsPageContent } from "@/features/admin/analytics/page-content";
import { AdminSummarySkeleton } from "@/features/admin/ui/skeleton/skeleton";
import type { RawSearchParams } from "@/model/search-params";

export const metadata: Metadata = {
  title: "集計",
  robots: { index: false, follow: false },
};

/**
 * 集計の中身。
 *
 * @remarks
 * **`searchParams` を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません。
 * 器は promise のまま渡し、穴の内側で解きます。
 *
 * **「いま」は `searchParams` を解いた後に読みます。** 実時計はプリレンダーの最中には値が定まらず、
 * 要求ごとの値を待った後なら「要求のときに描く」ことが確定しています。
 */
async function AdminAnalyticsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;

  return <AdminAnalyticsPageContent now={getClockConfig().now()} searchParams={params} />;
}

/**
 * 期間を選んで集計を読む画面。
 *
 * @remarks
 * 索引に載せない理由はダッシュボード（`../page.tsx`）と同じです。
 *
 * 「いま」をここで読んで渡す理由はダッシュボード（`../page.tsx`）と同じです。
 *
 * **待機の境界をここに置きません。** 期間を選び直したときに待つのは集計だけで、選択肢まで
 * 置き換わると押したものが消えてから戻ってきます。境界の位置は中身が持ちます
 * （`features/admin/analytics/page-content.tsx`）。
 */
export default function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
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
      <Suspense fallback={<AdminSummarySkeleton />}>
        <AdminAnalyticsContent searchParams={searchParams} />
      </Suspense>
    </ContentContainer>
  );
}
