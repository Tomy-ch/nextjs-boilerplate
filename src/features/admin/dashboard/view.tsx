import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import type { DashboardSummary } from "@/model/dashboard/dashboard";

import { ADMIN_ANALYTICS_PATH } from "../paths";
import { toSummaryCards } from "./summary-cards";
import { StatCards } from "./ui/stat-cards/stat-cards";
import { StatusBreakdown } from "./ui/status-breakdown/status-breakdown";

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
 * **期間を選ばせません。** ここは開いた直後に読む面で、選ぶ操作を挟むと「まず今日を見る」
 * という最も多い用途に手数が増えます。期間を跨いで見比べる用は隣の画面（`analytics-view.tsx`）
 * が持ち、この画面はそこへの導線だけを置きます。
 *
 * @see Storybook `Page/Admin/Dashboard`
 */
export function DashboardView({ summary }: DashboardViewProps) {
  return (
    <div className="space-y-8">
      <StatCards cards={toSummaryCards(summary)} label={LABEL} />
      <StatusBreakdown counts={summary.purchaseStatusCounts} />
      <div>
        <Button asChild variant="outline">
          <Link href={ADMIN_ANALYTICS_PATH}>期間を指定して見る</Link>
        </Button>
      </div>
    </div>
  );
}
