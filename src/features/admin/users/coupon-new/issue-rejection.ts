import { ErrorKind } from "@/errors/error-kind";
import { errorMetaFrom } from "@/errors/error-meta";
import { type FieldErrors, failedActionState } from "@/model/action-state";
import type { CouponScopeTarget } from "@/model/coupon/coupon";

import {
  ISSUE_FIELD_LABELS,
  ISSUE_RECIPIENT_LOST_MESSAGE,
  ISSUE_SCOPE_CATEGORY_LOST_MESSAGE,
  ISSUE_SCOPE_PRODUCT_LOST_MESSAGE,
  ISSUE_TARGET_UNKNOWN_MESSAGE,
  type IssueCouponState,
  type IssueOwnField,
} from "./form-state";

/** 送信が 404 になったあと、宛先の利用者を引き直した結果。 */
export type RecipientReread =
  | { readonly kind: "found"; readonly deletedAt: string | null }
  | { readonly kind: "absent" }
  | { readonly kind: "unreadable" };

/**
 * 接続先が名指しした名前が、この画面自身の欄かを返す。
 *
 * @param name - 接続先が名指しした名前
 * @returns この画面の欄なら true
 */
function isIssueOwnField(name: string): name is IssueOwnField {
  return Object.hasOwn(ISSUE_FIELD_LABELS, name);
}

/**
 * 接続先が名指しした欄を、この画面の欄の文言へ写す。
 *
 * @remarks
 * 値引きと範囲は写しません。契約が入れ子の欄の綴りを宣言していないためです。
 *
 * @param error - 送信が拒まれたときのエラー
 * @returns 欄ごとの文言。名指しが無ければ空
 */
export function toIssueFieldErrors(error: unknown): FieldErrors<IssueOwnField> {
  const fieldErrors: Partial<Record<IssueOwnField, readonly string[]>> = {};

  for (const name of errorMetaFrom(error)?.details ?? []) {
    if (isIssueOwnField(name)) {
      fieldErrors[name] = [
        `${ISSUE_FIELD_LABELS[name]}は受け付けられませんでした。入力し直してください。`,
      ];
    }
  }

  return fieldErrors;
}

/**
 * 宛先の利用者を失った結果を組む。
 *
 * @returns 宛先の欄に文言を持つ失敗
 */
function recipientLostState(): IssueCouponState {
  return failedActionState({
    formError: null,
    fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
    kind: ErrorKind.NOT_FOUND,
  });
}

/**
 * 範囲の対象を失った結果を組む。
 *
 * @param scope - 送った範囲。対象を持つ種別だけ
 * @returns 対象の欄に文言を持つ失敗
 */
function scopeTargetLostState(
  scope: Exclude<CouponScopeTarget, { readonly kind: "all" }>,
): IssueCouponState {
  return failedActionState({
    formError: null,
    fieldErrors:
      scope.kind === "category"
        ? { scopeCategoryId: [ISSUE_SCOPE_CATEGORY_LOST_MESSAGE] }
        : { scopeProductId: [ISSUE_SCOPE_PRODUCT_LOST_MESSAGE] },
    kind: ErrorKind.NOT_FOUND,
  });
}

/**
 * 送信の 404 が、宛先と範囲の対象のどちらに由来するかを言い分ける。
 *
 * @remarks
 * 契約はどちらにも同じ 404 を返すため、応答だけでは区別できません。全商品の範囲は対象を
 * 持たないので宛先と確定し、それ以外は宛先を引き直して判定します。引き直せなければ、どちら
 * とも言いません。
 *
 * @param scope - 送った範囲
 * @param reread - 宛先の利用者を引き直す。全商品の範囲では呼ばない
 * @returns 画面へ返す失敗
 */
export async function notFoundStateOf(
  scope: CouponScopeTarget,
  reread: () => Promise<RecipientReread>,
): Promise<IssueCouponState> {
  if (scope.kind === "all") {
    return recipientLostState();
  }

  const recipient = await reread();

  switch (recipient.kind) {
    case "found":
      return recipient.deletedAt === null ? scopeTargetLostState(scope) : recipientLostState();
    case "absent":
      return recipientLostState();
    case "unreadable":
      return failedActionState({
        formError: ISSUE_TARGET_UNKNOWN_MESSAGE,
        kind: ErrorKind.NOT_FOUND,
      });
  }
}
