import type { CouponDiscount, CouponScopeTarget } from "../coupon/coupon";

/**
 * 新しく定義するキャンペーンの内容。
 *
 * @remarks
 * 配るクーポンの中身（値引き・範囲・最低購入額・使える期間）と、配る側の条件（配布期間・上限）を
 * 1 つに持ちます。契約は定義を後から変える口を持たず、配った時点でクーポンへ焼かれるため、
 * 作る時点の内容がそのまま配られる内容です。
 *
 * コードは正規化（前後の空白を落とし大文字に揃える）を済ませた値です。確認で見せた綴りと
 * 送った綴りを一致させるため、送る前に揃えます。
 */
export type CampaignDraft = {
  readonly code: string;
  readonly discount: CouponDiscount;
  readonly scope: CouponScopeTarget;
  /** 配るクーポンを使うのに要る購入額の下限。最小単位の整数。条件が無ければ `null`。 */
  readonly minPurchaseAmount: number | null;
  /** 配るクーポンが使えるようになる日時。受け取った時点から使えるなら `null`。 */
  readonly usableFrom: Date | null;
  /** 配るクーポンの有効期限。 */
  readonly couponExpiresAt: Date;
  /** 配布期間の開始。この時刻ちょうどを含む。 */
  readonly startsAt: Date;
  /** 配布期間の終了。この時刻ちょうどを含まない。 */
  readonly endsAt: Date;
  /** 配れるクーポンの総枚数。 */
  readonly totalLimit: number;
  /** 1 人が受け取れる枚数。 */
  readonly perUserLimit: number;
};
