/**
 * IdP を通さずに session を発行する画面。
 *
 * @remarks
 * 開発と CI でだけ開きます。それ以外の環境では route ごと `not-found` になります。
 */
export const DEV_SESSION_PATH = "/dev/session";

/**
 * 発行の指定を受け取り、認可の応答として返す口。
 *
 * @remarks
 * 認可の往復の途中で開かれたときの送信先です。**Server Action ではありません** ——
 * `redirect()` は Route Handler へ遷移できず（client router が飲み込み、要求が出ません）、
 * 認可の応答は `/api/auth/callback` という Route Handler へ戻す必要があるためです。素の form
 * 送信ならブラウザが遷移するので、往復が本番と同じ経路を通ります。
 *
 * 実在の IdP でも、ログイン画面は認可 endpoint へ送信し、そこが応答を持って戻します。
 * この口はその役どころに対応します。
 */
export const DEV_AUTHORIZE_PATH = "/dev/session/authorize";

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
