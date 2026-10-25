import type { CouponDiscountValues } from "../../coupon-discount";
import type { CouponScopeValues } from "../../coupon-scope";
import {
  couponFieldsOf,
  discountDetail,
  readableWallClock,
  scopeDetail,
} from "../../coupon-summary";
import { ISSUE_FORM_NAMES } from "./form-names";
import { type IssueOwnValues, type IssueSubmission, submissionOf } from "./issue-rules";

export type IssueSummaryRow = { readonly term: string; readonly detail: string };

/** 確認に要るもの一式。 */
export type IssueConfirmation = {
  /** 送る項目と値。確認の form が hidden で載せる。 */
  readonly fields: readonly (readonly [name: string, value: string])[];
  /** 人に見せる復唱。 */
  readonly summary: readonly IssueSummaryRow[];
};

/**
 * 送る項目と値を並べる。
 *
 * @param submission - 日時を瞬間へ確定させた一式
 * @returns 送る項目と値
 */
function fieldsOf(submission: IssueSubmission): IssueConfirmation["fields"] {
  const { discount, own, scope } = submission;
  return [
    [ISSUE_FORM_NAMES.expiresAt, own.expiresAt],
    [ISSUE_FORM_NAMES.usableFrom, own.usableFrom],
    [ISSUE_FORM_NAMES.minPurchaseAmount, own.minPurchaseAmount],
    ...couponFieldsOf(discount, scope),
  ];
}

/**
 * 確認に要るもの（送る値と、人に見せる復唱）を揃える。
 *
 * @remarks
 * 日時は打った壁時計の値のまま見せ、送る値は瞬間へ確定させます。判定を通った値だけを渡します。
 *
 * @param own - 発行の画面自身の欄として打たれている値
 * @param discount - 値引きとして打たれている値
 * @param scope - 範囲として選ばれている値
 * @param categoryName - 選ばれたカテゴリの名前
 * @returns 確認に要るもの一式
 */
export function confirmationOf(
  own: IssueOwnValues,
  discount: CouponDiscountValues,
  scope: CouponScopeValues,
  categoryName: string,
): IssueConfirmation {
  return {
    fields: fieldsOf(submissionOf(own, discount, scope)),
    summary: [
      { term: "値引き", detail: discountDetail(discount) },
      { term: "値引きの対象", detail: scopeDetail(scope, categoryName) },
      { term: "有効期限", detail: readableWallClock(own.expiresAt) },
      {
        term: "利用開始",
        detail: own.usableFrom === "" ? "発行した時点から" : readableWallClock(own.usableFrom),
      },
      {
        term: "最低購入額",
        detail: own.minPurchaseAmount === "" ? "なし" : `${own.minPurchaseAmount} ドル以上`,
      },
    ],
  };
}
