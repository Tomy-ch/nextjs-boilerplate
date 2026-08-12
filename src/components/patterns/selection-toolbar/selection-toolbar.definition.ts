import {
  ACTION_BAR_POSITION,
  ACTION_BAR_POSITION_CLASS,
} from "../action-bar/action-bar.definition";

/**
 * 選択操作をどこに出すか。
 *
 * @see Storybook `Container/SelectionToolbar`
 */
export const SELECTION_TOOLBAR_POSITION: Readonly<{
  INLINE: "inline";
  STICKY: "sticky";
  FIXED: "fixed";
}> = {
  /** 一覧の流れの中に置く。 */
  INLINE: "inline",
  /** scroll 領域の下端に貼り付ける。 */
  STICKY: "sticky",
  /** viewport の下端に固定する。 */
  FIXED: "fixed",
};

/** {@link SELECTION_TOOLBAR_POSITION} のいずれか。 */
export type SelectionToolbarPosition =
  (typeof SELECTION_TOOLBAR_POSITION)[keyof typeof SELECTION_TOOLBAR_POSITION];

/**
 * 選択があるときだけ付ける見た目。
 *
 * 位置ごとの見た目は [`ActionBar`](../action-bar/action-bar.definition.ts) が単独で宣言する。同じ
 * 見た目を 2 か所で綴ると、重なり順や safe area の余白が片方だけ直る。
 */
export const SELECTION_TOOLBAR_POSITION_CLASS: Record<SelectionToolbarPosition, string> = {
  [SELECTION_TOOLBAR_POSITION.INLINE]: ACTION_BAR_POSITION_CLASS[ACTION_BAR_POSITION.INLINE],
  [SELECTION_TOOLBAR_POSITION.STICKY]: ACTION_BAR_POSITION_CLASS[ACTION_BAR_POSITION.STICKY],
  [SELECTION_TOOLBAR_POSITION.FIXED]: ACTION_BAR_POSITION_CLASS[ACTION_BAR_POSITION.FIXED],
};
