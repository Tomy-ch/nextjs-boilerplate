/**
 * 在庫を動かすフォームが送る項目の名前。
 *
 * @remarks
 * 送る側と受け取る側が同じ綴りを使うための宣言です。文字列を両側に書くと、片方だけを直したときに
 * 型では止まらず、実行して初めて「値が届いていない」形で現れます。
 */
export const STOCK_FORM_NAMES = {
  /** 対象の商品。 */
  productId: "productId",
  /** 増やすか減らすか。 */
  direction: "direction",
  /** 動かす量。符号を持たない。 */
  quantity: "quantity",
} as const;
