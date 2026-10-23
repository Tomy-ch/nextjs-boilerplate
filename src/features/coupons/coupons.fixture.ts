import { type HeldCoupon, toCouponId } from "@/model/coupon/coupon";

/** 状態を決める「いま」。各 fixture の時刻はこの時刻に照らして選んである。 */
export const FIXTURE_NOW = new Date("2026-01-01T00:00:00Z");

/** 未使用。定率で上限と購入額の下限を持つ。 */
export const UNUSED_COUPON: HeldCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000005"),
  discount: { kind: "rate", value: "0.10", maxAmount: 1000 },
  scopeKind: "category",
  minPurchaseAmount: 5000,
  usableFrom: null,
  expiresAt: new Date("2026-03-31T15:00:00Z"),
  usedAt: null,
};

/** 利用開始前。定額で条件を持たない。 */
export const NOT_STARTED_COUPON: HeldCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000004"),
  discount: { kind: "flat", value: "5.00" },
  scopeKind: "all",
  minPurchaseAmount: null,
  usableFrom: new Date("2026-01-31T15:00:00Z"),
  expiresAt: new Date("2026-04-30T15:00:00Z"),
  usedAt: null,
};

/** 使用済み。 */
export const USED_COUPON: HeldCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000002"),
  discount: { kind: "flat", value: "10.00" },
  scopeKind: "all",
  minPurchaseAmount: 3000,
  usableFrom: null,
  expiresAt: new Date("2026-01-31T15:00:00Z"),
  usedAt: new Date("2025-12-10T03:00:00Z"),
};

/** 期限切れ。定率で上限を持たない。 */
export const EXPIRED_COUPON: HeldCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000001"),
  discount: { kind: "rate", value: "0.15", maxAmount: null },
  scopeKind: "product",
  minPurchaseAmount: null,
  usableFrom: null,
  expiresAt: new Date("2025-12-31T15:00:00Z"),
  usedAt: null,
};

/** 4 状態が 1 枚ずつ、発行の新しい順に並んだ保有一覧。 */
export const HELD_COUPONS: readonly HeldCoupon[] = [
  UNUSED_COUPON,
  NOT_STARTED_COUPON,
  USED_COUPON,
  EXPIRED_COUPON,
];
