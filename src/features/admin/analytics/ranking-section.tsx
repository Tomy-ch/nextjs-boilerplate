import { getProductRanking } from "@/adapters/server/api/products";
import { recentDaysWindow } from "@/model/time-window";

import { toRankingRows } from "./ranking-rows";
import { RankingTable } from "./ui/ranking-table/ranking-table";

/** 売れ筋に載せる件数。表として一覧できる長さに留める。 */
const RANKING_LIMIT = 10;

/** 売れ筋が対象にする日数。期間の選択に従わない、この区画だけの固定値。 */
const RANKING_DAYS = 30;

/** `AnalyticsRankingSection` の props。 */
export type AnalyticsRankingSectionProps = {
  /** 区間を解く基準の瞬時。描画のたびに実時計を読ませないため、外から渡す。 */
  now: Date;
};

/**
 * 期間の選択に従わない区画。
 *
 * @remarks
 * **別の待機に置いています。** ここが見せるのは直近 {@link RANKING_DAYS} 日の売れ筋で、この画面の
 * 期間の選択には従いません。期間を変えても内容が変わらないため、集計と同じ待機に入れると、
 * 変わらないものが変わるもののたびに消えて戻ります。
 *
 * 選択に従わせないのは、売れ筋を「いま何が動いているか」として読むためです。集計と同じ期間に
 * 揃えると、過去の月を選んだときに当時の順位が出て、いまの品揃えの判断には使えなくなります。
 */
export async function AnalyticsRankingSection({ now }: AnalyticsRankingSectionProps) {
  const ranking = await getProductRanking({
    window: recentDaysWindow(RANKING_DAYS, now),
    limit: RANKING_LIMIT,
  });

  return <RankingTable rows={toRankingRows(ranking)} />;
}
