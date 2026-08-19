import {
  DASHBOARD_PERIOD,
  type DashboardPeriod,
  type DashboardSummaryQuery,
} from "@/model/dashboard/dashboard";

import { ADMIN_ANALYTICS_PATH } from "../paths";

/**
 * 期間を載せる URL のキー。契約のクエリ名と揃える。
 *
 * @remarks
 * 読み替えると、URL に書いてある名前と backend へ送る名前が別々に動きます。
 */
export const PERIOD_KEY: Readonly<{ PERIOD: "period"; FROM: "from"; TO: "to" }> = {
  PERIOD: "period",
  FROM: "from",
  TO: "to",
};

/**
 * 期間の指定が、集計を求められる形になっているか。
 *
 * @remarks
 * 契約は日付の欠けた `range` も前後の入れ替わった `range` も 400 で返しますが、どちらも
 * **これから日付を選ぶ状態**と同じ URL の形をしています。往復させてから拒まれる形にしないため、
 * 送る前にこの層で見ます（[0062](../../../../docs/adr/0062-form-input-validation.md)）。
 */
export type PeriodRequest =
  /** 集計を求められる。 */
  | { readonly status: "ready"; readonly query: DashboardSummaryQuery }
  /** `range` だが日付が揃っていない。 */
  | { readonly status: "incomplete" }
  /** 終了日が開始日より前にある。 */
  | { readonly status: "reversed" };

/**
 * 契約に照らした条件を、集計を求められるかどうかへ写す。
 *
 * @remarks
 * 日付の前後は文字列のまま比べます。契約が受け取る `YYYY-MM-DD` は桁が固定なので、辞書順が
 * そのまま暦の順になります。`Date` へ直すと、ブラウザの時差で暦日がずれた値どうしを比べることに
 * なります。
 *
 * `range` 以外では日付を落とします。契約は無視すると宣言していますが、送らなければ「無視される
 * はずの値が効いていた」という疑いがそもそも立ちません。
 */
export function toPeriodRequest(query: DashboardSummaryQuery): PeriodRequest {
  const period = query.period ?? DASHBOARD_PERIOD.TODAY;

  if (period !== DASHBOARD_PERIOD.RANGE) {
    return { status: "ready", query: { period } };
  }

  const { from, to } = query;

  if (from === undefined || to === undefined) {
    return { status: "incomplete" };
  }

  return from > to ? { status: "reversed" } : { status: "ready", query: { period, from, to } };
}

/**
 * 期間を切り替えた先の URL を組む。
 *
 * @remarks
 * 日付を持ち越しません。日付が要る期間は overlay の中で両端を決めてから遷移するため、選択肢を
 * 押しただけの時点では行き先に載せるものがありません。載せたままにすると、効いていない条件が
 * 画面の外（アドレス欄・共有した URL）にだけ残ります。
 */
export function toPeriodHref(period: DashboardPeriod): string {
  return `${ADMIN_ANALYTICS_PATH}?${new URLSearchParams({ [PERIOD_KEY.PERIOD]: period })}`;
}
