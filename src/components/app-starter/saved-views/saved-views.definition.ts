const CREATE_SAVED_VIEWS_DIALOG = "create";
const RENAME_SAVED_VIEWS_DIALOG = "rename";
const DELETE_SAVED_VIEWS_DIALOG = "delete";

/**
 * SavedViews が開く dialog の種類を表す定数。
 *
 * `CREATE` はいまの条件へ名前を付けて保存する入力、`RENAME` は選択中の条件の名前を書き換える
 * 入力、`DELETE` は選択中の条件を消す確認である。3 つは同時に開かない。
 *
 * @see Storybook `Container/SavedViews`
 */
export const SAVED_VIEWS_DIALOG: Readonly<{
  CREATE: "create";
  RENAME: "rename";
  DELETE: "delete";
}> = {
  CREATE: CREATE_SAVED_VIEWS_DIALOG,
  RENAME: RENAME_SAVED_VIEWS_DIALOG,
  DELETE: DELETE_SAVED_VIEWS_DIALOG,
};

/** {@link SAVED_VIEWS_DIALOG} のいずれか。 */
export type SavedViewsDialog = (typeof SAVED_VIEWS_DIALOG)[keyof typeof SAVED_VIEWS_DIALOG];
