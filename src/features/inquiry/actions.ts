"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { postMyInquiryMessage } from "@/adapters/server/api/inquiries";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { loginPath } from "@/features/auth/facade/paths";
import {
  type ActionState,
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";

import { INQUIRY_PATH } from "./facade/paths/paths";
import { INQUIRY_BODY_FIELD } from "./form-names";
import { parseInquiryMessageForm } from "./parse-message-form";

/**
 * 送信が画面へ返す結果。
 *
 * @remarks
 * 成功しても返す値はありません。送った 1 通は取り直した正本に現れ、それは同じ往復で再描画される
 * Server Component が持ちます。
 */
export type InquiryMessageActionState = ActionState<void, typeof INQUIRY_BODY_FIELD>;

/** 送信された内容を解けなかったときの文言。 */
const MALFORMED_MESSAGE = "送信を受け付けられませんでした。画面を読み込み直してください。";

/**
 * 契約が本文を弾いたときの文言。
 *
 * @remarks
 * 契約は弾いた理由を返さないため、判っていること（本文が通らなかったこと）だけを書きます。
 */
const REJECTED_BODY_MESSAGE = "本文は受け付けられませんでした。入力し直してください。";

/**
 * 自分の問い合わせへ 1 通送る。
 *
 * @remarks
 * **最初の 1 通が問い合わせを作ります。** 送る前に問い合わせを用意する操作はありません。
 *
 * 送信の後に画面を取り直すのは、送った 1 通を正本へ入れるためだけではありません。取り直した
 * 応答が新しい購読の開始位置を返すので、送信と購読の位置が同じ往復で揃います。
 *
 * **認証が切れていたら、この画面へ戻る入り直しへ送ります。** 送信欄の隣に出しても、利用者が
 * そこで取れる手が無いためです。画面を離れるので購読もそこで閉じます。
 *
 * **契約が本文を弾いたら、本文の項目の文言として返します。** 送る前の検証が弾いたときと同じ形で、
 * 送信欄はどちらで弾かれたかを知らずに入力欄へ紐づけて出せます。
 *
 * @param _previous - 直前の呼び出しの結果。ここでは参照しない。
 * @param formData - 送信欄から届いたフォームの内容。
 * @returns 送信結果。成功時は値を持たず、失敗時は項目ごとの理由を持つ。認証が切れていた場合は
 * redirect するため戻らない。
 */
export async function sendInquiryMessageAction(
  _previous: InquiryMessageActionState,
  formData: FormData,
): Promise<InquiryMessageActionState> {
  const parsed = parseInquiryMessageForm(formData);

  if (!parsed.ok) {
    return parsed.bodyError === null
      ? failedActionState({ formError: MALFORMED_MESSAGE })
      : failedActionState({ fieldErrors: { [INQUIRY_BODY_FIELD]: [parsed.bodyError] } });
  }

  try {
    await postMyInquiryMessage(parsed.body, parsed.idempotencyKey);
  } catch (error) {
    const kind = findAppError(error)?.kind;

    if (kind === ErrorKind.UNAUTHENTICATED) {
      redirect(loginPath(INQUIRY_PATH));
    }

    if (kind === ErrorKind.VALIDATION) {
      return failedActionState({
        fieldErrors: { [INQUIRY_BODY_FIELD]: [REJECTED_BODY_MESSAGE] },
        kind: ErrorKind.VALIDATION,
      });
    }

    return actionStateFromError(error);
  }

  revalidatePath(INQUIRY_PATH);

  return succeededActionState(undefined);
}
