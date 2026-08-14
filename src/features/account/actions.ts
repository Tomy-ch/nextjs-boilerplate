"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateMyProfile, withdrawMe } from "@/adapters/server/api/users";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";

import { parseProfileForm } from "./edit/parse-profile-form";
import type { ProfileFormState, WithdrawFormState } from "./form-state";
import { MYPAGE_PATH } from "./paths";

const INVALID_INPUT_MESSAGE = "入力内容を確認してください。";
const WITHDRAW_CONFLICT_MESSAGE =
  "進行中の購入が残っているため退会できません。購入が完了またはキャンセルされてから、もう一度お試しください。";

/**
 * プロフィールを更新する。
 *
 * @remarks
 * 入力の読み取りと検証は `parseProfileForm` が持ちます。ここが持つのは**編成**だけで、解いて、
 * 渡して、結果を分類します（[0021](../../../docs/adr/0021-frontend-responsibility.md)）。
 *
 * 成功しても画面を移しません。フォームの文脈に留まる保存なので、通知は toast が担います
 * （[0063](../../../docs/adr/0063-mutation-result-notification.md)）。マイページ側は次に開いた
 * ときに新しい内容が出るよう、ここで再検証を要求しておきます。
 */
export async function updateProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = parseProfileForm(formData);

  if (!parsed.ok) {
    return failedActionState({
      formError: INVALID_INPUT_MESSAGE,
      fieldErrors: parsed.fieldErrors,
    });
  }

  try {
    await updateMyProfile(parsed.profile);
  } catch (error) {
    return actionStateFromError(error);
  }

  revalidatePath(MYPAGE_PATH);

  return succeededActionState(undefined);
}

/**
 * 退会する。
 *
 * @remarks
 * 成立したら手元に残るものが何も無いのでトップへ送ります。session はこの時点で既に破棄されて
 * いるため、保護されたルートへは戻れません。
 *
 * `409` にだけ専用の文言を当てます。カタログの既定文言は分類だけを伝えるもので、退会が
 * 通らなかった理由が進行中の購入であることは、この画面でしか言えません。
 */
export async function withdrawAction(
  _previous: WithdrawFormState,
  _formData: FormData,
): Promise<WithdrawFormState> {
  try {
    await withdrawMe();
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.CONFLICT) {
      return failedActionState({ formError: WITHDRAW_CONFLICT_MESSAGE });
    }

    return actionStateFromError(error);
  }

  redirect("/");
}
