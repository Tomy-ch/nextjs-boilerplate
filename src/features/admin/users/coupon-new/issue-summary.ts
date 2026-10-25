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

export type IssueConfirmation = {
  readonly fields: readonly (readonly [name: string, value: string])[];
  readonly summary: readonly IssueSummaryRow[];
};

function fieldsOf(submission: IssueSubmission): IssueConfirmation["fields"] {
  const { discount, own, scope } = submission;
  return [
    [ISSUE_FORM_NAMES.expiresAt, own.expiresAt],
    [ISSUE_FORM_NAMES.usableFrom, own.usableFrom],
    [ISSUE_FORM_NAMES.minPurchaseAmount, own.minPurchaseAmount],
    ...couponFieldsOf(discount, scope),
  ];
}

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
