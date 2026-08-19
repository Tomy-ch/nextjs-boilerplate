import { Suspense } from "react";

import { parseDashboardQuery, type RawDashboardQuery } from "@/adapters/server/api/dashboard";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

import { ADMIN_ANALYTICS_PATH } from "../paths";
import { AdminInvalidQuery } from "../ui/invalid-query/invalid-query";
import { AnalyticsView } from "./analytics-view";
import { PERIOD_KEY_LABEL, toPeriodRequest } from "./period";
import { toPeriodWindow } from "./period-window";
import { AnalyticsRankingSection } from "./ranking-section";
import { AnalyticsSummarySection } from "./summary-section";
import { AdminDashboardSkeleton } from "./ui/skeleton/skeleton";

/** page が受け取る素の `searchParams`。 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** 値の無いキーを落とし、契約に照らせる形へ揃える。 */
function toRawQuery(params: RawSearchParams): RawDashboardQuery {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]])),
  );
}

/**
 * 集計の画面の中身。URL の解釈と、取り直す範囲の区切りを行う。
 *
 * @remarks
 * **この関数は取得を待ちません。** 待つと、選択肢まで含めた画面全体が待機表示に置き換わります。
 * 取得は 2 つの区画がそれぞれ持ち（`summary-section.tsx` / `ranking-section.tsx`）、`Suspense` の
 * 外側には選択肢と期間の表示だけが残ります
 * （[0040](../../../../docs/adr/0040-routing-rendering-strategy.md)「境界の粒度」）。
 *
 * 集計の待機に鍵を与えるのは、期間が変われば数値が総入れ替えになるためです。鍵を与えないと、
 * 次の集計が届くまで前の期間の数が残ります。**鍵は値を一意に表す形で作ります。** 区切り文字で
 * 連結すると、値に区切り文字が現れた時点で別の期間が同じ鍵になります。
 *
 * URL の条件は `parseDashboardQuery`（取得の口）へ通し、独自の変換を持ちません。契約に照らして
 * 読めない期間は集計の代わりに {@link AdminInvalidQuery} が引き受けます。
 *
 * **いまの時刻をここで読みます。** どの暦日を見ているかの表示に要りますが、描画のたびに実時計を
 * 読む部品にすると、基準画像が撮った時刻に依存します。
 */
export function AdminAnalyticsPageContent({ searchParams }: { searchParams: RawSearchParams }) {
  const parsed = parseDashboardQuery(toRawQuery(searchParams));

  if (!parsed.ok) {
    return (
      <AdminInvalidQuery
        invalidKeys={parsed.invalidKeys}
        keyLabels={PERIOD_KEY_LABEL}
        message={getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message}
        resetHref={ADMIN_ANALYTICS_PATH}
        resetLabel="期間を外して見る"
        title="この期間では集計を表示できません"
      />
    );
  }

  const request = toPeriodRequest(parsed.query);

  return (
    <AnalyticsView
      query={parsed.query}
      ranking={
        <Suspense fallback={null}>
          <AnalyticsRankingSection />
        </Suspense>
      }
      summary={
        <Suspense fallback={<AdminDashboardSkeleton />} key={JSON.stringify(request)}>
          <AnalyticsSummarySection request={request} />
        </Suspense>
      }
      window={toPeriodWindow(parsed.query, new Date())}
    />
  );
}
