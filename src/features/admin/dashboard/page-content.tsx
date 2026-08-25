import { getDashboardSummary } from "@/adapters/server/api/dashboard";
import { todayWindow } from "@/model/time-window";
import { withScreenSpan } from "@/observability/render-span";
import { DashboardView } from "./view";

/**
 * 管理の入口の中身。取得と組み立てを行う。
 *
 * @remarks
 * 期間を明示して求めます。省略に委ねない理由は
 * `docs/spec/route/admin/page.function.md`「期間を明示して求める」。
 */
export const AdminDashboardPageContent = withScreenSpan(
  "features/admin/dashboard/page-content",
  async () => {
    const summary = await getDashboardSummary(todayWindow(new Date()));

    return <DashboardView summary={summary} />;
  },
);
