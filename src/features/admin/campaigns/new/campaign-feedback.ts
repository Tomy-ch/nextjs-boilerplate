import type { CreateCampaignField, CreateCampaignState } from "./form-state";

/**
 * 結果が返ったときに確認を閉じるか。
 *
 * @remarks
 * 欄の誤りが返ったときに閉じます。直す欄は確認の外にあり、開いたままでは欄に手が届きません。
 * 全体の文言だけの失敗は確認の中に出し、押した場所から目を離させません。成立したときは一覧へ
 * 移るため、ここには来ません。
 *
 * @param state - 返った結果
 * @returns 閉じるなら true
 */
export function closesConfirmation(state: CreateCampaignState): boolean {
  return state.status === "error" && Object.keys(state.fieldErrors ?? {}).length > 0;
}

/**
 * 確認の中に出す失敗の文言。
 *
 * @param state - 返った結果
 * @returns 全体の文言。欄の誤りがある失敗では、欄の側に出るため空
 */
export function failuresOf(state: CreateCampaignState): readonly string[] {
  if (state.status !== "error" || closesConfirmation(state) || state.formError === null) {
    return [];
  }

  return [state.formError];
}

/**
 * 欄に出す誤りの文言。
 *
 * @remarks
 * 送る前の判定が出した文言を先に採ります。送り返された文言は、そのあと直された欄にも残り続ける
 * ため、手元の判定が通っている欄では、送り返された文言だけを出します。
 *
 * @param checked - 送る前の判定が出した文言。触れた欄のぶんだけ
 * @param state - 直前の送信の結果。下げられていれば null
 * @returns 欄ごとの文言
 */
export function fieldMessagesOf(
  checked: Readonly<Partial<Record<CreateCampaignField, string>>>,
  state: CreateCampaignState | null,
): Partial<Record<CreateCampaignField, string>> {
  const returned = state?.status === "error" ? (state.fieldErrors ?? {}) : {};
  const firstReturned: Partial<Record<CreateCampaignField, string>> = Object.fromEntries(
    Object.entries(returned).flatMap(([field, list]) =>
      list?.[0] === undefined ? [] : [[field, list[0]]],
    ),
  );

  return { ...firstReturned, ...checked };
}
