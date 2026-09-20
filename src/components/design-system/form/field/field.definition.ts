/**
 * 誤りの文言に与える `id`。入力欄の `aria-describedby` が指す。
 *
 * @param controlId - 入力欄の `id`。
 * @returns 誤りの文言へ与える `id`。
 */
export function toErrorId(controlId: string): string {
  return `${controlId}-error`;
}

/**
 * 入力の補足に与える `id`。入力欄の `aria-describedby` が指す。
 *
 * @remarks
 * 補足は**見えているだけでは足りません**。`aria-describedby` から指さないと、支援技術には
 * 項目名と入力欄しか届かず、単位や制約を読み上げから知る手段がなくなります。
 *
 * @param controlId - 入力欄の `id`。
 * @returns 補足へ与える `id`。
 */
export function toDescriptionId(controlId: string): string {
  return `${controlId}-description`;
}
