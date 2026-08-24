import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import type { DashboardSummary } from "@/model/dashboard/dashboard";
import { withScreenSpan } from "@/observability/render-span";
import { ADMIN_ANALYTICS_PATH } from "../paths";
import { toSummaryCards } from "../summary-cards";
import { StatCards } from "../ui/stat-cards/stat-cards";
import { StatusBreakdown } from "../ui/status-breakdown/status-breakdown";

/** `DashboardView` の props。 */
export type DashboardViewProps = {
  /** 今日の集計。 */
  summary: DashboardSummary;
};

const LABEL = "今日の集計";

/**
 * 管理の入口。今日の集計だけを出す。
 *
 * @remarks
 * 取得を持ちません。集計を受け取って並べるだけにしてあるのは、値の組み合わせ（売上ゼロ・
 * 内訳が空・桁の大きい売上）を取得なしで確かめられるようにするためです。
 *
 * **期間を選ばせず、隣の画面（`../analytics/view.tsx`）への導線だけを置きます。** 導線の名前を
 * 行き先の名前に揃えているのもその一部で、根拠は
 * `docs/spec/route/admin/page.screen.md`「期間を選ばせない」。
 *
 * @see Storybook `Page/Admin/Dashboard`
 */
export const DashboardView = withScreenSpan(
  "features/admin/dashboard/view",
  ({ summary }: DashboardViewProps) => {
    return (
      <div className="space-y-8">
        <StatCards cards={toSummaryCards(summary)} label={LABEL} />
        <StatusBreakdown counts={summary.purchaseStatusCounts} />
        <div>
          <Button asChild variant="outline">
            <Link href={ADMIN_ANALYTICS_PATH}>期間別の集計を見る</Link>
          </Button>
        </div>
      </div>
    );
  },
);
