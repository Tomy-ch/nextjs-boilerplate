"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";

import { createCampaign } from "@/adapters/server/api/campaigns";
import { verifySession } from "@/adapters/server/auth/session";
import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { toCampaignFieldErrors } from "@/features/admin/campaigns/new/campaign-rejection";
import type { CreateCampaignState } from "@/features/admin/campaigns/new/form-state";
import { parseCampaignForm } from "@/features/admin/campaigns/new/parse-campaign-form";
import { ADMIN_CAMPAIGN_LIST_PATH } from "@/features/admin/paths";
import { actionStateFromError, failedActionState } from "@/model/action-state";
import { isAdmin } from "@/model/authz";

/** 接続先が欄を名指ししないまま内容を拒んだときの文言。 */
const INVALID_INPUT_MESSAGE =
  "入力内容を受け付けられませんでした。期間・上限・値引きの組み合わせを確認してください。";

/**
 * 役割を持たない主体の要求をここで止める。
 *
 * @throws 管理の役割を持たない session では {@link createAppError} で `PERMISSION_DENIED` を投げる。
 */
async function assertAdmin(): Promise<void> {
  if (!isAdmin(await verifySession())) {
    throw createAppError(ErrorKind.PERMISSION_DENIED, {
      cause: new Error("管理の操作に必要な役割がありません"),
    });
  }
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
    await assertAdmin();
  } catch (error) {
    return actionStateFromError(error);
  }

  const parsed = parseCampaignForm(formData);

  if (!parsed.ok) {
    return failedActionState({ formError: parsed.formError, fieldErrors: parsed.fieldErrors });
  }

  try {
    await createCampaign(parsed.draft, parsed.idempotencyKey);
  } catch (error) {
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
