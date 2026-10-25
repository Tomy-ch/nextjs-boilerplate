import { postProductsDiscontinueBodyCouponValidityDaysMax } from "../../gen/api/limits";

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
