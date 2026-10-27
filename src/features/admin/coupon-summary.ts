import { COUPON_SCOPE_NAME } from "@/model/coupon/coupon";

import { COUPON_DISCOUNT_FORM_NAMES, type CouponDiscountValues } from "./coupon-discount";
import { COUPON_SCOPE_FORM_NAMES, type CouponScopeValues } from "./coupon-scope";

/**
 * `datetime-local` の壁時計の値を、読むための綴りへ直す。
 *
 * @param wallClock - `datetime-local` の値
 * @returns `2026/10/01 10:00` の形。空なら空
 */
export function readableWallClock(wallClock: string): string {
  return wallClock.replace(/^(\d{4})-(\d{2})-(\d{2})T/, "$1/$2/$3 ");
}

/**
 * 値引きと範囲について、送る項目と値を並べる。
 *
 * @remarks
 * **種別に応じて要らない項目は載せません。** 定額の上限や、全体の範囲の対象は、欄が隠れていても
 * 画面は値を持ち続けます。載せると、見えていない値が送られます。
 *
 * @param discount - 打たれた値引き
 * @param scope - 選ばれた範囲
 * @returns 送る項目と値
 */
export function couponFieldsOf(
  discount: CouponDiscountValues,
  scope: CouponScopeValues,
): readonly (readonly [name: string, value: string])[] {
  const fields: (readonly [string, string])[] = [
    [COUPON_DISCOUNT_FORM_NAMES.kind, discount.kind],
    [COUPON_DISCOUNT_FORM_NAMES.value, discount.value],
    [COUPON_SCOPE_FORM_NAMES.kind, scope.kind],
  ];

  if (discount.kind === "rate") {
    fields.push([COUPON_DISCOUNT_FORM_NAMES.maxAmount, discount.maxAmount]);
  }

  if (scope.kind === "category") {
    fields.push([COUPON_SCOPE_FORM_NAMES.categoryId, scope.categoryId]);
  }

  if (scope.kind === "product") {
    fields.push([COUPON_SCOPE_FORM_NAMES.productId, scope.productId]);
  }

  return fields;
}

/**
 * 値引きを、確認で読む文に直す。
 *
 * @param discount - 打たれた値引き
 * @returns 復唱の文
 */
export function discountDetail(discount: CouponDiscountValues): string {
  if (discount.kind === "flat") {
    return `${discount.value} ドル引き`;
  }

  return discount.maxAmount === ""
    ? `${discount.value}% 引き`
    : `${discount.value}% 引き（1 回 ${discount.maxAmount} ドルまで）`;
}

/**
 * 範囲を、確認で読む文に直す。
 *
 * @param scope - 選ばれた範囲
 * @param categoryName - 選ばれたカテゴリの名前。カテゴリでなければ使わない
 * @returns 復唱の文
 */
export function scopeDetail(scope: CouponScopeValues, categoryName: string): string {
  switch (scope.kind) {
    case "category":
      return `${COUPON_SCOPE_NAME.category}：${categoryName}`;
    case "product":
      return `${COUPON_SCOPE_NAME.product}：${scope.productName}`;
    default:
      return COUPON_SCOPE_NAME.all;
  }
}
