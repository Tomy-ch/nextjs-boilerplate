import { z } from "zod";

import type { FieldErrors } from "@/model/action-state";
import type { CouponIssueDraft } from "@/model/coupon/coupon-issue-draft";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { toUserId, type UserId } from "@/model/user/user";

import { readCouponDiscountValues } from "../../coupon-discount";
import { readCouponScopeValues } from "../../coupon-scope";
import { ISSUE_CONFIRMED_VALUE, ISSUE_FORM_NAMES } from "./form-names";
import { ISSUE_TARGET_LOST_MESSAGE, type IssueCouponField } from "./form-state";
import { type IssueOwnValues, toCouponIssueDraft } from "./issue-rules";

export type IssueFormParseResult =
  | {
      readonly ok: true;
      readonly recipient: UserId;
      readonly draft: CouponIssueDraft;
      readonly idempotencyKey: string;
    }
  | {
      readonly ok: false;
      readonly recipient: UserId | null;
      readonly formError: string | null;
      readonly fieldErrors?: FieldErrors<IssueCouponField>;
    };

function textOf(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export function parseIssueForm(formData: FormData): IssueFormParseResult {
  const recipientField = z.uuid().safeParse(formData.get(ISSUE_FORM_NAMES.userId));
  const recipient = recipientField.success ? toUserId(recipientField.data) : null;
  const idempotencyKey = z.uuid().safeParse(formData.get(IDEMPOTENCY_KEY_FIELD));
  const confirmed = textOf(formData, ISSUE_FORM_NAMES.confirmed) === ISSUE_CONFIRMED_VALUE;

  if (recipient === null || !idempotencyKey.success || !confirmed) {
    return { ok: false, recipient, formError: ISSUE_TARGET_LOST_MESSAGE };
  }

  const own: IssueOwnValues = {
    expiresAt: textOf(formData, ISSUE_FORM_NAMES.expiresAt),
    usableFrom: textOf(formData, ISSUE_FORM_NAMES.usableFrom),
    minPurchaseAmount: textOf(formData, ISSUE_FORM_NAMES.minPurchaseAmount),
  };
  const reading = toCouponIssueDraft({
    own,
    discount: readCouponDiscountValues(formData),
    scope: readCouponScopeValues(formData),
  });

  if (!reading.ok) {
    const fieldErrors: FieldErrors<IssueCouponField> = Object.fromEntries(
      Object.entries(reading.errors).map(([field, message]) => [field, [message]]),
    );

    return { ok: false, recipient, formError: null, fieldErrors };
  }

  return { ok: true, recipient, draft: reading.draft, idempotencyKey: idempotencyKey.data };
}
