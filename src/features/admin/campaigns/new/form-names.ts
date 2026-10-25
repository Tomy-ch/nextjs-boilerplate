/**
 * キャンペーンの定義の送信が持つ項目の名前。
 *
 * @remarks
 * 値引きと範囲の項目はここに無く、共有の綴り（`coupon-discount` / `coupon-scope`）で載ります。
 * 冪等キーは `IDEMPOTENCY_KEY_FIELD`（`model/idempotency-key`）の綴りで載ります。
 *
 * 項目名は契約の欄名と揃えます。接続先が弾いた欄を名指ししたとき、その名前のまま入力欄を
 * 引けるようにするためです。
 */
export const CAMPAIGN_FORM_NAMES = {
  /** キャンペーンコード。打たれたまま載り、読む側が正規化する。 */
  code: "code",
  /** 配布期間の開始。瞬間の文字列。 */
  startsAt: "startsAt",
  /** 配布期間の終了。瞬間の文字列。 */
  endsAt: "endsAt",
  /** 配るクーポンの有効期限。瞬間の文字列。 */
  couponExpiresAt: "couponExpiresAt",
  /** 配るクーポンが使えるようになる日時。瞬間の文字列。任意。 */
  usableFrom: "usableFrom",
  /** 配れる総枚数。 */
  totalLimit: "totalLimit",
  /** 1 人が受け取れる枚数。 */
  perUserLimit: "perUserLimit",
  /** 配るクーポンを使うのに要る購入額の下限（主単位）。任意。 */
  minPurchaseAmount: "minPurchaseAmount",
  /** 確認を通った合図。 */
  confirmed: "confirmed",
} as const;

/** 確認を通ったときに {@link CAMPAIGN_FORM_NAMES.confirmed} へ載せる値。 */
export const CAMPAIGN_CONFIRMED_VALUE = "true";
