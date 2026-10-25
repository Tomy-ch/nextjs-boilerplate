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

export type RecipientReread =
  | { readonly kind: "found"; readonly deletedAt: string | null }
  | { readonly kind: "absent" }
  | { readonly kind: "unreadable" };

function isIssueOwnField(name: string): name is IssueOwnField {
  return Object.hasOwn(ISSUE_FIELD_LABELS, name);
}

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

function recipientLostState(): IssueCouponState {
  return failedActionState({
    formError: null,
    fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
    kind: ErrorKind.NOT_FOUND,
  });
}

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
