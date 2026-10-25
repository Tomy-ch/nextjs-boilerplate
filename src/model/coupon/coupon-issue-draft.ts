import type { CouponDiscount, CouponScopeTarget } from "./coupon";

export type CouponIssueDraft = {
  readonly discount: CouponDiscount;
  readonly scope: CouponScopeTarget;
  readonly minPurchaseAmount: number | null;
  readonly usableFrom: Date | null;
  readonly expiresAt: Date;
};
