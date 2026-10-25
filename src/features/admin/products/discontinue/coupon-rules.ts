import {
  COUPON_VALIDITY_DAYS_MAX,
  COUPON_VALIDITY_DAYS_MIN,
} from "@/adapters/client/api/product-discontinue-limits";

/** 有効日数として読める綴り。符号も小数も持たない。 */
const VALIDITY_DAYS_SPELLING = /^\d+$/;

/** 有効日数が読めなかったときの文言。 */
export const COUPON_VALIDITY_DAYS_INVALID_MESSAGE = `有効日数は ${COUPON_VALIDITY_DAYS_MIN} から ${COUPON_VALIDITY_DAYS_MAX} までの整数で入力してください。`;

/**
 * 打たれた有効日数を、契約が受け付ける日数として読む。
 *
 * @remarks
 * 範囲は契約の宣言（{@link COUPON_VALIDITY_DAYS_MIN} から {@link COUPON_VALIDITY_DAYS_MAX}）で、
 * 画面が独自の上限を足しません。
 *
 * @param days - 打たれた日数
 * @returns 日数。読めないか範囲を外れていれば null
 */
export function toCouponValidityDays(days: string): number | null {
  if (!VALIDITY_DAYS_SPELLING.test(days)) {
    return null;
  }

  const value = Number(days);

  return value >= COUPON_VALIDITY_DAYS_MIN && value <= COUPON_VALIDITY_DAYS_MAX ? value : null;
}
