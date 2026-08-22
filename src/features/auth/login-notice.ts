import { loginPath } from "./facade/paths";

/**
 * 認証を始められなかった理由を載せる URL のキー。
 *
 * @remarks
 * 組む側（この module）と読む側（[`read-login-notice.ts`](read-login-notice.ts)）が同じ名前を
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
 * 認証を始められなかったときに戻す行き先を組む。
 *
 * @remarks
 * `facade/` ではなくスライスの内側に置きます。あそこへ置いてよいのは 2 つ目の feature が実際に
 * 必要としたものだけで（[0021](../../../docs/adr/0021-frontend-responsibility.md)）、この行き先を
 * 使うのはこのスライスと app 層だけです。宛先そのもの（`loginPath`）は他の feature が指すので
 * facade に残り、ここはそれを借ります。
 *
 * {@link loginPath} の上に理由を足すだけにしてあります。戻り先を載せる箇所を 2 つに増やすと、
 * 検証を通していない方が生まれます。
 *
 * @param returnTo - 認証後に戻す先。同一 origin の相対パスでなければ `/` へ倒れる
 */
export function unavailableLoginPath(returnTo: string): string {
  return `${loginPath(returnTo)}&${LOGIN_NOTICE_KEY}=${LOGIN_NOTICE.UNAVAILABLE}`;
}
