import type { ActionState } from "@/model/action-state";

import type { CouponDiscountField } from "../../coupon-discount";
import type { CouponScopeField } from "../../coupon-scope";

export type IssueOwnField = "expiresAt" | "usableFrom" | "minPurchaseAmount";

export type IssueCouponField = IssueOwnField | CouponDiscountField | CouponScopeField | "userId";

export type IssueCouponState = ActionState<void, IssueCouponField>;

export type IssueCouponAction = (
  state: IssueCouponState,
  formData: FormData,
) => Promise<IssueCouponState>;

export const ISSUE_FIELD_LABELS: Readonly<Record<IssueOwnField, string>> = {
  expiresAt: "有効期限",
  usableFrom: "利用開始",
  minPurchaseAmount: "最低購入額",
};

export const ISSUE_TARGET_LOST_MESSAGE =
  "送信の内容が揃っていません。画面を開き直してから、もう一度お試しください。";

export const ISSUE_RECIPIENT_LOST_MESSAGE =
  "宛先の利用者は退会したか、見つかりませんでした。クーポンは発行されていません。";

export const ISSUE_SCOPE_CATEGORY_LOST_MESSAGE =
  "対象のカテゴリが見つかりませんでした。クーポンは発行されていません。カテゴリを選び直してください。";

export const ISSUE_SCOPE_PRODUCT_LOST_MESSAGE =
  "対象の商品が見つかりませんでした。クーポンは発行されていません。商品を選び直してください。";

export const ISSUE_TARGET_UNKNOWN_MESSAGE =
  "宛先の利用者か値引きの対象が見つからず、クーポンは発行されませんでした。画面を開き直して確かめてください。";

export const ISSUE_RESEND_CONFLICT_MESSAGE =
  "前回の発行がまだ処理中です。しばらくしてから、同じ内容でもう一度発行してください。";
