import "server-only";

import type { CouponDiscount } from "@/model/coupon/coupon";

import type { CouponDiscount as WireCouponDiscount } from "../../gen/api/model";

/**
 * 契約のクーポンの値引きを表示用の型へ写す。
 *
 * @remarks
 * クーポンを返す口はどれも同じ値引きの形を持つため、写しはここ 1 か所に置きます。
 * 上限は定率にだけ意味を持つため、定額では写しません。
 *
 * @param discount - 契約のクーポンの値引き
 * @returns 表示用の値引き
 */
export function toCouponDiscount(discount: WireCouponDiscount): CouponDiscount {
  return discount.kind === "flat"
    ? { kind: "flat", value: discount.value }
    : { kind: "rate", value: discount.value, maxAmount: discount.maxAmount };
}
