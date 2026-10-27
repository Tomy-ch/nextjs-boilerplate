"use server";

import { redirect, unstable_rethrow } from "next/navigation";

import { issueCoupon } from "@/adapters/server/api/coupons";
import { getManagedUser, withdrawUser } from "@/adapters/server/api/users";
import { findAppError, isUnauthenticated } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { ADMIN_USER_LIST_PATH, adminUserCouponNewPath } from "@/features/admin/paths";
import {
  ISSUE_RESEND_CONFLICT_MESSAGE,
  type IssueCouponState,
} from "@/features/admin/users/coupon-new/form-state";
import {
  notFoundStateOf,
  type RecipientReread,
  toIssueFieldErrors,
} from "@/features/admin/users/coupon-new/issue-rejection";
import { parseIssueForm } from "@/features/admin/users/coupon-new/parse-issue-form";
import { WITHDRAW_FORM_NAMES } from "@/features/admin/users/list/form-names";
import type { WithdrawUserState } from "@/features/admin/users/list/form-state";
import {
  WITHDRAW_CONFLICT_MESSAGE,
  WITHDRAW_TARGET_LOST_MESSAGE,
} from "@/features/admin/users/list/form-state";
import { loginPath } from "@/features/auth/facade/paths";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { toUserId, type UserId } from "@/model/user/user";
import { assertAdmin } from "../assert-admin";

const INVALID_INPUT_MESSAGE =
  "入力内容を受け付けられませんでした。値引き・対象・期限の組み合わせを確認してください。";

/**
 * 利用者を 1 件退会させる。
 *
 * @remarks
 * **一覧を取り直させません。**退会は結果整合で後始末が続くため、直後に取り直しても「まだ反映
 * されていない一覧」を見せるだけです。何が起きたかは送信の結果が伝え、最新の並びを見るのは
 * 利用者が読み込み直したときになります。
 *
 * `409` にだけ専用の文言を当てます。カタログの既定文言は分類だけを伝えるもので、拒まれた理由が
 * 「進行中の購入が残っている」ことであるのは、この画面でしか言えません。
 *
 * 呼び名を結果へ載せて返すのは、成立した時点でその行が一覧から消えていることがあるためです。
 *
 * @param _previous - 直前の action state（本体では参照しない）。
 * @param formData - 退会させる利用者の識別子と呼び名を積んだ送信内容。
 * @returns 送信結果を表す action state。
 */
export async function withdrawUserAction(
  _previous: WithdrawUserState,
  formData: FormData,
): Promise<WithdrawUserState> {
  try {
    await assertAdmin(ADMIN_USER_LIST_PATH);
  } catch (error) {
    unstable_rethrow(error);

    return actionStateFromError(error);
  }

  const id = formData.get(WITHDRAW_FORM_NAMES.userId);
  const name = formData.get(WITHDRAW_FORM_NAMES.userName);

  if (typeof id !== "string" || id === "" || typeof name !== "string" || name === "") {
    return failedActionState({ formError: WITHDRAW_TARGET_LOST_MESSAGE });
  }

  try {
    await withdrawUser(toUserId(id));
  } catch (error) {
    if (isUnauthenticated(error)) redirect(loginPath(ADMIN_USER_LIST_PATH));

    if (findAppError(error)?.kind === ErrorKind.CONFLICT) {
      return failedActionState({
        formError: `${name} は${WITHDRAW_CONFLICT_MESSAGE}`,
        kind: ErrorKind.CONFLICT,
      });
    }

    return actionStateFromError(error);
  }

  return succeededActionState({ name });
}

/**
 * 送信が 404 になったあと、宛先の利用者を引き直す。
 *
 * @param recipient - 送った宛先
 * @param screenPath - 認証が切れていたときに戻す画面
 * @returns 引き直した結果
 */
async function rereadRecipient(recipient: UserId, screenPath: string): Promise<RecipientReread> {
  try {
    const user = await getManagedUser(recipient);

    return { kind: "found", deletedAt: user.deletedAt };
  } catch (error) {
    if (isUnauthenticated(error)) redirect(loginPath(screenPath));

    return findAppError(error)?.kind === ErrorKind.NOT_FOUND
      ? { kind: "absent" }
      : { kind: "unreadable" };
  }
}

/**
 * 利用者 1 人にクーポンを 1 枚発行する。
 *
 * @remarks
 * **役割の判定は、送信内容を読めたかに関わらず先に行います。** 送信の口は画面を経ずに呼べる
 * ため、読めない送信への応答から先に役割の無い者へ返さないためです。
 *
 * 成立しても移らず、取り直しもしません。管理側に発行を映す画面が無く、画面に留まって報せます。
 * 404 は、宛先と範囲の対象のどちらに由来するかを言い分けて返します。
 *
 * @param _previous - 直前の結果。使わない
 * @param formData - 発行の確認が送った値
 * @returns 発行の結果
 */
export async function issueUserCouponAction(
  _previous: IssueCouponState,
  formData: FormData,
): Promise<IssueCouponState> {
  const parsed = parseIssueForm(formData);
  const screenPath =
    parsed.recipient === null ? ADMIN_USER_LIST_PATH : adminUserCouponNewPath(parsed.recipient);

  try {
    await assertAdmin(screenPath);
  } catch (error) {
    unstable_rethrow(error);

    return actionStateFromError(error);
  }

  if (!parsed.ok) {
    return failedActionState({ formError: parsed.formError, fieldErrors: parsed.fieldErrors });
  }

  const { draft, idempotencyKey, recipient } = parsed;

  try {
    await issueCoupon(recipient, draft, idempotencyKey);
  } catch (error) {
    if (isUnauthenticated(error)) redirect(loginPath(screenPath));

    const kind = findAppError(error)?.kind;

    if (kind === ErrorKind.NOT_FOUND) {
      return notFoundStateOf(draft.scope, () => rereadRecipient(recipient, screenPath));
    }

    if (kind === ErrorKind.CONFLICT) {
      return failedActionState({ formError: ISSUE_RESEND_CONFLICT_MESSAGE, kind });
    }

    if (kind === ErrorKind.VALIDATION) {
      const fieldErrors = toIssueFieldErrors(error);

      return Object.keys(fieldErrors).length > 0
        ? failedActionState({ formError: null, fieldErrors, kind })
        : failedActionState({ formError: INVALID_INPUT_MESSAGE, kind });
    }

    return actionStateFromError(error);
  }

  return succeededActionState(undefined);
}
