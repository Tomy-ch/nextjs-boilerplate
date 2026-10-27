import { ErrorKind } from "@/errors/error-kind";
import { failedActionState } from "@/model/action-state";

import { CAMPAIGN_RESEND_CONFLICT_MESSAGE, type CreateCampaignState } from "./form-state";

/**
 * 結果が分からないまま送り直した送信の結果を、画面が見せる形へ読み替える。
 *
 * @remarks
 * 409 だけを読み替えます。送り直しへの 409 は、前回の送信がまだ処理中である場合と区別が
 * つかないため、コードの欄ではなく確認の中に、どちらとも読める文言で出します。
 *
 * @param state - 送り直した送信の結果
 * @returns 409 なら全体の文言だけを持つ失敗。それ以外はそのまま
 */
export function resendResultOf(state: CreateCampaignState): CreateCampaignState {
  if (state.status !== "error" || state.kind !== ErrorKind.CONFLICT) {
    return state;
  }

  return failedActionState({
    formError: CAMPAIGN_RESEND_CONFLICT_MESSAGE,
    kind: ErrorKind.CONFLICT,
  });
}

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
