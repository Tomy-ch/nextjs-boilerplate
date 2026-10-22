"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { claimCampaignCoupon } from "@/adapters/server/api/campaigns";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { loginPath } from "@/features/auth/facade/paths";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";

import { COUPONS_PATH } from "./facade/paths/paths";
import { CLAIM_CODE_FIELD } from "./form-names";
import type { ClaimCouponFormState } from "./form-state";
import { parseClaimCouponForm } from "./parse-claim-form";

/**
 * 送信された内容を解けなかったときの文言。
 *
 * @remarks
 * 冪等キーを欠いた送信と、契約が 400 で弾いた送信がここへ来ます。どちらも画面が作った値の誤りで、
 * コードを直しても通らないため、入力欄ではなく読み込み直しへ導きます。
 */
const MALFORMED_MESSAGE = "受け取りを受け付けられませんでした。画面を読み込み直してください。";

/**
 * 受け取れなかったときの文言。
 *
 * @remarks
 * **理由を区別しません。** 契約が区別せずに返すためで、区別できると有効なコードを言い当てる
 * 手がかりになります。次に取れる手はどの理由でも同じ（コードを確かめるか諦める）です。
 */
const REJECTED_CODE_MESSAGE = "このコードでは受け取れません。コードを確かめてください。";

/**
 * 契約が競合（409）を返したときの文言。
 *
 * @remarks
 * 契約が宣言するのは汎用の競合だけです。IETF の Idempotency-Key の draft
 * （`draft-ietf-httpapi-idempotency-key-header` §2.7）は、同じキーの同時要求にこの応答を充て、
 * 直さずに送り直してよいとします。そのため読み込み直しへは導かず、待ってからの送り直しを促します。
 */
const IN_PROGRESS_MESSAGE =
  "受け取りの処理が終わっていません。少し待ってから一覧を確かめ、もう一度お試しください。";

/**
 * キャンペーンコードでクーポンを 1 枚受け取る。
 *
 * @remarks
 * **成立したら一覧を取り直し、同じ画面に留まります。** 受け取った 1 枚は取り直した一覧に現れ、
 * 再読み込みでも消えません。
 *
 * **認証が切れていたら、この画面へ戻る入り直しへ送ります。** 受け取り欄の隣に出しても、利用者が
 * そこで取れる手が無いためです。
 *
 * @param _previous - 直前の呼び出しの結果。ここでは参照しない。
 * @param formData - 受け取り欄から届いたフォームの内容。
 * @returns 受け取りの結果。成功時は値を持たず、失敗時は項目ごとの理由を持つ。認証が切れていた
 * 場合は redirect するため戻らない。
 */
export async function claimCouponAction(
  _previous: ClaimCouponFormState,
  formData: FormData,
): Promise<ClaimCouponFormState> {
  const parsed = parseClaimCouponForm(formData);

  if (!parsed.ok) {
    return parsed.reason === "unreadable"
      ? failedActionState({ formError: MALFORMED_MESSAGE })
      : failedActionState({ fieldErrors: { [CLAIM_CODE_FIELD]: [parsed.codeError] } });
  }

  try {
    await claimCampaignCoupon(parsed.code, parsed.idempotencyKey);
  } catch (error) {
    const kind = findAppError(error)?.kind;

    if (kind === ErrorKind.UNAUTHENTICATED) {
      redirect(loginPath(COUPONS_PATH));
    }

    if (kind === ErrorKind.VALIDATION) {
      return failedActionState({
        fieldErrors: { [CLAIM_CODE_FIELD]: [REJECTED_CODE_MESSAGE] },
        kind: ErrorKind.VALIDATION,
      });
    }

    if (kind === ErrorKind.CONFLICT) {
      return failedActionState({ formError: IN_PROGRESS_MESSAGE, kind: ErrorKind.CONFLICT });
    }

    if (kind === ErrorKind.INVALID_ARGUMENT) {
      return failedActionState({ formError: MALFORMED_MESSAGE, kind: ErrorKind.INVALID_ARGUMENT });
    }

    return actionStateFromError(error);
  }

  refresh();

  return succeededActionState(undefined);
}
