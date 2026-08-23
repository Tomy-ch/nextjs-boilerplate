import { getDashboardSummary } from "@/adapters/server/api/dashboard";
import { toSummaryCards } from "../summary-cards";
import { StatCards } from "../ui/stat-cards/stat-cards";
import { StatusBreakdown } from "../ui/status-breakdown/status-breakdown";
import type { PeriodRequest } from "./period";

/** `AnalyticsSummarySection` の props。 */
export type AnalyticsSummarySectionProps = {
  /** 期間の指定が集計を求められる形になっているか。 */
  request: PeriodRequest;
};

const LABEL = "選んだ期間の集計";

/** 期間が決まっていないときに、何を直せばよいかを述べる文言。 */
const PENDING_MESSAGE: Readonly<Record<"incomplete" | "reversed", string>> = {
  incomplete: "開始日と終了日の両方を選んでください。",
  reversed: "終了日は開始日と同じ日か、それより後を選んでください。",
};

/**
 * 期間が変わったときに取り直す区画。
 *
 * @remarks
 * **期間を選び直したときに待つのはここだけです。** 選択肢とその下の期間の表示は外側にあり、
 * この区画が取り直している間も出たまま残ります（[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)
 * 「境界の粒度」）。
 *
 * **期間が決まっていないことは失敗ではありません。** 日付をこれから選ぶところなので、取得を
 * 試みず、何を直せばよいかだけを述べます。誤りとして出すと、開いただけで叱られる画面になります。
 */
export async function AnalyticsSummarySection({ request }: AnalyticsSummarySectionProps) {
  if (request.status !== "ready") {
    return (
      <p className="text-sm text-destructive" role="alert">
        {PENDING_MESSAGE[request.status]}
      </p>
    );
  }

  const summary = await getDashboardSummary(request.window);

  return (
    <>
      <StatCards cards={toSummaryCards(summary)} label={LABEL} />
      <StatusBreakdown counts={summary.purchaseStatusCounts} />
    </>
  );
}
