"use server";

import { withdrawUser } from "@/adapters/server/api/users";
import { verifySession } from "@/adapters/server/auth/session";
import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { WITHDRAW_FORM_NAMES } from "@/features/admin/users/form-names";
import type { WithdrawUserState } from "@/features/admin/users/form-state";
import {
  WITHDRAW_CONFLICT_MESSAGE,
  WITHDRAW_TARGET_LOST_MESSAGE,
} from "@/features/admin/users/form-state";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { isAdmin } from "@/model/authz";
import { toUserId } from "@/model/user/user";

/** 役割を持たない主体の要求をここで止める。 */
async function assertAdmin(): Promise<void> {
  if (!isAdmin(await verifySession())) {
    throw createAppError(ErrorKind.PERMISSION_DENIED, {
      cause: new Error("管理の操作に必要な役割がありません"),
    });
  }
}

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
 */
export async function withdrawUserAction(
  _previous: WithdrawUserState,
  formData: FormData,
): Promise<WithdrawUserState> {
  try {
    await assertAdmin();
  } catch (error) {
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
