import { PURCHASE_MAX_RECENT_DAYS, PURCHASE_MONTH_PATTERN } from "@/adapters/client/api/purchases";

import type { PeriodSelection } from "./period";

/** 区分を選び直した直後に入っている日数。 */
export const DEFAULT_RECENT_DAYS = 30;

/**
 * 組み立て中の期間の条件。
 *
 * @remarks
 * **効いている条件（{@link PeriodSelection}）とは別の形です。** 利用者は開始日だけを入れた状態を
 * 経由しますが、その途中の姿は契約が受け取れる条件ではありません。同じ型で表すと、区分ごとの
 * 必須が欠けた条件を作れることになり、判別可能 union で塞いだ意味が無くなります
 * （[0029](../../../../docs/adr/0029-type-design-discipline.md)）。
 *
 * 区分を跨いで値を保持します。暦月へ切り替えてから期間へ戻したときに、入れ直しにならないためです。
 */
export type PeriodDraft = {
  readonly kind: PeriodSelection["kind"];
  readonly month: string;
  readonly from: string;
  readonly to: string;
  readonly days: number;
};

/** 効いている条件を、入力欄の初期値へ直す。 */
export function toPeriodDraft(period: PeriodSelection): PeriodDraft {
  return {
    kind: period.kind,
    month: period.kind === "month" ? period.month : "",
    from: period.kind === "range" ? period.from : "",
    to: period.kind === "range" ? period.to : "",
    days: period.kind === "recent" ? period.days : DEFAULT_RECENT_DAYS,
  };
}

/**
 * 組み立て中の条件を、絞り込める条件へ直す。
 *
 * @remarks
 * **足りていなければ `null` を返します。** 必須が欠けたまま送ると契約は 400 を返し、一覧そのものが
 * 出せなくなります。押せるかどうかをこの値で決めることで、送れない条件を送る経路が残りません。
 *
 * 終了日が開始日より前かどうかもここで見ます。契約が 400 で返す組み合わせであり、押した後に
 * 一覧が消えるより、押せない理由をその場に出すほうが直せます。
 */
export function toAppliedPeriod(draft: PeriodDraft): PeriodSelection | null {
  if (draft.kind === "all") {
    return { kind: "all" };
  }

  if (draft.kind === "month") {
    return PURCHASE_MONTH_PATTERN.test(draft.month) ? { kind: "month", month: draft.month } : null;
  }

  if (draft.kind === "range") {
    if (draft.from === "" || draft.to === "" || draft.to < draft.from) {
      return null;
    }

    return { kind: "range", from: draft.from, to: draft.to };
  }

  if (!Number.isInteger(draft.days) || draft.days < 1 || draft.days > PURCHASE_MAX_RECENT_DAYS) {
    return null;
  }

  return { kind: "recent", days: draft.days };
}
