"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { updateMyProfile, withdrawMe } from "@/adapters/server/api/users";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { profileSchema } from "@/model/user/profile-schema";

import type { ProfileFormState, WithdrawFormState } from "./form-state";
import { MYPAGE_PATH } from "./paths";

const INVALID_INPUT_MESSAGE = "入力内容を確認してください。";
const WITHDRAW_CONFLICT_MESSAGE =
  "進行中の購入が残っているため退会できません。購入が完了またはキャンセルされてから、もう一度お試しください。";

/** `FormData` の 1 項目を文字列として読む。未入力と欠落を同じ空文字へ均す。 */
function readField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * プロフィールを更新する。
 *
 * @remarks
 * 検証を client と同じスキーマで通し直します。client の検証は即時に返すためのもので、そこを
 * 通ったことは何の保証にもなりません（[0062](../../../docs/adr/0062-form-input-validation.md)）。
 *
 * 成功しても画面を移しません。フォームの文脈に留まる保存なので、通知は toast が担います
 * （[0063](../../../docs/adr/0063-mutation-result-notification.md)）。マイページ側は次に開いた
 * ときに新しい内容が出るよう、ここで再検証を要求しておきます。
 */
export async function updateProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    firstName: readField(formData, "firstName"),
    lastName: readField(formData, "lastName"),
    email: readField(formData, "email"),
    phone: readField(formData, "phone"),
    postalCode: readField(formData, "postalCode"),
    prefecture: readField(formData, "prefecture"),
    city: readField(formData, "city"),
    street: readField(formData, "street"),
    building: readField(formData, "building"),
  });

  if (!parsed.success) {
    return failedActionState({
      formError: INVALID_INPUT_MESSAGE,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  try {
    await updateMyProfile({
      ...parsed.data,
      // 建物名は任意入力。空欄は「入力しなかった」であり、空文字という値ではない。
      building: parsed.data.building === "" ? null : parsed.data.building,
    });
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
