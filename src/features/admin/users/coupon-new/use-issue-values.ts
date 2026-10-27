"use client";

import {
  type CouponFormRead,
  type CouponFormValues,
  useCouponFormValues,
} from "../../use-coupon-form-values";
import type { IssueOwnField } from "./form-state";
import { EMPTY_ISSUE_OWN_VALUES, submissionOf, toCouponIssueDraft } from "./issue-rules";

export type IssueFormValues = CouponFormValues<IssueOwnField>;

/**
 * 打たれている値を、日時を瞬間へ確定させてから発行の判定に掛ける。
 *
 * @param own - 発行の画面自身の欄として打たれている値
 * @param discount - 値引きとして打たれている値
 * @param scope - 範囲として選ばれている値
 * @returns 発行する内容か、欄ごとの文言
 */
const readIssue: CouponFormRead<IssueOwnField> = (own, discount, scope) =>
  toCouponIssueDraft(submissionOf(own, discount, scope));

/**
 * 発行の画面で打たれている値と、欄ごとの誤りを持つ。
 *
 * @remarks
 * 判定は送る前と受け取った後で同じものを通ります。
 *
 * @returns 値と、それを変える操作
 */
export function useIssueValues(): IssueFormValues {
  return useCouponFormValues(EMPTY_ISSUE_OWN_VALUES, readIssue);
}
