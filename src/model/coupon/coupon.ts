import * as z from "zod/mini";

/**
 * クーポンの識別子を確定させるスキーマ。
 *
 * @remarks
 * 外へは出しません。確定させる口は {@link toCouponId} だけで、二重に入口を設けると境界の外でも
 * 通せてしまいます。
 */
const couponIdSchema = z.string().brand<"coupon">();

/**
 * クーポンを指す識別子。
 *
 * @remarks
 * 素の `string` を代入できない形にしてあります。クーポンの識別子も UUID の文字列で、商品や購入の
 * 識別子と取り違えても型では止まらないためです。
 */
export type CouponId = z.infer<typeof couponIdSchema>;

/**
 * 文字列をクーポンの識別子として確定させる。
 *
 * @remarks
 * **呼んでよいのは境界だけ**です。契約の応答を検証する `adapters` の出口と、識別子を送信として
 * 受け取る口が、それぞれ 1 度だけ通します。実在するかは検査しません。保有していない・使えない
 * 識別子を拒むのは、それを受け取る契約の側です。
 *
 * @param value - 確定させる文字列
 * @returns クーポンの識別子
 */
export function toCouponId(value: string): CouponId {
  return couponIdSchema.parse(value);
}

/**
 * クーポンの値引きの決まり方。
 *
 * @remarks
 * 2 つの種別は値の桁が違います。定額の `value` は価格と同じ主単位の decimal 文字列
 * （`"5.00"` が 5 ドル）、定率の `value` は掛ける率（`"0.10"` が 10% 引き）です。
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
 * 値引きと範囲は、購入の時点の控えではなく、取得の時点で解決した現在値です。
 */
export type AppliedCoupon = {
  readonly discount: CouponDiscount;
  readonly scopeKind: CouponScopeKind;
};

/**
 * 利用者が保有するクーポン 1 枚。
 *
 * @remarks
 * 使用済み・失効済みも含む「持っているもの」です。使えるかどうかの状態は持たず、3 つの時刻を
 * 現在時刻と突き合わせて決めます。失効を一括で書き換える仕組みが契約側に無いためです。
 */
export type HeldCoupon = {
  readonly id: CouponId;
  readonly discount: CouponDiscount;
  readonly scopeKind: CouponScopeKind;
  /** 使うために要る購入額の下限。最小単位の整数。条件が無ければ `null`。 */
  readonly minPurchaseAmount: number | null;
  /** 使えるようになる時刻。この時刻ちょうどから使える。発行時点から使えるなら `null`。 */
  readonly usableFrom: Date | null;
  /** 有効期限。この時刻ちょうどから失効として扱う。 */
  readonly expiresAt: Date;
  /** 使った時刻。未使用なら `null`。 */
  readonly usedAt: Date | null;
};

/**
 * いまのカートに対して使えるクーポン 1 枚と、それを適用した場合の値引き額。
 *
 * @remarks
 * 値引き額はバックエンドが購入の確定と同じ規則で求めた値で、画面は額面から計算し直しません。
 * ロックを取らないため、確定時に実際に引かれる額と一致する保証はありません。
 */
export type CartCoupon = {
  readonly id: CouponId;
  readonly discount: CouponDiscount;
  readonly scopeKind: CouponScopeKind;
  /** 適用した場合に差し引かれる額。最小単位の整数。 */
  readonly discountAmount: number;
  /** 失効する日時の ISO 文字列。この時刻ちょうどを含めて以降は使えない。 */
  readonly expiresAt: string;
};
