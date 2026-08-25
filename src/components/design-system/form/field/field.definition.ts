/**
 * 補足と誤りに与える `id` の綴り。
 *
 * @remarks
 * `id` を受け取るのは `FieldDescription` / `FieldError` で、それを `aria-describedby` から指すのは
 * 入力欄です。**綴りを決めているのは受け取る側の都合**なので、規約もその隣に置きます。
 *
 * 組み立てる側（`patterns/form-field`）へ置くと、素の `Field` を直接組む catalog や画面がここへ
 * 届かず、同じ綴りを手で書くことになります。層の向きは `patterns → design-system` の一方向なので、
 * 上へは引けません。
 */

/** 誤りの文言に与える `id`。入力欄の `aria-describedby` が指す。 */
export function toErrorId(controlId: string): string {
  return `${controlId}-error`;
}

/**
 * 入力の補足に与える `id`。入力欄の `aria-describedby` が指す。
 *
 * @remarks
 * 補足は**見えているだけでは足りません**。`aria-describedby` から指さないと、支援技術には
 * 項目名と入力欄しか届かず、単位や制約を読み上げから知る手段がなくなります。
 */
export function toDescriptionId(controlId: string): string {
  return `${controlId}-description`;
}
