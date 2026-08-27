/**
 * 購入の状態を進める送信が持つ項目の名前。
 *
 * @remarks
 * 送る側と受け取る側が同じ綴りを使うための宣言です。文字列を両側に書くと、片方だけを直したときに
 * 型では止まらず、実行して初めて「値が届いていない」形で現れます。
 */
export const PURCHASE_TRANSITION_FORM_NAMES = {
  /** 状態を進める対象の購入。 */
  purchaseCode: "purchaseCode",
} as const;
