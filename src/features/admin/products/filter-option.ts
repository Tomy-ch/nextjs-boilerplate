/**
 * 絞り込みで選べる候補 1 件。
 *
 * @remarks
 * 「指定なし」を空文字の値で表します。選択肢の側が指定なしを持てば、外す操作は値を差し替える
 * だけで済み、キーを消す分岐を入力欄が持たずに済みます。
 *
 * 入力欄・overlay・効いている条件の表示が同じ候補を読むため、いずれの置き場でもない所に置きます。
 */
export type AdminProductFilterOption = {
  /** URL に載る値。「指定なし」は空文字。 */
  readonly value: string;
  /** 表示する文言。 */
  readonly label: string;
};

/**
 * マスタを選べる候補へ直す。
 *
 * @remarks
 * 値に `code` を使います。契約が絞り込みで受け取るのは UUID ではなくこの番号です。
 *
 * 先頭に「指定なし」を置きます。選択肢の側が指定なしを持てば、外す操作は値を差し替えるだけで
 * 済みます。
 *
 * 分類と状態のどちらも受けます。マスタ行が番号と表示名を持つという 1 点しか使っておらず、
 * 体系の違いはこの変換に現れません。
 *
 * @param masters - 番号と表示名を持つマスタ行
 * @param allLabel - 「指定なし」として出す文言
 */
export function toFilterOptions(
  masters: readonly { readonly code: number; readonly name: string }[],
  allLabel: string,
): readonly AdminProductFilterOption[] {
  return [
    { value: "", label: allLabel },
    ...masters.map(({ code, name }) => ({ value: String(code), label: name })),
  ];
}
