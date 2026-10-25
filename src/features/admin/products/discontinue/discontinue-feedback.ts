import { ErrorKind } from "@/errors/error-kind";

import { COUPON_DISCOUNT_RATE_INVALID_MESSAGE, toCouponDiscountRate } from "../../coupon-discount";
import { COUPON_VALIDITY_DAYS_INVALID_MESSAGE, toCouponValidityDays } from "./coupon-rules";
import type { DiscontinueProductField, DiscontinueProductState } from "./form-state";
import type { DiscontinueConditionValues } from "./ui/conditions-fields/conditions-fields";

/**
 * 確認を開く前に、送る前の判定を当てる。
 *
 * @param values - 打たれている条件
 * @returns 読めなかった項目ごとの文言。すべて読めれば空
 */
export function checkConditions(
  values: DiscontinueConditionValues,
): Partial<Record<DiscontinueProductField, string>> {
  return {
    ...(toCouponDiscountRate(values.couponDiscountRate) === null
      ? { couponDiscountRate: COUPON_DISCOUNT_RATE_INVALID_MESSAGE }
      : {}),
    ...(toCouponValidityDays(values.couponValidityDays) === null
      ? { couponValidityDays: COUPON_VALIDITY_DAYS_INVALID_MESSAGE }
      : {}),
  };
}

/**
 * 結果が返ったときに確認を閉じるか。
 *
 * @remarks
 * 成立したときと、進行中の購入が残っていて拒まれたときに閉じます。どちらも取り直した画面から
 * 実行の入口が消えるため、開いたままにすると消えた操作の上に文言が浮きます。それ以外の失敗は
 * 確認の中に出し、押した場所から目を離させません。
 *
 * @param state - 返った結果
 * @returns 閉じるなら true
 */
export function closesConfirmation(state: DiscontinueProductState): boolean {
  return (
    state.status === "success" || (state.status === "error" && state.kind === ErrorKind.CONFLICT)
  );
}

/**
 * 確認の中に出す失敗の文言。
 *
 * @param state - 返った結果
 * @returns 全体の文言と項目ごとの文言を並べたもの。失敗でなければ空
 */
export function failuresOf(state: DiscontinueProductState): readonly string[] {
  if (state.status !== "error") {
    return [];
  }

  return [
    ...(state.formError === null ? [] : [state.formError]),
    ...Object.values(state.fieldErrors ?? {}).flatMap((messages) => messages ?? []),
  ];
}

/**
 * 条件の欄に出す誤りの文言。
 *
 * @param checked - 確認を開く前の判定が出した文言
 * @param state - 直前の送信の結果。下げられていれば null
 * @returns 項目ごとの文言
 */
export function fieldMessagesOf(
  checked: Partial<Record<DiscontinueProductField, string>>,
  state: DiscontinueProductState | null,
): Partial<Record<DiscontinueProductField, string>> {
  const returned = state?.status === "error" ? (state.fieldErrors ?? {}) : {};
  const messages: Partial<Record<DiscontinueProductField, string>> = {};

  for (const field of ["couponDiscountRate", "couponValidityDays"] as const) {
    const message = checked[field] ?? returned[field]?.[0];

    if (message !== undefined) {
      messages[field] = message;
    }
  }

  return messages;
}
