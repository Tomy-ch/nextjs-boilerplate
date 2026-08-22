import { toSafeReturnUrl } from "@/model/return-url";

/** ログイン画面。認証をやり直させる先。 */
export const LOGIN_PATH = "/login";

/**
 * 認証を始められなかった理由を載せる URL のキー。
 *
 * @remarks
 * 組む側（この module）と読む側（[`read-login-notice.ts`](../read-login-notice.ts)）が同じ名前を
 * 共有します。**片方だけが知っている名前にすると、送った側は案内したつもりで、受け取る側は何も
 * 出しません。**
 */
export const LOGIN_NOTICE_KEY = "error";

/**
 * ログイン画面が案内する、認証を始められなかった理由。
 *
 * @remarks
 * 載るのは分類だけです。IdP が返した本文も、どこで落ちたかも載せません。URL は利用者が直接
 * 編集でき、そのまま画面へ出す値になるためです。
 */
export const LOGIN_NOTICE = {
  /** IdP へ到達できず、認可要求を始められなかった。 */
  UNAVAILABLE: "unavailable",
} as const;

/** ログイン画面が案内する、認証を始められなかった理由。 */
export type LoginNotice = (typeof LOGIN_NOTICE)[keyof typeof LOGIN_NOTICE];

/**
 * 認証を促す行き先を組む。
 *
 * @remarks
 * 戻り先を必ず検証してから載せます。受け取った値をそのまま置くと、自サイトの導線で外部の
 * URL へ送れます（open redirect。[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。
 * 検証は `model` が持ち、ここはその結果を URL へ組むだけです。
 *
 * `proxy.ts` は同じ行き先を自前で組みます。前捌きは 11 カーネルの外にあり `features` を
 * 参照できないためで、これは重複ではなく層の境界です（[0043](../../../../docs/adr/0043-middleware-policy.md)）。
 *
 * @param returnTo - 認証後に戻す先。同一 origin の相対パスでなければ `/` へ倒れる
 */
export function loginPath(returnTo: string): string {
  return `${LOGIN_PATH}?returnUrl=${encodeURIComponent(toSafeReturnUrl(returnTo))}`;
}

/**
 * 認証を始められなかったときに戻す行き先を組む。
 *
 * @remarks
 * {@link loginPath} の上に理由を足すだけにしてあります。戻り先を載せる箇所を 2 つに増やすと、
 * 検証を通していない方が生まれます。
 *
 * @param returnTo - 認証後に戻す先。同一 origin の相対パスでなければ `/` へ倒れる
 */
export function unavailableLoginPath(returnTo: string): string {
  return `${loginPath(returnTo)}&${LOGIN_NOTICE_KEY}=${LOGIN_NOTICE.UNAVAILABLE}`;
}
