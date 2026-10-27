import type { CouponIssueDraft } from "@/model/coupon/coupon-issue-draft";

import {
  COUPON_MIN_PURCHASE_INVALID_MESSAGE,
  type CouponDiscountValues,
  readMinPurchaseAmount,
  toCouponDiscount,
} from "../../coupon-discount";
import { type CouponScopeValues, toCouponScope } from "../../coupon-scope";
import { instantOf, wallClockToInstant } from "../../wall-clock";
import type { IssueDraftField, IssueOwnField } from "./form-state";

export type IssueOwnValues = Readonly<Record<IssueOwnField, string>>;

export type IssueSubmission = {
  readonly own: IssueOwnValues;
  readonly discount: CouponDiscountValues;
  readonly scope: CouponScopeValues;
};

export const EMPTY_ISSUE_OWN_VALUES: IssueOwnValues = {
  expiresAt: "",
  usableFrom: "",
  minPurchaseAmount: "",
};

export const ISSUE_EXPIRES_AT_MISSING_MESSAGE = "有効期限を入力してください。";

export const ISSUE_USABLE_FROM_INVALID_MESSAGE =
  "利用開始は日時を最後まで入力するか、空欄に戻してください。";

export const ISSUE_USABLE_AFTER_EXPIRY_MESSAGE = "利用開始は有効期限より前にしてください。";

/**
 * 打たれた値のうち日時だけを、打った人の時間帯の瞬間へ確定させる。
 *
 * @remarks
 * ブラウザで呼びます。時間帯は打った人のものなので、受け取る側では確定できません。
 *
 * @param own - 発行の画面自身の欄として打たれている値
 * @param discount - 値引きとして打たれている値
 * @param scope - 範囲として選ばれている値
 * @returns 送る一式
 */
export function submissionOf(
  own: IssueOwnValues,
  discount: CouponDiscountValues,
  scope: CouponScopeValues,
): IssueSubmission {
  return {
    own: {
      ...own,
      expiresAt: wallClockToInstant(own.expiresAt),
      usableFrom: wallClockToInstant(own.usableFrom),
    },
    discount,
    scope,
  };
}

export type CouponIssueDraftReading =
  | { readonly ok: true; readonly draft: CouponIssueDraft }
  | {
      readonly ok: false;
      readonly errors: Readonly<Partial<Record<IssueDraftField, string>>>;
    };

type IssueOwnReading =
  | {
      readonly ok: true;
      readonly own: Pick<CouponIssueDraft, "expiresAt" | "usableFrom" | "minPurchaseAmount">;
    }
  | { readonly ok: false; readonly errors: Partial<Record<IssueOwnField, string>> };

/**
 * 有効期限・利用開始・最低購入額を読み、その順序を判定する。
 *
 * @param own - 瞬間へ確定済みの、この画面自身の値
 * @returns 読めた値か、欄ごとの文言
 */
function ownOf(own: IssueOwnValues): IssueOwnReading {
  const errors: Partial<Record<IssueOwnField, string>> = {};
  const expiresAt = instantOf(own.expiresAt);
  const usableFrom = instantOf(own.usableFrom);
  const minPurchaseAmount = readMinPurchaseAmount(own.minPurchaseAmount);

  if (expiresAt === null) errors.expiresAt = ISSUE_EXPIRES_AT_MISSING_MESSAGE;

  if (own.usableFrom !== "" && usableFrom === null) {
    errors.usableFrom = ISSUE_USABLE_FROM_INVALID_MESSAGE;
  } else if (usableFrom !== null && expiresAt !== null && usableFrom >= expiresAt) {
    errors.usableFrom = ISSUE_USABLE_AFTER_EXPIRY_MESSAGE;
  }

  if (!minPurchaseAmount.ok) errors.minPurchaseAmount = COUPON_MIN_PURCHASE_INVALID_MESSAGE;

  if (expiresAt === null || !minPurchaseAmount.ok || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    own: { expiresAt, usableFrom, minPurchaseAmount: minPurchaseAmount.amount },
  };
}

/**
 * 送る一式を、発行する内容として読む。
 *
 * @remarks
 * 送る前の判定と受け取った後の判定は、どちらもここを通ります。値引きと範囲は共有の読み方に
 * 委ね、この画面が足すのは期限と最低購入額だけです。
 *
 * @param submission - 日時を瞬間へ確定させた一式
 * @returns 発行する内容か、欄ごとの文言
 */
export function toCouponIssueDraft(submission: IssueSubmission): CouponIssueDraftReading {
  const discount = toCouponDiscount(submission.discount);
  const scope = toCouponScope(submission.scope);
  const own = ownOf(submission.own);

  if (!discount.ok || !scope.ok || !own.ok) {
    return {
      ok: false,
      errors: {
        ...(discount.ok ? {} : discount.errors),
        ...(scope.ok ? {} : scope.errors),
        ...(own.ok ? {} : own.errors),
      },
    };
  }

  return {
    ok: true,
    draft: { discount: discount.discount, scope: scope.scope, ...own.own },
  };
}
