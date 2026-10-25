import type { CouponIssueDraft } from "@/model/coupon/coupon-issue-draft";

import {
  type CouponDiscountValues,
  toCouponDiscount,
  toMinorUnitAmount,
} from "../../coupon-discount";
import { type CouponScopeValues, toCouponScope } from "../../coupon-scope";
import { wallClockToInstant } from "../../wall-clock";
import type { IssueCouponField, IssueOwnField } from "./form-state";

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

export const ISSUE_MIN_PURCHASE_INVALID_MESSAGE =
  "最低購入額は 50 や 49.99 のように、0 より大きいドルの額を小数第 2 位までで入力してください。";

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

function instantOf(text: string): Date | null {
  if (text === "") {
    return null;
  }

  const instant = new Date(text);

  return Number.isNaN(instant.getTime()) ? null : instant;
}

export type CouponIssueDraftReading =
  | { readonly ok: true; readonly draft: CouponIssueDraft }
  | {
      readonly ok: false;
      readonly errors: Readonly<Partial<Record<IssueCouponField, string>>>;
    };

type IssueOwnReading =
  | {
      readonly ok: true;
      readonly own: Pick<CouponIssueDraft, "expiresAt" | "usableFrom" | "minPurchaseAmount">;
    }
  | { readonly ok: false; readonly errors: Partial<Record<IssueOwnField, string>> };

function ownOf(own: IssueOwnValues): IssueOwnReading {
  const errors: Partial<Record<IssueOwnField, string>> = {};
  const expiresAt = instantOf(own.expiresAt);
  const usableFrom = instantOf(own.usableFrom);
  const minPurchaseAmount =
    own.minPurchaseAmount === "" ? null : toMinorUnitAmount(own.minPurchaseAmount);

  if (expiresAt === null) errors.expiresAt = ISSUE_EXPIRES_AT_MISSING_MESSAGE;

  if (own.usableFrom !== "" && usableFrom === null) {
    errors.usableFrom = ISSUE_USABLE_FROM_INVALID_MESSAGE;
  } else if (usableFrom !== null && expiresAt !== null && usableFrom >= expiresAt) {
    errors.usableFrom = ISSUE_USABLE_AFTER_EXPIRY_MESSAGE;
  }

  if (own.minPurchaseAmount !== "" && minPurchaseAmount === null) {
    errors.minPurchaseAmount = ISSUE_MIN_PURCHASE_INVALID_MESSAGE;
  }

  if (expiresAt === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, own: { expiresAt, usableFrom, minPurchaseAmount } };
}

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
