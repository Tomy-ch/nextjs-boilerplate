import {
  COUPON_DISCOUNT_RATE_PATTERN,
  COUPON_VALIDITY_DAYS_MAX,
  COUPON_VALIDITY_DAYS_MIN,
} from "@/adapters/client/api/product-discontinue-limits";

/** 小数点を左へずらす桁数。百分率を乗数へ写すため 2 桁。 */
const PERCENT_SHIFT = 2;

/** 有効日数として読める綴り。符号も小数も持たない。 */
const VALIDITY_DAYS_SPELLING = /^\d+$/;

/** 値引き率が読めなかったときの文言。 */
export const COUPON_DISCOUNT_RATE_INVALID_MESSAGE =
  "値引き率は 10 や 12.5 のように、% を付けない数で入力してください。";

/** 有効日数が読めなかったときの文言。 */
export const COUPON_VALIDITY_DAYS_INVALID_MESSAGE = `有効日数は ${COUPON_VALIDITY_DAYS_MIN} から ${COUPON_VALIDITY_DAYS_MAX} までの整数で入力してください。`;

/**
 * 百分率で打たれた値引き率を、契約が受け付ける乗数の decimal 文字列へ写す。
 *
 * @remarks
 * **数へ変換しません。** 小数点の位置を文字列のまま 2 桁左へずらします。数を経由すると、打った桁が
 * 浮動小数の表現に丸められて別の値として届きます。
 *
 * 綴りは契約の形と同じ規則で先に照らします（前後の空白・符号・指数・全角数字は読めません）。
 * 0 より大きく 1 以下という範囲は照らしません。契約が文章でしか宣言しておらず、範囲を外れた値は
 * 送った先が拒みます。
 *
 * @example
 * ```ts
 * import { toCouponDiscountRate } from "@/features/admin/products/discontinue/coupon-rules";
 *
 * toCouponDiscountRate("10"); // "0.10"
 * toCouponDiscountRate("12.5"); // "0.125"
 * toCouponDiscountRate("100"); // "1.00"
 * toCouponDiscountRate("5"); // "0.05"
 * toCouponDiscountRate("10%"); // null
 * ```
 *
 * @param percent - 打たれた百分率
 * @returns 乗数の decimal 文字列。綴りが読めなければ null
 */
export function toCouponDiscountRate(percent: string): string | null {
  if (!COUPON_DISCOUNT_RATE_PATTERN.test(percent)) {
    return null;
  }

  const [integer = "", fraction = ""] = percent.split(".");
  const padded = integer.padStart(PERCENT_SHIFT + 1, "0");
  const head = padded.slice(0, -PERCENT_SHIFT).replace(/^0+(?=\d)/, "");
  const tail = `${padded.slice(-PERCENT_SHIFT)}${fraction}`;

  return `${head}.${tail}`;
}

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
