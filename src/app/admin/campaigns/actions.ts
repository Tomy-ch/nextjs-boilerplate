"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { suspendCampaign } from "@/adapters/server/api/campaigns";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SUSPEND_FORM_NAMES } from "@/features/admin/campaigns/list/form-names";
import {
  SUSPEND_CONFLICT_MESSAGE,
  SUSPEND_TARGET_LOST_MESSAGE,
  type SuspendCampaignState,
} from "@/features/admin/campaigns/list/form-state";
import { ADMIN_CAMPAIGN_LIST_PATH } from "@/features/admin/paths";
import { redirectIfUnauthenticated } from "@/features/auth/facade/redirect-if-unauthenticated";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { toCampaignId } from "@/model/campaign/campaign";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { assertAdmin } from "../assert-admin";

/**
 * キャンペーンの配布を停止する。
 *
 * @remarks
 * **成立したら一覧を取り直させます。** 停止は同期で反映されるため、取り直せば停止した行が「停止」
 * になって並びます。画面は移りません。行の操作の結果は一覧の上で見えるためです。
 *
 * **`409` で拒まれたときも取り直させます。** 既に停止されていたか、同じ送信がまだ処理中かのどちら
 * かで、取り直せば一覧が真の状態に落ちます。`409` にだけ専用の文言を当てます。
 *
 * コードを結果へ載せて返すのは、一覧の上に 1 つだけ出す報せがどの行の話かを言うためです。
 *
 * @param _previous - 直前の action state（本体では参照しない）。
 * @param formData - 停止するキャンペーンの識別子・コード・冪等キーを積んだ送信内容。
 * @returns 送信結果を表す action state。
 */
export async function suspendCampaignAction(
  _previous: SuspendCampaignState,
  formData: FormData,
): Promise<SuspendCampaignState> {
  try {
    await assertAdmin(ADMIN_CAMPAIGN_LIST_PATH);
  } catch (error) {
    unstable_rethrow(error);

    return actionStateFromError(error);
  }

  const id = formData.get(SUSPEND_FORM_NAMES.campaignId);
  const code = formData.get(SUSPEND_FORM_NAMES.campaignCode);
  const idempotencyKey = z.uuid().safeParse(formData.get(IDEMPOTENCY_KEY_FIELD));

  if (
    typeof id !== "string" ||
    id === "" ||
    typeof code !== "string" ||
    code === "" ||
    !idempotencyKey.success
  ) {
    return failedActionState({ formError: SUSPEND_TARGET_LOST_MESSAGE });
  }

  try {
    await suspendCampaign(toCampaignId(id), idempotencyKey.data);
  } catch (error) {
    redirectIfUnauthenticated(error, ADMIN_CAMPAIGN_LIST_PATH);

    if (findAppError(error)?.kind === ErrorKind.CONFLICT) {
      revalidatePath(ADMIN_CAMPAIGN_LIST_PATH);

      return failedActionState({
        formError: `${code} は${SUSPEND_CONFLICT_MESSAGE}`,
        kind: ErrorKind.CONFLICT,
      });
    }

    return actionStateFromError(error);
  }

  revalidatePath(ADMIN_CAMPAIGN_LIST_PATH);

  return succeededActionState({ code });
}
