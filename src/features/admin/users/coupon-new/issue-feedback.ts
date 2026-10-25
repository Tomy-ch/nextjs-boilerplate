import type { IssueCouponField, IssueCouponState } from "./form-state";

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

/**
 * 確認の中に出す失敗の文言を返す。
 *
 * @param state - 発行の結果
 * @returns 確認を閉じない失敗の全体の文言。無ければ空
 */
export function failuresOf(state: IssueCouponState): readonly string[] {
  if (state.status !== "error" || closesConfirmation(state) || state.formError === null) {
    return [];
  }

  return [state.formError];
}

/**
 * 欄ごとに出す文言を、返った拒否と手元の判定から揃える。
 *
 * @remarks
 * 同じ欄では手元の判定を優先します。打ち直したあとの値に対する判定だからです。
 *
 * @param checked - 手元の判定が出した欄ごとの文言
 * @param state - 表示してよい発行の結果。古くなった結果は null で渡す
 * @returns 欄ごとの最初の文言
 */
export function fieldMessagesOf(
  checked: Readonly<Partial<Record<IssueCouponField, string>>>,
  state: IssueCouponState | null,
): Partial<Record<IssueCouponField, string>> {
  const returned = state?.status === "error" ? (state.fieldErrors ?? {}) : {};
  const firstReturned: Partial<Record<IssueCouponField, string>> = Object.fromEntries(
    Object.entries(returned).flatMap(([field, list]) =>
      list?.[0] === undefined ? [] : [[field, list[0]]],
    ),
  );

  return { ...firstReturned, ...checked };
}
