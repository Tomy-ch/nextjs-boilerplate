import type { AdminSelectOption } from "./ui/select-field/select-field";

/**
 * マスタを、フォームで選べる候補へ直す。
 *
 * @remarks
 * 値に UUID を使います。作成・更新の契約が受け取るのは番号ではなく識別子で、絞り込みが番号を
 * 使うのとは別の要求です（同じ表を読んでいても、送る値が違います）。
 *
 * 「指定なし」を先頭へ置きません。この候補を使う項目は**選ばなければ送れない**ので、外す操作を
 * 持ちません。空の候補は選択欄の側が「選んでください」として持ちます。
 *
 * @param masters - 直す前のマスタの一覧
 * @returns フォームで選べる候補の一覧
 */
export function toMasterOptions(
  masters: readonly { readonly id: string; readonly name: string }[],
): readonly AdminSelectOption[] {
  return masters.map(({ id, name }) => ({ value: id, label: name }));
}
