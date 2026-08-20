import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AdminDashboardPageContent } from "@/features/admin/dashboard/page-content";
import { AdminSummarySkeleton } from "@/features/admin/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "ダッシュボード",
  robots: { index: false, follow: false },
};

/**
 * 管理の入口。
 *
 * @remarks
 * 索引に載せない理由は `docs/spec/route/admin/layout.function.md`「索引に載せない」。器の下の
 * すべての画面に効きます。
 *
 * 集計はバックエンドが合成したものをそのまま出します。画面が計算を持たない理由は
 * `docs/spec/route/admin/page.function.md`「集計はフロントで作らない」、値の母集団は
 * `model/dashboard` の `DashboardSummary`。
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
      <Suspense fallback={<AdminSummarySkeleton />}>
        <AdminDashboardPageContent />
      </Suspense>
    </ContentContainer>
  );
}
