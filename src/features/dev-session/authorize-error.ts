import { DEV_SESSION_PATH, RETURN_URL_PARAM, STATE_PARAM } from "./paths";

/** 認可を成立させられなかった理由を載せる URL のキー。 */
export const AUTHORIZE_ERROR_PARAM = "error";

/**
 * 認可を成立させられなかった理由。
 *
 * @remarks
 * 分類だけを載せます。実在の IdP も認可 endpoint からは `error` の分類しか戻しません
 * （項目ごとの理由を戻すのは、自分の画面へ留まる送信のほうです）。
 */
export const AUTHORIZE_ERROR = {
  /** 発行の指定が妥当でなかった。 */
  INVALID: "invalid",
  /** トークンを取りに行けなかった。 */
  UNAVAILABLE: "unavailable",
} as const;

/** 認可を成立させられなかった理由。 */
export type AuthorizeError = (typeof AUTHORIZE_ERROR)[keyof typeof AUTHORIZE_ERROR];

/**
 * 認可を成立させられなかったときに戻す行き先を組む。
 *
 * @remarks
 * 戻り先と対応づける値を持ち回ります。落とすと、やり直した送信が認可の往復から外れます。
 *
 * @param returnUrl - 認証後に戻す先。検証済みの相対パスであること
 * @param state - 要求と応答を対応づける値
 * @param error - 成立させられなかった理由
 */
export function authorizeFailurePath(
  returnUrl: string,
  state: string,
  error: AuthorizeError,
): string {
  const query = new URLSearchParams({
    [RETURN_URL_PARAM]: returnUrl,
    [STATE_PARAM]: state,
    [AUTHORIZE_ERROR_PARAM]: error,
  });

  return `${DEV_SESSION_PATH}?${query.toString()}`;
}
