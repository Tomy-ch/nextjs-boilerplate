/**
 * 商品名に許される長さ。
 *
 * @remarks
 * 契約が課す上限です。ここで止めるのは、超えた入力が往復してから 422 で返るのを待たせないため
 * だけで、**判定の正は backend にあります**（[0062](../../../../../docs/adr/0062-form-input-validation.md)）。
 */
export const PRODUCT_NAME_MAX_LENGTH = 255;

/**
 * 価格として受け付ける形。
 *
 * @remarks
 * 小数を含む十進の文字列です。数値へ変換しないのは、丸めるとサブセントの精度が落ちるためで、
 * 送るときも文字列のまま運びます。
 */
export const PRODUCT_PRICE_PATTERN = /^\d+(\.\d+)?$/;

/** 画像として選べる形式。 */
export const PRODUCT_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
