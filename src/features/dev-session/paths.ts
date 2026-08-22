/**
 * IdP を通さずに session を発行する画面。
 *
 * @remarks
 * 開発と CI でだけ開きます。それ以外の環境では route ごと `not-found` になります。
 */
export const DEV_SESSION_PATH = "/dev/session";

/** 戻り先を持ち回るための検索条件の名前。 */
export const RETURN_URL_PARAM = "returnUrl";

/**
 * 要求と応答を対応づける値を持ち回るための検索条件の名前。
 *
 * @remarks
 * 認可の開始先をこの画面へ向けている（`AUTH_MODE=dev`）ときだけ載ります。載っていれば、発行の
 * 結果を `/api/auth/callback` へ返します。
 */
export const STATE_PARAM = "state";
