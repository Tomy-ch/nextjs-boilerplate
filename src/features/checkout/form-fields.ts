/**
 * 値が変わったことを承知した合図を載せる項目の名前。
 *
 * @remarks
 * 確認を経た送信にだけ載ります。載っていない送信は、値が変わっていれば止まります。
 */
export const ACCEPT_PRICE_CHANGE_FIELD = "acceptPriceChange";

/**
 * 適用するクーポンを載せる項目の名前。
 *
 * @remarks
 * 候補の 1 枚を選んでいる送信にだけ載ります。載っていない送信は、クーポンを使わない購入です。
 */
export const COUPON_ID_FIELD = "couponId";
