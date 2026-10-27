/**
 * 退会の送信が持つ項目の名前。
 *
 * @remarks
 * 送る側と受け取る側が同じ綴りを使うための宣言です。文字列を両側に書くと、片方だけを直したときに
 * 型では止まらず、実行して初めて「値が届いていない」形で現れます。
 */
export const WITHDRAW_FORM_NAMES = {
  /** 退会させる利用者。 */
  userId: "userId",
  /** 結果の文言に使う呼び名。 */
  userName: "userName",
} as const;
