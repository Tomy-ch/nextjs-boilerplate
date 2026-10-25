import * as z from "zod/mini";

import type { CouponScopeKind, CouponScopeTarget } from "@/model/coupon/coupon";
import { toProductCategoryId, toProductId } from "@/model/product/product";

/** 範囲の入力欄の名前。送る側と読む側が同じ綴りを見る。 */
export const COUPON_SCOPE_FORM_NAMES = {
  /** 範囲の決まり方。 */
  kind: "scopeKind",
  /** 範囲を絞るカテゴリ。 */
  categoryId: "scopeCategoryId",
  /** 範囲を絞る商品。 */
  productId: "scopeProductId",
} as const;

/** 範囲の入力欄のうち、入力した人が直せる項目。 */
export type CouponScopeField =
  (typeof COUPON_SCOPE_FORM_NAMES)[keyof typeof COUPON_SCOPE_FORM_NAMES];

/**
 * 範囲として選ばれている値。種別は選ぶまで空。
 *
 * @remarks
 * 商品の名前は送りません。選んだ商品を、候補が入れ替わった後も名前で示し続けるために持ちます。
 */
export type CouponScopeValues = {
  readonly kind: "" | CouponScopeKind;
  readonly categoryId: string;
  readonly productId: string;
  readonly productName: string;
};

/** まだ何も選んでいない範囲。既定値を置かない。 */
export const EMPTY_COUPON_SCOPE_VALUES: CouponScopeValues = {
  kind: "",
  categoryId: "",
  productId: "",
  productName: "",
};

/** 範囲の種別が選ばれていないときの文言。 */
export const COUPON_SCOPE_KIND_MISSING_MESSAGE = "値引きの対象を選んでください。";

/** カテゴリが選ばれていないときの文言。 */
export const COUPON_SCOPE_CATEGORY_MISSING_MESSAGE = "対象のカテゴリを選んでください。";

/** 商品が選ばれていないときの文言。 */
export const COUPON_SCOPE_PRODUCT_MISSING_MESSAGE = "対象の商品を選んでください。";

/** 識別子として読める綴り。 */
const IDENTIFIER = z.uuid();

/** 選ばれた範囲を読んだ結果。 */
export type CouponScopeReading =
  | { readonly ok: true; readonly scope: CouponScopeTarget }
  | {
      readonly ok: false;
      readonly errors: Readonly<Partial<Record<CouponScopeField, string>>>;
    };

/**
 * 選ばれた範囲を、契約が受け付ける範囲として読む。
 *
 * @remarks
 * 送る前の判定と、送られてきた値の読み取りが同じこの関数を通ります。
 *
 * **対象が存在するかは確かめません。** 候補は画面が取得した一覧から選ばせており、その一覧が
 * 存在の証拠です。識別子として読めない値は選び損ねと同じく扱います。
 *
 * @param values - 選ばれている値
 * @returns 読めた範囲。読めなければ項目ごとの文言
 */
export function toCouponScope(values: CouponScopeValues): CouponScopeReading {
  switch (values.kind) {
    case "":
      return {
        ok: false,
        errors: { [COUPON_SCOPE_FORM_NAMES.kind]: COUPON_SCOPE_KIND_MISSING_MESSAGE },
      };
    case "all":
      return { ok: true, scope: { kind: "all" } };
    case "category":
      return IDENTIFIER.safeParse(values.categoryId).success
        ? {
            ok: true,
            scope: { kind: "category", categoryId: toProductCategoryId(values.categoryId) },
          }
        : {
            ok: false,
            errors: { [COUPON_SCOPE_FORM_NAMES.categoryId]: COUPON_SCOPE_CATEGORY_MISSING_MESSAGE },
          };
    case "product":
      return IDENTIFIER.safeParse(values.productId).success
        ? { ok: true, scope: { kind: "product", productId: toProductId(values.productId) } }
        : {
            ok: false,
            errors: { [COUPON_SCOPE_FORM_NAMES.productId]: COUPON_SCOPE_PRODUCT_MISSING_MESSAGE },
          };
  }
}

/**
 * 送信された値を文字列として取り出す。
 *
 * @param formData - 送信された form の値
 * @param name - 項目の名前
 * @returns 文字列の値。載っていないかファイルなら空文字
 */
function textOf(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * 送られてきた form から、範囲として選ばれていた値を取り出す。
 *
 * @param formData - 送信された form の値
 * @returns 選ばれていた値。種別が読めなければ空
 */
export function readCouponScopeValues(formData: FormData): CouponScopeValues {
  const kind = textOf(formData, COUPON_SCOPE_FORM_NAMES.kind);

  return {
    kind: kind === "all" || kind === "category" || kind === "product" ? kind : "",
    categoryId: textOf(formData, COUPON_SCOPE_FORM_NAMES.categoryId),
    productId: textOf(formData, COUPON_SCOPE_FORM_NAMES.productId),
    productName: "",
  };
}
