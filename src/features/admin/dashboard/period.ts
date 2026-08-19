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

/** 期間の選択肢。並びがそのまま切替の並びになる。 */
export const PERIOD_CHOICES: readonly {
  readonly period: DashboardPeriod;
  readonly label: string;
}[] = [
  { period: DASHBOARD_PERIOD.TODAY, label: "今日" },
  { period: DASHBOARD_PERIOD.MONTH, label: "今月" },
  { period: DASHBOARD_PERIOD.RANGE, label: "期間を指定" },
];

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
 * 選んでいた日付を持ち越します。`今日` を挟んでから `期間を指定` へ戻ったときに、入れ直しを
 * させないためです。`range` 以外では URL にも載せません。載せたままだと、効いていない条件が
 * 画面の外（アドレス欄・共有した URL）にだけ残ります。
 */
export function toPeriodHref(period: DashboardPeriod, query: DashboardSummaryQuery): string {
  const params = new URLSearchParams({ [PERIOD_KEY.PERIOD]: period });

  if (period === DASHBOARD_PERIOD.RANGE) {
    for (const [key, value] of [
      [PERIOD_KEY.FROM, query.from],
      [PERIOD_KEY.TO, query.to],
    ] as const) {
      if (value !== undefined) {
        params.set(key, value);
      }
    }
  }

  return `${ADMIN_ANALYTICS_PATH}?${params.toString()}`;
}
