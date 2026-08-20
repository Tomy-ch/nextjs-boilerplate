import { PRODUCT_NAME_MAX_LENGTH, PRODUCT_PRICE_PATTERN } from "./field-limits";
import type { ProductFormField } from "./form-state";

/**
 * 入力 1 項目の判定。
 *
 * @remarks
 * **送る側と受ける側の両方がここを通ります。** 画面は送る前に、Server Action は受け取った後に
 * 同じ規則を当てます。文言まで一箇所に置くのは、同じ誤りに対して 2 通りの言い方が現れるのを
 * 防ぐためです。
 *
 * ここで判定するのは形だけです。実在するか・業務として妥当かはバックエンドが決めます
 * （[0062](../../../../docs/adr/0062-form-input-validation.md)）。
 */
export type ProductFieldRule = (value: string) => string | undefined;

/** 空欄を undefined として扱う。 */
function isBlank(value: string): boolean {
  return value.trim() === "";
}

/** 商品名。 */
export const validateName: ProductFieldRule = (value) => {
  if (isBlank(value)) return "商品名を入力してください。";
  if (value.trim().length > PRODUCT_NAME_MAX_LENGTH) {
    return `商品名は ${PRODUCT_NAME_MAX_LENGTH} 文字までです。`;
  }

  return undefined;
};

/** 価格。 */
export const validatePrice: ProductFieldRule = (value) => {
  if (isBlank(value)) return "価格を入力してください。";
  if (!PRODUCT_PRICE_PATTERN.test(value.trim())) {
    return "価格は 0 以上の数値で入力してください。";
  }

  return undefined;
};

/** 0 以上の整数として読めるか。 */
function isNonNegativeInteger(value: string): boolean {
  const parsed = Number(value.trim());

  return Number.isInteger(parsed) && parsed >= 0;
}

/** 在庫数。作るときだけ尋ねる。 */
export const validateQuantity: ProductFieldRule = (value) => {
  if (isBlank(value)) return "在庫数を入力してください。";
  if (!isNonNegativeInteger(value)) return "在庫数は 0 以上の整数で入力してください。";

  return undefined;
};

/** 在庫警告の閾値。空欄を許す。 */
export const validateStockWarningThreshold: ProductFieldRule = (value) => {
  if (isBlank(value)) return undefined;
  if (!isNonNegativeInteger(value)) return "在庫警告の閾値は 0 以上の整数で入力してください。";

  return undefined;
};

/** 分類。 */
export const validateCategoryId: ProductFieldRule = (value) =>
  isBlank(value) ? "分類を選んでください。" : undefined;

/** 状態。 */
export const validateStatusId: ProductFieldRule = (value) =>
  isBlank(value) ? "状態を選んでください。" : undefined;

/** 公開日時。空欄を許す。 */
export const validatePublishedAt: ProductFieldRule = (value) => {
  if (isBlank(value)) return undefined;

  return Number.isNaN(new Date(value).getTime())
    ? "公開日時を日付として読み取れませんでした。"
    : undefined;
};

/** 項目ごとの判定。ここに無い項目は形の上での判定を持たない。 */
export const PRODUCT_FIELD_RULES = {
  name: validateName,
  price: validatePrice,
  quantity: validateQuantity,
  stockWarningThreshold: validateStockWarningThreshold,
  categoryId: validateCategoryId,
  statusId: validateStatusId,
  publishedAt: validatePublishedAt,
} as const satisfies Partial<Record<ProductFormField, ProductFieldRule>>;

/** 形の上で判定を持つ項目。 */
export type ProductValidatedField = keyof typeof PRODUCT_FIELD_RULES;
