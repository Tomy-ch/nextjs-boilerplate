import {
  getDashboardSummary,
  parseDashboardQuery,
  type RawDashboardQuery,
} from "@/adapters/server/api/dashboard";
import { getProductRanking, RANKING_PERIOD } from "@/adapters/server/api/products";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

import { type AnalyticsSummaryState, AnalyticsView } from "./analytics-view";
import { toPeriodRequest } from "./period";
import { toRankingRows } from "./ranking-rows";
import { AnalyticsInvalidQuery } from "./ui/invalid-query/invalid-query";

/** page が受け取る素の `searchParams`。 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** 売れ筋に載せる件数。表として一覧できる長さに留める。 */
const RANKING_LIMIT = 10;

const PENDING_MESSAGE: Readonly<Record<"incomplete" | "reversed", string>> = {
  incomplete: "開始日と終了日の両方を選んでください。",
  reversed: "終了日は開始日と同じ日か、それより後を選んでください。",
};

/** 値の無いキーを落とし、契約に照らせる形へ揃える。 */
function toRawQuery(params: RawSearchParams): RawDashboardQuery {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]])),
  );
}

/**
 * 集計の画面の中身。URL の解釈と取得を行う。
 *
 * @remarks
 * URL の条件は `parseDashboardQuery`（取得の口）へ通し、独自の変換を持ちません。契約に照らして
 * 読めない期間は集計の代わりに {@link AnalyticsInvalidQuery} が引き受けます。
 *
 * **売れ筋は期間が決まっていなくても取ります。** ランキングの取得口は期間の選択に従わないため、
 * 集計が出せない間も内容は変わりません。集計と一緒に伏せると、日付を入れるまで画面がほぼ空に
 * なります。
 *
 * **集計と売れ筋を並行して取ります。** 直列にすると、片方が返るまでもう片方の取得が始まりません。
 */
export async function AdminAnalyticsPageContent({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const parsed = parseDashboardQuery(toRawQuery(searchParams));

  if (!parsed.ok) {
    return (
      <AnalyticsInvalidQuery
        invalidKeys={parsed.invalidKeys}
        message={getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message}
      />
    );
  }

  const request = toPeriodRequest(parsed.query);
  const [state, ranking] = await Promise.all([
    request.status === "ready"
      ? getDashboardSummary(request.query).then(
          (summary): AnalyticsSummaryState => ({ status: "ready", summary }),
        )
      : ({
          status: "pending",
          message: PENDING_MESSAGE[request.status],
        } satisfies AnalyticsSummaryState),
    getProductRanking({ period: RANKING_PERIOD.LAST_30_DAYS, limit: RANKING_LIMIT }),
  ]);

  return <AnalyticsView query={parsed.query} ranking={toRankingRows(ranking)} state={state} />;
}
