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

/**
 * MIME 型に対する、利用者へ見せる呼び名。
 *
 * @remarks
 * 機械的に大文字化しないのは、形式の綴りが決まっているためです（`WebP` は `WEBP` ではない）。
 */
const IMAGE_TYPE_LABELS: Readonly<Record<string, string>> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
};

/**
 * 選べる形式を、利用者へ見せる並びにする。
 *
 * @remarks
 * 上の {@link PRODUCT_IMAGE_ACCEPT} から導きます。散文で書き並べると、受け付ける形式を足した
 * ときに直し漏れた画面だけが嘘をつきます。呼び名を持たない型はそのまま出します —— 表に足し
 * 忘れても、形式そのものが一覧から消えるよりは読めます。
 */
export const PRODUCT_IMAGE_ACCEPT_LABEL = PRODUCT_IMAGE_ACCEPT.split(",")
  .map((type) => IMAGE_TYPE_LABELS[type] ?? type)
  .join(" / ");
