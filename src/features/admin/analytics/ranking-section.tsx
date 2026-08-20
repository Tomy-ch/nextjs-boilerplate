import { getProductRanking, RANKING_PERIOD } from "@/adapters/server/api/products";

import { toRankingRows } from "./ranking-rows";
import { RankingTable } from "./ui/ranking-table/ranking-table";

/** 売れ筋に載せる件数。表として一覧できる長さに留める。 */
const RANKING_LIMIT = 10;

/**
 * 期間の選択に従わない区画。
 *
 * @remarks
 * **別の待機に置いています。** ランキングの取得口が受け付ける期間は全期間と直近 30 日の 2 つ
 * だけで、この画面の選択肢と対応しません。期間を変えても内容が変わらないため、集計と同じ待機に
 * 入れると、変わらないものが変わるもののたびに消えて戻ります。
 */
export async function AnalyticsRankingSection() {
  const ranking = await getProductRanking({
    period: RANKING_PERIOD.LAST_30_DAYS,
    limit: RANKING_LIMIT,
  });

  return <RankingTable rows={toRankingRows(ranking)} />;
}
