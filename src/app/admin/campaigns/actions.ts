"use server";

import { refresh, revalidatePath } from "next/cache";
import { RedirectType, redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { createCampaign, suspendCampaign } from "@/adapters/server/api/campaigns";
import { findAppError, isUnauthenticated } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SUSPEND_FORM_NAMES } from "@/features/admin/campaigns/list/form-names";
import {
  SUSPEND_CONFLICT_MESSAGE,
  SUSPEND_TARGET_LOST_MESSAGE,
  type SuspendCampaignState,
} from "@/features/admin/campaigns/list/form-state";
import { toCampaignFieldErrors } from "@/features/admin/campaigns/new/campaign-rejection";
import type { CreateCampaignState } from "@/features/admin/campaigns/new/form-state";
import { parseCampaignForm } from "@/features/admin/campaigns/new/parse-campaign-form";
import { ADMIN_CAMPAIGN_LIST_PATH, ADMIN_CAMPAIGN_NEW_PATH } from "@/features/admin/paths";
import { loginPath } from "@/features/auth/facade/paths";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { toCampaignId } from "@/model/campaign/campaign";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { assertAdmin } from "../assert-admin";

/** 接続先が欄を名指ししないまま内容を拒んだときの文言。 */
const INVALID_INPUT_MESSAGE =
  "入力内容を受け付けられませんでした。期間・上限・値引きの組み合わせを確認してください。";

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
    if (isUnauthenticated(error)) redirect(loginPath(ADMIN_CAMPAIGN_LIST_PATH));

    if (findAppError(error)?.kind === ErrorKind.CONFLICT) {
      refresh();

      return failedActionState({
        formError: `${code} は${SUSPEND_CONFLICT_MESSAGE}`,
        kind: ErrorKind.CONFLICT,
      });
    }

    return actionStateFromError(error);
  }

  refresh();

  return succeededActionState({ code });
}

/**
 * キャンペーンを定義する。
 *
 * @remarks
 * **成立したら一覧を取り直させてから、一覧へ送ります。** 履歴は置き換えます — 積むと、戻る操作で
 * 送り終えた画面が古い冪等キーのまま戻り、内容を変えて送ると別の内容として拒まれます。
 *
 * **409 はコードの欄へ出します。** 422 は名指しされた欄があればそこへ、無ければ全体の文言に
 * まとめます。どちらも業務の拒否で、接続先は冪等キーを記録しないため、直して同じキーで送り直せます。
 *
 * @param _previous - 直前の action state（本体では参照しない）。
 * @param formData - 定義の送信内容。
 * @returns 送信結果を表す action state。成立時は一覧へ redirect するため戻らない。
 */
export async function createCampaignAction(
  _previous: CreateCampaignState,
  formData: FormData,
): Promise<CreateCampaignState> {
  try {
    await assertAdmin(ADMIN_CAMPAIGN_NEW_PATH);
  } catch (error) {
    unstable_rethrow(error);

    return actionStateFromError(error);
  }

  const parsed = parseCampaignForm(formData);

  if (!parsed.ok) {
    return failedActionState({ formError: parsed.formError, fieldErrors: parsed.fieldErrors });
  }

  try {
    await createCampaign(parsed.draft, parsed.idempotencyKey);
  } catch (error) {
    if (isUnauthenticated(error)) redirect(loginPath(ADMIN_CAMPAIGN_NEW_PATH));

    const kind = findAppError(error)?.kind;
    const fieldErrors = toCampaignFieldErrors(error);

    if (Object.keys(fieldErrors).length > 0) {
      return failedActionState({
        formError: null,
        fieldErrors,
        kind: kind ?? ErrorKind.VALIDATION,
      });
    }

    if (kind === ErrorKind.VALIDATION) {
      return failedActionState({ formError: INVALID_INPUT_MESSAGE, kind });
    }

    return actionStateFromError(error);
  }

  revalidatePath(ADMIN_CAMPAIGN_LIST_PATH);
  redirect(ADMIN_CAMPAIGN_LIST_PATH, RedirectType.replace);
}
