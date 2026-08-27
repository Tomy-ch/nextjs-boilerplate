import { getDashboardSummary } from "@/adapters/server/api/dashboard";
import { todayWindow } from "@/model/time-window";
import { withScreenSpan } from "@/observability/render-span";
import { DashboardView } from "./view";

/** `AdminDashboardPageContent` の props。 */
export type AdminDashboardPageContentProps = {
  /** 暦日を区切る基準の瞬間。実時計を読む場所は `app` が持つ。 */
  now: Date;
};

/**
 * 管理の入口の中身。取得と組み立てを行う。
 *
 * @remarks
 * 期間を明示して求めます。省略に委ねない理由は
 * `docs/spec/route/admin/page.function.md`「期間を明示して求める」。
 *
 * **「いま」は受け取ります。** ここで実時計を読むと、暦日の区切りが要求のクエリへ入り、検証で
 * 固定できない要求になります（`config/clock`）。
 */
export const AdminDashboardPageContent = withScreenSpan(
  "features/admin/dashboard/page-content",
  async ({ now }: AdminDashboardPageContentProps) => {
    const summary = await getDashboardSummary(todayWindow(now));

    return <DashboardView summary={summary} />;
  },
);
