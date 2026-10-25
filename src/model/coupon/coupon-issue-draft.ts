import type { CouponDiscount, CouponScopeTarget } from "./coupon";

/**
 * 利用者 1 人へ発行するクーポンの内容。
 *
 * @remarks
 * 発行したクーポンは無効にも変更にもできないため、作る時点の内容がそのまま渡る内容です。
 */
export type CouponIssueDraft = {
  readonly discount: CouponDiscount;
  readonly scope: CouponScopeTarget;
  /** クーポンを使うのに要る購入額の下限。最小単位の整数。条件が無ければ `null`。 */
  readonly minPurchaseAmount: number | null;
  /** クーポンが使えるようになる日時。発行した時点から使えるなら `null`。 */
  readonly usableFrom: Date | null;
  /** クーポンの有効期限。この時刻からは使えない。 */
  readonly expiresAt: Date;
};
