import { z } from "zod";

import {
  DASHBOARD_PERIOD,
  type DashboardPeriod,
  type DashboardPeriodSelection,
} from "@/model/dashboard/dashboard";
import { type RawSearchParams, singleValue } from "@/model/search-params";
import {
  calendarMonth,
  dateRangeWindow,
  monthWindow,
  type TimeWindow,
  todayWindow,
} from "@/model/time-window";

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
 * キーを画面上の呼び名へ直す表。
 *
 * @remarks
 * キーを持っているのはこの層なので、呼び名も同じ場所に置きます。表示する側が写しを持つと、
 * 契約にキーが増えたときに生の名前が出る画面と出ない画面に割れます。
 */
export const PERIOD_KEY_LABEL: Readonly<Record<string, string>> = {
  [PERIOD_KEY.PERIOD]: "期間の区分",
  [PERIOD_KEY.FROM]: "開始日",
  [PERIOD_KEY.TO]: "終了日",
};

/**
 * URL の期間を読むスキーマ。
 *
 * @remarks
 * **読めない値はキーごと返します。** 何が読めなかったかを画面が名指しできないと、URL を直す手が
 * かりが「どこかが違う」しか残りません。
 *
 * 区分は画面が持つ語彙で、契約はもう受け取りません。日付は暦の上に実在する日だけを通します
 * （`2026-06-31` は書式では通ってしまい、繰り上がって別の日になります）。
 */
const selectionSchema = z.object({
  [PERIOD_KEY.PERIOD]: singleValue(
    z.enum([DASHBOARD_PERIOD.TODAY, DASHBOARD_PERIOD.MONTH, DASHBOARD_PERIOD.RANGE]),
  ).optional(),
  [PERIOD_KEY.FROM]: singleValue(z.iso.date()).optional(),
  [PERIOD_KEY.TO]: singleValue(z.iso.date()).optional(),
});

/** URL の期間を読んだ結果。 */
export type PeriodSelectionParseResult =
  | { readonly ok: true; readonly selection: DashboardPeriodSelection }
  /** 読めなかったキー。表示に使えるよう、検証ライブラリの型ではなく素の名前で返す。 */
  | { readonly ok: false; readonly invalidKeys: readonly string[] };

/**
 * URL の期間を、選択の形へ読む。
 *
 * @remarks
 * **`range` のときに日付が揃っているかは見ません。** 日付をこれから選ぶ状態も同じ URL の形を
 * しているためで、揃っているかどうかは {@link toPeriodRequest} が見ます。
 */
export function parsePeriodSelection(params: RawSearchParams): PeriodSelectionParseResult {
  const parsed = selectionSchema.safeParse(params);

  if (!parsed.success) {
    return {
      ok: false,
      invalidKeys: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
    };
  }

  return { ok: true, selection: parsed.data };
}

/**
 * 期間の指定が、集計を求められる形になっているか。
 *
 * @remarks
 * 契約は前後の入れ替わった区間を 400 で返し、日付の欠けた `range` はそもそも区間へ解けませんが、
 * どちらも **これから日付を選ぶ状態**と同じ URL の形をしています。往復させてから拒まれる形に
 * しないため、送る前にこの層で見ます（[0062](../../../../docs/adr/0062-form-input-validation.md)）。
 */
export type PeriodRequest =
  /** 集計を求められる。区間は解決済みで、そのまま契約へ渡せる。 */
  | { readonly status: "ready"; readonly window: TimeWindow }
  /** `range` だが日付が揃っていない。 */
  | { readonly status: "incomplete" }
  /** 終了日が開始日より前にある。 */
  | { readonly status: "reversed" };

/**
 * 選ばれた期間を、集計を求められるかどうかへ写す。
 *
 * @remarks
 * 日付の前後は文字列のまま比べます。暦日の `YYYY-MM-DD` は桁が固定なので、辞書順がそのまま暦の
 * 順になります。`Date` へ直すと、ブラウザの時差で暦日がずれた値どうしを比べることになります。
 *
 * **区分をここで区間へ解きます。** 契約が受け取るのは瞬時の半開区間だけで、「今日」「今月」を
 * 暦の上で解く役は持ちません（[0120](../../../../docs/adr/0120-locale-aware-formatting.md)）。
 *
 * @param selection - URL が表している期間の選択
 * @param now - 相対の期間を解く基準の瞬時
 */
export function toPeriodRequest(selection: DashboardPeriodSelection, now: Date): PeriodRequest {
  const period = selection.period ?? DASHBOARD_PERIOD.TODAY;

  if (period === DASHBOARD_PERIOD.TODAY) {
    return { status: "ready", window: todayWindow(now) };
  }

  if (period === DASHBOARD_PERIOD.MONTH) {
    return { status: "ready", window: monthWindow(calendarMonth(now)) };
  }

  const { from, to } = selection;

  if (from === undefined || to === undefined) {
    return { status: "incomplete" };
  }

  return from > to
    ? { status: "reversed" }
    : { status: "ready", window: dateRangeWindow(from, to) };
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
