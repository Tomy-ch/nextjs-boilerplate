import { getDashboardSummary } from "@/adapters/server/api/dashboard";
import { DASHBOARD_PERIOD } from "@/model/dashboard/dashboard";
import { withScreenSpan } from "@/observability/render-span";
import { DashboardView } from "./view";

/**
 * 管理の入口の中身。取得と組み立てを行う。
 *
 * @remarks
 * 期間を明示して求めます。契約の既定に委ねない理由は
 * `docs/spec/route/admin/page.function.md`「期間を明示して求める」。
 */
export const AdminDashboardPageContent = withScreenSpan(
  "features/admin/dashboard/page-content",
  async () => {
    const summary = await getDashboardSummary({ period: DASHBOARD_PERIOD.TODAY });

    return <DashboardView summary={summary} />;
  },
);
