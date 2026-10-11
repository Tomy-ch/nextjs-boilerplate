/**
 * クーポンの値引きの決まり方。
 *
 * @remarks
 * 2 つの種別は値の桁が違います。定額の `value` は価格と同じ主単位の decimal 文字列
 * （`"5.00"` が 5 ドル）、定率の `value` は掛ける率（`"0.10"` が 10% 引き）です。
 * 上限は定率だけが持つため、種別ごとに形を分けています。
 */
export type CouponDiscount =
  | {
      readonly kind: "flat";
      /** 差し引く金額。基準通貨の主単位の decimal 文字列。 */
      readonly value: string;
    }
  | {
      readonly kind: "rate";
      /** 対象額に掛ける率の decimal 文字列。 */
      readonly value: string;
      /** 1 回に引ける額の上限。最小単位の整数。上限が無ければ `null`。 */
      readonly maxAmount: number | null;
    };

/**
 * クーポンが値引きの対象にする範囲の決まり方。
 *
 * @remarks
 * 範囲を絞る対象（カテゴリや商品）は識別子しか届かず、名前を持たないため、表示には種別だけを
 * 使います。
 */
export type CouponScopeKind = "all" | "category" | "product";

/** 範囲の種別ごとの呼び名。 */
export const COUPON_SCOPE_NAME: Readonly<Record<CouponScopeKind, string>> = {
  all: "全商品",
  category: "特定のカテゴリ",
  product: "特定の商品",
};

/**
 * 購入に適用したクーポン。
 *
 * @remarks
 * 値引きと範囲は、購入の時点の控えではなく、取得の時点で解決した現在値です。発行済みの
 * クーポンの値引きと範囲を書き換える口が無いため、購入の時点と食い違いません。
 */
export type AppliedCoupon = {
  readonly discount: CouponDiscount;
  readonly scopeKind: CouponScopeKind;
};
