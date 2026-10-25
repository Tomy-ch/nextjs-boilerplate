import { postCampaignsBodyDiscountValueRegExp } from "../../gen/api/limits";

/**
 * 発行するクーポンの値引きの値が取れる綴り。符号の無い decimal 文字列。
 *
 * @remarks
 * **検証を持たない module に置きます。** 入力欄と story が要るのはこの形だけで、要求の検証スキーマは
 * 要りません。スキーマ一式を持つ module から取ると、定数を読む import がそれをブラウザの束へ
 * 載せます。
 *
 * クーポンを作る操作（キャンペーンの定義・個別発行・一括発行・廃番の代替クーポン）はどれも同じ
 * 綴りを宣言しています。代表としてキャンペーンの定義の値を出し、同じであることはテストが
 * 生成物と突き合わせて確かめます。
 *
 * 種別ごとの範囲（定率は 0 より大きく 1 以下など）は、契約が文章でしか宣言していないため
 * ここには含みません。
 */
export const COUPON_DISCOUNT_VALUE_PATTERN: RegExp = postCampaignsBodyDiscountValueRegExp;
