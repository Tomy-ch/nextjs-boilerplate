import { DEFAULT_LOCALE } from "../locale";
import { formatDecimalMoney, formatMoney } from "../money";
import { formatRate } from "../number";
import type { CouponDiscount } from "./coupon";

/**
 * 値引きの決まり方を、額面の文言にする。
 *
 * @remarks
 * 上限は含めません。上限の有無や置き方は画面ごとに違い、一覧の列に分けて出す画面もあるため、
 * {@link formatCouponDiscountCap} で別に受け取ります。
 *
 * 定額の額面は、値引き額を求める時点の切り捨てとは別のものです。ここは額面を通貨の桁で見せる
 * だけで、実際に引かれた額は購入やカートの応答が返します。
 *
 * @param discount - 値引きの決まり方
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 * @returns `10% 引き` / `$5.00 引き` の形の文言
 */
export function formatCouponDiscount(
  discount: CouponDiscount,
  locale: string = DEFAULT_LOCALE,
): string {
  switch (discount.kind) {
    case "flat":
      return `${formatDecimalMoney(discount.value, locale)} 引き`;
    case "rate":
      return `${formatRate(discount.value, locale)} 引き`;
  }
}

/**
 * 定率の値引きの上限を文言にする。
 *
 * @param discount - 値引きの決まり方
 * @param locale - 用いる locale。省略時は {@link DEFAULT_LOCALE}
 * @returns `上限 $3.00` の形の文言。上限を持たない値引きは `undefined`
 */
export function formatCouponDiscountCap(
  discount: CouponDiscount,
  locale: string = DEFAULT_LOCALE,
): string | undefined {
  if (discount.kind !== "rate" || discount.maxAmount === null) {
    return undefined;
  }

  return `上限 ${formatMoney(discount.maxAmount, locale)}`;
}
