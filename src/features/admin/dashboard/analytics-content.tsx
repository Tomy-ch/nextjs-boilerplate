import { Suspense } from "react";

import {
  getDashboardSummary,
  parseDashboardQuery,
  type RawDashboardQuery,
} from "@/adapters/server/api/dashboard";
import { getProductRanking, RANKING_PERIOD } from "@/adapters/server/api/products";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import type { DashboardSummaryQuery } from "@/model/dashboard/dashboard";

import { AnalyticsView } from "./analytics-view";
import { type PeriodRequest, toPeriodRequest } from "./period";
import { toPeriodWindow } from "./period-window";
import { toRankingRows } from "./ranking-rows";
import { toSummaryCards } from "./summary-cards";
import { AnalyticsInvalidQuery } from "./ui/invalid-query/invalid-query";
import { RankingTable } from "./ui/ranking-table/ranking-table";
import { AdminDashboardSkeleton } from "./ui/skeleton/skeleton";
import { StatCards } from "./ui/stat-cards/stat-cards";
import { StatusBreakdown } from "./ui/status-breakdown/status-breakdown";

/** page が受け取る素の `searchParams`。 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** 売れ筋に載せる件数。表として一覧できる長さに留める。 */
const RANKING_LIMIT = 10;

const LABEL = "選んだ期間の集計";

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

/** 期間に従って取り直す区画。 */
async function SummarySection({ request }: { request: PeriodRequest }) {
  if (request.status !== "ready") {
    return (
      <p className="text-sm text-destructive" role="alert">
        {PENDING_MESSAGE[request.status]}
      </p>
    );
  }

  const summary = await getDashboardSummary(request.query);

  return (
    <>
      <StatCards cards={toSummaryCards(summary)} label={LABEL} />
      <StatusBreakdown counts={summary.purchaseStatusCounts} />
    </>
  );
}

/**
 * 期間に従わない区画。
 *
 * @remarks
 * ランキングの取得口が受け付ける期間は、この画面の選択肢と対応しません。期間を変えても内容が
 * 変わらないため、取り直す区画とは別の待機に置いています。
 */
async function RankingSection() {
  const ranking = await getProductRanking({
    period: RANKING_PERIOD.LAST_30_DAYS,
    limit: RANKING_LIMIT,
  });

  return <RankingTable rows={toRankingRows(ranking)} />;
}

/**
 * 集計の画面の中身。URL の解釈と、取り直す範囲の区切りを行う。
 *
 * @remarks
 * **この関数は取得を待ちません。** 待つと、選択肢まで含めた画面全体が待機表示に置き換わります。
 * 取得は 2 つの区画がそれぞれ持ち、`Suspense` の外側には選択肢と期間の表示だけが残ります
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)「境界の粒度」）。
 *
 * 集計の待機に鍵を与えるのは、期間が変われば数値が総入れ替えになるためです。鍵を与えないと、
 * 次の集計が届くまで前の期間の数が残ります。**鍵は値を一意に表す形で作ります。** 区切り文字で
 * 連結すると、値に区切り文字が現れた時点で別の期間が同じ鍵になります。
 *
 * URL の条件は `parseDashboardQuery`（取得の口）へ通し、独自の変換を持ちません。契約に照らして
 * 読めない期間は集計の代わりに {@link AnalyticsInvalidQuery} が引き受けます。
 *
 * **いまの時刻をここで読みます。** どの暦日を見ているかの表示に要りますが、描画のたびに実時計を
 * 読む部品にすると、基準画像が撮った時刻に依存します。
 */
export function AdminAnalyticsPageContent({ searchParams }: { searchParams: RawSearchParams }) {
  const parsed = parseDashboardQuery(toRawQuery(searchParams));

  if (!parsed.ok) {
    return (
      <AnalyticsInvalidQuery
        invalidKeys={parsed.invalidKeys}
        message={getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message}
      />
    );
  }

  const query: DashboardSummaryQuery = parsed.query;
  const request = toPeriodRequest(query);

  return (
    <AnalyticsView
      query={query}
      ranking={
        <Suspense fallback={null}>
          <RankingSection />
        </Suspense>
      }
      summary={
        <Suspense fallback={<AdminDashboardSkeleton />} key={JSON.stringify(request)}>
          <SummarySection request={request} />
        </Suspense>
      }
      window={toPeriodWindow(query, new Date())}
    />
  );
}
