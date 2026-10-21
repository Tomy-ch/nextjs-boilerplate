import { type AppliedCoupon, COUPON_SCOPE_NAME } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { withPartSpan } from "@/observability/render-span";

/** `PurchaseAppliedCoupon` の props。 */
export type PurchaseAppliedCouponProps = {
  /** 購入に適用したクーポン。 */
  coupon: AppliedCoupon;
};

/**
 * 購入に適用したクーポンの中身を 1 行で示す。
 *
 * @remarks
 * 値引きの行の直下に添える前提の文字の大きさです。額面・上限・範囲を並べ、事後に「何による
 * 値引きだったか」を確かめられるようにします。範囲は種別だけで、対象の名前は契約が返しません。
 *
 * @param props - 受け取る内容。個々の意味は {@link PurchaseAppliedCouponProps} の各メンバーが持つ。
 * @see Storybook `Features/Purchases/Detail/AppliedCoupon`
 */
export const PurchaseAppliedCoupon = withPartSpan(
  "features/purchases/detail/ui/applied-coupon/applied-coupon",
  ({ coupon }: PurchaseAppliedCouponProps) => {
    const cap = formatCouponDiscountCap(coupon.discount);

    return (
      <p className="text-muted-foreground text-xs">
        {formatCouponDiscount(coupon.discount)}
        {cap === undefined ? "" : `（${cap}）`}・{COUPON_SCOPE_NAME[coupon.scopeKind]}が対象
      </p>
    );
  },
);
