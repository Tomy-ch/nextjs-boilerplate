import { redirect } from "next/navigation";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { loginPath } from "./paths";

/**
 * 接続先が認証切れで拒んだ失敗なら、操作を出した画面へ戻る入り直しへ送る。
 *
 * @remarks
 * `redirect` は投げて抜けるため、`try` の内側ではなく `catch` の中で呼ぶ。
 *
 * @param error - 接続先の呼び出しが投げた失敗。
 * @param returnTo - 入り直した後に戻す画面のパス。
 */
export function redirectIfUnauthenticated(error: unknown, returnTo: string): void {
  if (findAppError(error)?.kind === ErrorKind.UNAUTHENTICATED) {
    redirect(loginPath(returnTo));
  }
}
