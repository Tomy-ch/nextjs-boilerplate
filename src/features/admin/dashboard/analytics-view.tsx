import type { DashboardSummary } from "@/model/dashboard/dashboard";
import { DASHBOARD_PERIOD, type DashboardSummaryQuery } from "@/model/dashboard/dashboard";

import type { AdminRankingRow } from "./ranking-rows";
import { toSummaryCards } from "./summary-cards";
import { PeriodSwitch } from "./ui/period-switch/period-switch";
import { RangeForm } from "./ui/range-form/range-form";
import { RankingTable } from "./ui/ranking-table/ranking-table";
import { StatCards } from "./ui/stat-cards/stat-cards";
import { StatusBreakdown } from "./ui/status-breakdown/status-breakdown";

/**
 * 選ばれた期間に対する集計の状態。
 *
 * @remarks
 * 「まだ期間が決まっていない」は失敗ではありません。日付をこれから選ぶところなので、誤りとして
 * 出すと、開いただけで叱られる画面になります。
 */
export type AnalyticsSummaryState =
  | { readonly status: "ready"; readonly summary: DashboardSummary }
  | { readonly status: "pending"; readonly message: string };

/** `AnalyticsView` の props。 */
export type AnalyticsViewProps = {
  /** URL が表す条件。期間の切替先と日付欄の初期値になる。 */
  query: DashboardSummaryQuery;
  /** 選ばれた期間の集計。 */
  state: AnalyticsSummaryState;
  /** 売れ筋の商品。期間の選択には従わない。 */
  ranking: readonly AdminRankingRow[];
};

const LABEL = "選んだ期間の集計";

/**
 * 期間を選んで集計を読む画面。
 *
 * @remarks
 * 取得を持ちません。期間・集計・ランキングを受け取って並べるだけです。
 *
 * **数値カードと内訳は入口（`view.tsx`）と同じ部品です。** 同じ値を別の形で出すと、期間を
 * 変えただけのつもりで読み方まで変わります。違うのは、上に期間の選択が乗ることと、期間に
 * 従わないランキングが下に続くことだけです。
 *
 * **期間が決まっていない間も、選択と売れ筋は出したままにします。** 集計の枠だけが入れ替わる
 * ので、日付を入れ直す場所が画面のどこかへ動きません。
 *
 * @see Storybook `Page/Admin/Analytics`
 */
export function AnalyticsView({ query, state, ranking }: AnalyticsViewProps) {
  const period = query.period ?? DASHBOARD_PERIOD.TODAY;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PeriodSwitch current={period} query={query} />
        {period === DASHBOARD_PERIOD.RANGE ? (
          <RangeForm
            from={query.from}
            message={state.status === "pending" ? state.message : undefined}
            to={query.to}
          />
        ) : null}
      </div>
      {state.status === "ready" ? (
        <>
          <StatCards cards={toSummaryCards(state.summary)} label={LABEL} />
          <StatusBreakdown counts={state.summary.purchaseStatusCounts} />
        </>
      ) : null}
      <RankingTable rows={ranking} />
    </div>
  );
}
