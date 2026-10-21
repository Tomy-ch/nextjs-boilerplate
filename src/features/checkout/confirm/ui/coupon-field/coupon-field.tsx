import { Card, CardContent } from "@/components/design-system/display/card/card";
import { type CartCoupon, COUPON_SCOPE_NAME } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";
import { withPartSpan } from "@/observability/render-span";

import { CouponChoice, CouponChoices } from "../coupon-choices/coupon-choices";

/** {@link CouponField} の props。 */
export type CouponFieldProps = {
  /** いまのカートに使えるクーポン。読めなかったときは null。 */
  coupons: readonly CartCoupon[] | null;
};

const TITLE = "クーポン";
const UNAVAILABLE_MESSAGE = "クーポンを読み込めませんでした。クーポンを使わずに注文できます。";
const NOTE =
  "値引きは確定時の内容で決まり、ここに出ている額と異なることがあります。小計からは差し引いていません。";

/**
 * 確定に載せるクーポンを 1 枚選ぶ欄。
 *
 * @remarks
 * **値引き額は受け取った値をそのまま出します。** 額面と範囲から計算し直すと、金額の決定が画面へ
 * 漏れます。
 *
 * 使えるクーポンが無いときは呼び出し元が欄ごと置きません。読めなかったときは、使わずに注文
 * できることだけを告げます。
 *
 * @param props - {@link CouponFieldProps}。
 */
export const CouponField = withPartSpan(
  "features/checkout/confirm/ui/coupon-field/coupon-field",
  ({ coupons }: CouponFieldProps) => {
    if (coupons === null) {
      return (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <h2 className="font-emphasis leading-none">{TITLE}</h2>
            <p className="text-muted-foreground text-sm">{UNAVAILABLE_MESSAGE}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <CouponChoices title={TITLE}>
            {coupons.map((coupon) => (
              <CouponChoice couponId={coupon.id} key={coupon.id}>
                <CouponSummary coupon={coupon} />
              </CouponChoice>
            ))}
          </CouponChoices>
          <p className="text-muted-foreground text-xs">{NOTE}</p>
        </CardContent>
      </Card>
    );
  },
);

/**
 * クーポン 1 枚の額面・範囲・値引き額・期限。
 *
 * @param props - 見せるクーポン。
 */
function CouponSummary({ coupon }: { coupon: CartCoupon }) {
  const face = formatCouponDiscount(coupon.discount);
  const cap = formatCouponDiscountCap(coupon.discount);

  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span>
        {cap === undefined ? face : `${face}（${cap}）`}・{COUPON_SCOPE_NAME[coupon.scopeKind]}
      </span>
      <span className="flex flex-wrap gap-x-3 text-muted-foreground text-xs">
        <span className="font-emphasis text-foreground text-sm tabular-nums">
          {formatMoney(-coupon.discountAmount)}
        </span>
        <span>有効期限 {formatDateTime(new Date(coupon.expiresAt))}</span>
      </span>
    </span>
  );
}
