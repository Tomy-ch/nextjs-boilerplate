import { DASHBOARD_PERIOD, type DashboardSummaryQuery } from "@/model/dashboard/dashboard";

/**
 * 集計の暦日を決めているタイムゾーン。
 *
 * @remarks
 * **契約が宣言している値を写しています。** 期間の境界を決めているのはバックエンドで、`today` /
 * `month` がどの暦日を指すかは応答に入っていません。どの日を見ているのかを画面に出すには、
 * 同じ規則をこちら側でも辿るしかありません。
 *
 * 写しである以上、バックエンドの設定が変われば黙ってずれます。集計そのものはバックエンドの
 * 値をそのまま出しており、ここでずれるのは**添える文言だけ**ですが、恒久の解は契約が解決済みの
 * 期間を返すことです。
 */
const AGGREGATION_TIME_ZONE = "Asia/Tokyo";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: AGGREGATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** その時刻を、集計のタイムゾーンでの暦日（`YYYY-MM-DD`）にする。 */
function toCalendarDate(instant: Date): string {
  // en-CA は ISO と同じ並びを返す。桁を自前で組むと、月と日の 0 埋めを書き写すことになる。
  return dateFormatter.format(instant);
}

/** その月の最終日。月をまたぐ加算は `Date` に数えさせる。 */
function endOfMonth(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/** 集計が対象にしている暦日の範囲。両端を含む。 */
export type PeriodWindow = {
  readonly from: string;
  /** 終了日。開始日と同じなら 1 日だけを指す。 */
  readonly to: string;
};

/**
 * 選ばれた期間が、どの暦日を対象にしているかを解く。
 *
 * @remarks
 * **集計ではありません。** 出す数はバックエンドが合成したものだけで、ここが決めるのは「その数が
 * どの日付の話か」という添え書きです（[0070](../../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * `range` は利用者が指定した暦日をそのまま返します。指定が揃っていないときは、対象が決まって
 * いないので返しません。
 *
 * @param query - URL が表す条件
 * @param now - 判定に使う時刻。呼び出し側が渡すのは、描画のたびに実時計を読むと基準画像が
 *   撮った時刻に依存するため
 */
export function toPeriodWindow(query: DashboardSummaryQuery, now: Date): PeriodWindow | undefined {
  const period = query.period ?? DASHBOARD_PERIOD.TODAY;

  if (period === DASHBOARD_PERIOD.RANGE) {
    const { from, to } = query;

    return from === undefined || to === undefined ? undefined : { from, to };
  }

  const today = toCalendarDate(now);

  if (period === DASHBOARD_PERIOD.TODAY) {
    return { from: today, to: today };
  }

  const [year, month] = today.split("-").map(Number);

  return { from: `${today.slice(0, 7)}-01`, to: endOfMonth(year, month) };
}
