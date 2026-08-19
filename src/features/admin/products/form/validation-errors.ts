import type { FormValidationError } from "@/components/app-starter/form-validation-summary/form-validation-summary";
import type { FieldErrors } from "@/model/action-state";

import type { ProductFormField } from "./form-state";

/**
 * 項目ごとの誤りを、要約が並べる形へ写す。
 *
 * @remarks
 * 要約の各項目は入力欄への link になるため、宛先の `id` が要ります。`id` は同じフォームを 2 度
 * 置いても衝突しないよう前置きつきで採番されるので、写す側も同じ前置きを使います。
 *
 * 並びは入力欄が並ぶ順です。誤った順・見つけた順に出すと、直しに行く順序が画面の並びと食い違い
 * ます。
 */
const FIELD_LABELS = {
  name: "商品名",
  price: "価格",
  quantity: "在庫数",
  stockWarningThreshold: "在庫警告の閾値",
  categoryId: "分類",
  description: "商品説明",
  images: "商品画像",
  statusId: "状態",
  publishedAt: "公開日時",
} as const satisfies Readonly<Record<ProductFormField, string>>;

/** 入力欄が並ぶ順。要約もこの順で出す。 */
const FIELD_ORDER = [
  "name",
  "price",
  "quantity",
  "stockWarningThreshold",
  "categoryId",
  "description",
  "images",
  "statusId",
  "publishedAt",
] as const satisfies readonly ProductFormField[];

/** 項目ごとの誤りを、要約が並べる形へ写す。 */
export function toValidationErrors(
  fieldErrors: FieldErrors<ProductFormField> | undefined,
  idPrefix: string,
): readonly FormValidationError[] {
  if (fieldErrors === undefined) return [];

  return FIELD_ORDER.flatMap((field) => {
    const message = fieldErrors[field]?.[0];

    if (message === undefined) return [];

    return [
      {
        fieldId: `${idPrefix}-${CONTROL_SUFFIXES[field]}`,
        message: `${FIELD_LABELS[field]}: ${message}`,
      },
    ];
  });
}

/**
 * 項目から入力欄の `id` の後ろ半分へ。
 *
 * @remarks
 * 送信時の名前とは別に持ちます。名前は契約の綴りに従い、`id` は kebab-case という別々の規則に
 * 従うためです（[0028](../../../../docs/adr/0028-naming-convention.md)）。
 */
const CONTROL_SUFFIXES = {
  name: "name",
  price: "price",
  quantity: "quantity",
  stockWarningThreshold: "stock-warning-threshold",
  categoryId: "category",
  description: "description",
  images: "images",
  statusId: "status",
  publishedAt: "published-at",
} as const satisfies Readonly<Record<ProductFormField, string>>;

/** 商品のフォームが持つ段。並び順がそのまま画面の並びになる。 */
export const PRODUCT_FORM_SECTIONS = ["basics", "description", "images", "publish"] as const;

/** 段の識別子。 */
export type ProductFormSection = (typeof PRODUCT_FORM_SECTIONS)[number];

/** どの項目がどの段にあるか。 */
const SECTION_OF_FIELD = {
  name: "basics",
  price: "basics",
  quantity: "basics",
  stockWarningThreshold: "basics",
  categoryId: "basics",
  description: "description",
  images: "images",
  statusId: "publish",
  publishedAt: "publish",
} as const satisfies Readonly<Record<ProductFormField, ProductFormSection>>;

/**
 * 誤りを含む最初の段を返す。無ければ undefined。
 *
 * @remarks
 * 段を切り替えられる器は、送信が弾かれたときにここへ移ります。誤りのある欄が隠れたままだと、
 * 画面のどこも赤くないのに送信だけが通らない状態になります。
 */
export function findFirstInvalidSection(
  fieldErrors: FieldErrors<ProductFormField> | undefined,
): ProductFormSection | undefined {
  if (fieldErrors === undefined) return undefined;

  for (const field of FIELD_ORDER) {
    if (fieldErrors[field] !== undefined) return SECTION_OF_FIELD[field];
  }

  return undefined;
}
