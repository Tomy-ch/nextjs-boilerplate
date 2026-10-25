import type { IssueCouponState } from "./form-state";

/**
 * 送信の結果、宛先の利用者を失ったかを返す。
 *
 * @param state - 発行の結果
 * @returns 宛先を失っていれば true。フォームを退会済みの面へ差し替える合図
 */
export function recipientLostIn(state: IssueCouponState): boolean {
  return state.status === "error" && state.fieldErrors?.userId !== undefined;
}

/**
 * この結果で確認を閉じるかを返す。
 *
 * @remarks
 * 欄を名指しする拒否は、直す欄が確認の外にあるため閉じます。
 *
 * @param state - 発行の結果
 * @returns 成功か、欄を名指しする拒否なら true
 */
export function closesConfirmation(state: IssueCouponState): boolean {
  return (
    state.status === "success" ||
    (state.status === "error" && Object.keys(state.fieldErrors ?? {}).length > 0)
  );
}
