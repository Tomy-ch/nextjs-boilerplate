import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminDashboardPageContent } from "@/features/admin/dashboard/page-content";
import { AdminDashboardSkeleton } from "@/features/admin/dashboard/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "ダッシュボード",
  robots: { index: false, follow: false },
};

/**
 * 管理の入口。
 *
 * @remarks
 * 検索エンジンに拾わせません。管理の面は認可の内側にあり、索引に載っても辿り着けないうえ、
 * 存在だけが外へ出ます（[0044](../../../docs/adr/0044-seo-metadata-strategy.md)）。
 *
 * 集計はバックエンドが合成したものをそのまま出します。複数の取得口をまたいだ計算を画面が持つと、
 * 同じ指標がバックエンドと画面の 2 か所で定義されます
 * （[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 */
export default function AdminDashboardPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>ダッシュボード</PageHeaderTitle>
          <PageHeaderDescription>今日の売上と、注文の状況を確認します。</PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardPageContent />
      </Suspense>
    </ContentContainer>
  );
}
