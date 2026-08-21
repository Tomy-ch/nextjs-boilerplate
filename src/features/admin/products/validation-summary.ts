import type { FormValidationError } from "@/components/app-starter/form-validation-summary/form-validation-summary";
import type { FieldErrors } from "@/model/action-state";

import { controlIdOf, PRODUCT_FIELD_ORDER } from "./form-sections";
import type { ProductFormField } from "./form-state";

/** 要約に出す項目の呼び名。 */
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

/**
 * 項目ごとの誤りを、要約が並べる形へ写す。
 *
 * @remarks
 * 要約の各項目は入力欄への link になるため、宛先の `id` が要ります。`id` は同じフォームを 2 度
 * 置いても衝突しないよう前置きつきで採番されるので、写す側も同じ前置きを使います。
 */
export function toValidationErrors(
  fieldErrors: FieldErrors<ProductFormField> | undefined,
  idPrefix: string,
): readonly FormValidationError[] {
  if (fieldErrors === undefined) return [];

  return PRODUCT_FIELD_ORDER.flatMap((field) => {
    const message = fieldErrors[field]?.[0];

    if (message === undefined) return [];

    return [
      {
        fieldId: controlIdOf(idPrefix, field),
        message: `${FIELD_LABELS[field]}: ${message}`,
      },
    ];
  });
}
