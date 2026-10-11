import {
  postProductsDiscontinueBodyCouponDiscountRateRegExp,
  postProductsDiscontinueBodyCouponValidityDaysMax,
} from "../../gen/api/limits";

/**
 * 代替クーポンの値引き率が取れる綴り。符号の無い decimal 文字列。
 *
 * @remarks
 * **検証を持たない module に置きます。** 入力欄と story はこの形と数だけを要り、要求の検証
 * スキーマは要りません。スキーマ一式を持つ module から取ると、定数を読む import がそれを
 * ブラウザの束へ載せます。
 *
 * 0 より大きく 1 以下という範囲は、契約が文章でしか宣言していないためここには含みません。
 */
export const COUPON_DISCOUNT_RATE_PATTERN: RegExp =
  postProductsDiscontinueBodyCouponDiscountRateRegExp;

/**
 * 代替クーポンの有効日数の下限。
 *
 * @remarks
 * 契約は下限を宣言していますが、生成物が定数として出していないためここで宣言します。宣言が
 * 契約と食い違っていないことはテストが生成スキーマと突き合わせて確かめます。
 */
export const COUPON_VALIDITY_DAYS_MIN = 1;

/** 代替クーポンの有効日数の上限。契約から生成した値をそのまま出す。 */
export const COUPON_VALIDITY_DAYS_MAX: number = postProductsDiscontinueBodyCouponValidityDaysMax;
