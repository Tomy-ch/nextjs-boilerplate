"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDevelopmentAccessAllowed } from "@/adapters/server/auth/development-access";
import { discardTestSession, issueTestSession } from "@/adapters/server/auth/test-session";
import type {
  DevSessionFormState,
  DiscardSessionFormState,
} from "@/features/dev-session/form-state";
import { parseDevSessionForm } from "@/features/dev-session/parse-session-form";
import { DEV_SESSION_PATH, RETURN_URL_PARAM } from "@/features/dev-session/paths";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { toSafeReturnUrl } from "@/model/return-url";

const CLOSED_MESSAGE = "この口は、開発と CI の手元の宛先でだけ開きます。";
const INVALID_INPUT_MESSAGE = "指定を確認してください。";

/**
 * IdP を通さずに session を発行する。
 *
 * @remarks
 * **開ける環境の判定をここでも行います。** 画面の側でも同じ判定をしていますが、Server Action は
 * 画面とは別の入口であり、画面を経由せずに呼べます。入口ごとに閉じていなければ、閉じたことに
 * なりません。
 *
 * app 層に置くのは、session の封緘が `adapters/server/auth` の領分で、そこへ触れてよいのが
 * app 層だからです（`architecture.ts` の `adapters-auth`）。画面の側は送信先を受け取るだけです。
 *
 * 戻り先は同じ生成元の中だけに絞ります。受け取った値をそのまま使うと、発行した直後に外部の
 * サイトへ送る導線になります。
 */
export async function issueDevSessionAction(
  _previous: DevSessionFormState,
  formData: FormData,
): Promise<DevSessionFormState> {
  if (!(await isDevelopmentAccessAllowed())) {
    return failedActionState({ formError: CLOSED_MESSAGE });
  }

  const parsed = parseDevSessionForm(formData);

  if (!parsed.ok) {
    return failedActionState({
      formError: INVALID_INPUT_MESSAGE,
      fieldErrors: parsed.fieldErrors,
    });
  }

  try {
    await issueTestSession(parsed.input);
  } catch (error) {
    return actionStateFromError(error);
  }

  redirect(toSafeReturnUrl(formData.get(RETURN_URL_PARAM)?.toString()));
}

/**
 * 発行した session を捨てる。
 *
 * @remarks
 * 画面に留まります。捨てた結果は同じ画面が出し直す「いまの session」に現れるため、別の場所へ
 * 送る理由がありません。
 */
export async function discardDevSessionAction(
  _previous: DiscardSessionFormState,
  _formData: FormData,
): Promise<DiscardSessionFormState> {
  if (!(await isDevelopmentAccessAllowed())) {
    return failedActionState({ formError: CLOSED_MESSAGE });
  }

  try {
    await discardTestSession();
  } catch (error) {
    return actionStateFromError(error);
  }

  revalidatePath(DEV_SESSION_PATH);

  return succeededActionState(undefined);
}
