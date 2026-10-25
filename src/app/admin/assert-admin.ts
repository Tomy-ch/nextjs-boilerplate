import { redirect } from "next/navigation";

import { verifySession } from "@/adapters/server/auth/session";
import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { loginPath } from "@/features/auth/facade/paths";
import { isAdmin } from "@/model/authz";

/**
 * 管理の操作に進めない主体の要求をここで止める。
 *
 * @remarks
 * session が無ければ、操作を出した画面へ戻る入り直しへ送る。`redirect` は投げて抜けるため、
 * 呼び出し側の `catch` は先頭で `unstable_rethrow` に通す。
 *
 * @param returnTo - 入り直した後に戻す画面のパス。
 * @throws 管理の役割を持たなければ `PERMISSION_DENIED` を {@link createAppError} で投げる。
 */
export async function assertAdmin(returnTo: string): Promise<void> {
  const session = await verifySession();

  if (session === null) {
    redirect(loginPath(returnTo));
  }

  if (!isAdmin(session)) {
    throw createAppError(ErrorKind.PERMISSION_DENIED, {
      cause: new Error("管理の操作に必要な役割がありません"),
    });
  }
}
