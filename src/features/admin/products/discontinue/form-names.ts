/**
 * 廃番の送信が持つ項目の名前。
 *
 * @remarks
 * 送る側と受け取る側が同じ綴りを使うための宣言です。文字列を両側に書くと、片方だけを直したときに
 * 型では止まらず、実行して初めて「値が届いていない」形で現れます。冪等キーは
 * `IDEMPOTENCY_KEY_FIELD`（`model/idempotency-key`）の綴りで載ります。
 */
export const DISCONTINUE_FORM_NAMES = {
  /** 廃番にする商品。 */
  productId: "productId",
  /** 代替クーポンの値引き率。百分率で打たれたまま載る。 */
  couponDiscountRate: "couponDiscountRate",
  /** 代替クーポンの有効日数。 */
  couponValidityDays: "couponValidityDays",
  /** 確認を通った合図。 */
  confirmed: "confirmed",
} as const;

/** 確認を通ったときに {@link DISCONTINUE_FORM_NAMES.confirmed} へ載せる値。 */
export const DISCONTINUE_CONFIRMED_VALUE = "true";
