import { PURCHASE_HISTORY_PATH } from "../facade/paths/paths";

/** 期間の条件を載せる URL のキー。契約のクエリ名と揃える。読む側（`read-period.ts`）と共有する。 */
export const PERIOD_KEY: Readonly<{
  PERIOD: "period";
  FROM: "from";
  TO: "to";
  MONTH: "month";
  DAYS: "days";
}> = {
  PERIOD: "period",
  FROM: "from",
  TO: "to",
  MONTH: "month",
  DAYS: "days",
};

/** 直近 N 日で選べる日数。 */
export const RECENT_DAYS_OPTIONS: readonly number[] = [7, 30, 90, 365];

/**
 * いま効いている期間の条件。
 *
 * @remarks
 * 区分ごとに必要な値が違うため、判別可能 union で表します
 * （[0029](../../../../docs/adr/0029-type-design-discipline.md)）。区分と値を別々の項目で持つと、
 * 「暦月なのに日数が入っている」姿や「期間なのに終了日が無い」姿まで型として通ります。
 *
 * 契約が受け取るのも同じ形です（`period` と、その区分だけが使う値）。区分ごとの必須が欠けた要求は
 * 400 になるため、欠けた組み合わせを表せないことがそのまま要求の正しさになります。
 */
export type PeriodSelection =
  /** 全期間。既定であり、URL には載せない。 */
  | { readonly kind: "all" }
  /** 暦月 1 つ。`YYYY-MM`。 */
  | { readonly kind: "month"; readonly month: string }
  /** 開始日と終了日。両端を含む。 */
  | { readonly kind: "range"; readonly from: string; readonly to: string }
  /** 今日から遡る日数。 */
  | { readonly kind: "recent"; readonly days: number };

/** 全期間。区分を選び直したときの初期値としても使う。 */
export const ALL_PERIOD: PeriodSelection = { kind: "all" };

/**
 * 期間の条件をクエリ文字列へ組む。
 *
 * @remarks
 * 全期間は何も載せません。既定を明示した URL と省略した URL が別物になると、同じ画面が 2 通りの
 * リンクを持ちます。
 *
 * 区分が使わない値も載せません。契約は無視すると宣言していますが、URL に残ると戻る操作や共有した
 * リンクで前の区分の値が復活します。
 */
export function toPeriodSearchParams(period: PeriodSelection): URLSearchParams {
  const params = new URLSearchParams();

  if (period.kind === "all") {
    return params;
  }

  params.set(PERIOD_KEY.PERIOD, period.kind);

  if (period.kind === "month") {
    params.set(PERIOD_KEY.MONTH, period.month);
  }

  if (period.kind === "range") {
    params.set(PERIOD_KEY.FROM, period.from);
    params.set(PERIOD_KEY.TO, period.to);
  }

  if (period.kind === "recent") {
    params.set(PERIOD_KEY.DAYS, String(period.days));
  }

  return params;
}

/** 期間の条件から購入履歴の URL を組む。 */
export function toPurchaseHistoryHref(period: PeriodSelection): string {
  const params = toPeriodSearchParams(period);

  return params.size === 0
    ? PURCHASE_HISTORY_PATH
    : `${PURCHASE_HISTORY_PATH}?${params.toString()}`;
}

/**
 * 効いている期間を、利用者の言葉で表す。
 *
 * @remarks
 * 全期間では `null` を返します。既定は条件ではないため、解除できる条件として画面に並べません。
 */
export function describePeriod(period: PeriodSelection): string | null {
  if (period.kind === "all") {
    return null;
  }

  if (period.kind === "month") {
    const [year, month] = period.month.split("-");

    return `${year} 年 ${Number(month)} 月`;
  }

  if (period.kind === "range") {
    return `${period.from} 〜 ${period.to}`;
  }

  return `直近 ${period.days} 日`;
}

/**
 * 効いている期間を、取得条件へ直す。
 *
 * @remarks
 * 区分が使わない値は載せません。契約は無視すると宣言していますが、載せる側が区分ごとの
 * 対応を持たないと、区分を変えたときに前の区分の値が残ったまま飛びます。
 *
 * @param period - いま効いている期間
 * @param first - 1 度に読み込む件数
 */
export function toPurchaseHistoryQuery(
  period: PeriodSelection,
  first: number,
): {
  readonly first: number;
  readonly period: PeriodSelection["kind"];
  readonly from?: string;
  readonly to?: string;
  readonly month?: string;
  readonly days?: number;
} {
  if (period.kind === "month") {
    return { first, period: "month", month: period.month };
  }

  if (period.kind === "range") {
    return { first, period: "range", from: period.from, to: period.to };
  }

  if (period.kind === "recent") {
    return { first, period: "recent", days: period.days };
  }

  return { first, period: "all" };
}
