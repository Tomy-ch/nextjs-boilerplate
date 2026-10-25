"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { postInquiryReply } from "@/adapters/server/api/inquiries";
import { isUnauthenticated } from "@/errors/app-error";
import { REPLY_BODY_FIELD } from "@/features/admin/inquiries/form-names";
import type { AdminInquiryReplyState } from "@/features/admin/inquiries/form-state";
import { REPLY_MALFORMED_MESSAGE } from "@/features/admin/inquiries/form-state";
import { parseAdminInquiryReplyForm } from "@/features/admin/inquiries/parse-reply-form";
import { ADMIN_INQUIRY_LIST_PATH } from "@/features/admin/paths";
import { loginPath } from "@/features/auth/facade/paths";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { assertAdmin } from "../assert-admin";

/**
 * 問い合わせへ回答を 1 通送る。
 *
 * @remarks
 * **回答先は送信が名指しします。** 運営は複数の問い合わせを行き来するため、「いま開いているもの」
 * をサーバ側で決められません。名指しできる以上、役割の確認をこの口の内側で済ませます —— 画面が
 * 保護されていることは、action が保護されていることを意味しません。
 *
 * 送信の後に開いている 1 件だけを取り直します。一覧は購読が知らせます。
 *
 * @param _previous - 直前の action state（本体では参照しない）。
 * @param formData - 回答フォームの送信内容。
 * @returns 送信結果を表す action state。
 */
export async function replyInquiryAction(
  _previous: AdminInquiryReplyState,
  formData: FormData,
): Promise<AdminInquiryReplyState> {
  try {
    await assertAdmin(ADMIN_INQUIRY_LIST_PATH);
  } catch (error) {
    unstable_rethrow(error);

    return actionStateFromError(error);
  }

  const parsed = parseAdminInquiryReplyForm(formData);

  if (!parsed.ok) {
    return parsed.reason === "unreadable"
      ? failedActionState({ formError: REPLY_MALFORMED_MESSAGE })
      : failedActionState({ fieldErrors: { [REPLY_BODY_FIELD]: [parsed.bodyError] } });
  }

  try {
    await postInquiryReply(parsed.inquiryId, parsed.body, parsed.idempotencyKey);
  } catch (error) {
    if (isUnauthenticated(error)) redirect(loginPath(ADMIN_INQUIRY_LIST_PATH));

    return actionStateFromError(error);
  }

  refresh();

  return succeededActionState(undefined);
}
