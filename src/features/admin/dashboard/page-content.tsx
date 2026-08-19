import { getDashboardSummary } from "@/adapters/server/api/dashboard";
import { DASHBOARD_PERIOD } from "@/model/dashboard/dashboard";

import { DashboardView } from "./view";

/**
 * 管理の入口の中身。取得と組み立てを行う。
 *
 * @remarks
 * 期間を明示して求めます。契約の既定値も今日ですが、画面が何を出しているかは画面の側に
 * 書いてある方が、契約の既定が動いたときに気づけます。
 */
export async function AdminDashboardPageContent() {
  const summary = await getDashboardSummary({ period: DASHBOARD_PERIOD.TODAY });

  return <DashboardView summary={summary} />;
}
