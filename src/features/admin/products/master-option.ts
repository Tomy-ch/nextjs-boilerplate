import type { ProductSelectOption } from "./ui/select-field/select-field";

/**
 * マスタを、フォームで選べる候補へ直す。
 *
 * @remarks
 * 値に UUID を使います。作成・更新の契約が受け取るのは番号ではなく識別子で、絞り込みが番号を
 * 使うのとは別の要求です（同じ表を読んでいても、送る値が違います）。
 *
 * 「指定なし」を先頭へ置きません。分類も状態も**選ばなければ送れない**項目で、外す操作を持ち
 * ません。空の候補は選択欄の側が「選んでください」として持ちます。
 */
export function toMasterOptions(
  masters: readonly { readonly id: string; readonly name: string }[],
): readonly ProductSelectOption[] {
  return masters.map(({ id, name }) => ({ value: id, label: name }));
}
