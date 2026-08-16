/** フォームが対象の商品を指すときの項目名。 */
const PRODUCT_ID_FIELD = "productId";

/** フォームが数量を指すときの項目名。 */
const QUANTITY_FIELD = "quantity";

/**
 * 送信された内容から商品を指す値を取り出す。
 *
 * @returns 値が無い、または文字列でなければ null
 */
export function readProductId(formData: FormData): string | null {
  const value = formData.get(PRODUCT_ID_FIELD);

  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * 送信された内容から数量を取り出す。
 *
 * @remarks
 * 取り出せる形かどうかだけを見ます。受け付ける範囲を決めているのは契約であり、範囲外の数量は
 * バックエンドが拒みます（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * @returns 整数として読めなければ null
 */
export function readQuantity(formData: FormData): number | null {
  const value = Number(formData.get(QUANTITY_FIELD));

  return Number.isInteger(value) ? value : null;
}
