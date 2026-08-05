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
 * `sticky` / `fixed` は内容の上へ重なるため、背景は必ず不透明にする。`bg-muted` のような
 * 面の色ではなく `bg-background` を使い、上辺の border だけで一覧と切り分ける。
 *
 * `fixed` の `z-40` は overlay（`z-50`）より下、一覧の中の重なりより上に置くための値である。
 * 下端の余白は iOS のホームバーを避けるため safe area と比較して大きいほうを採る。
 */
export const SELECTION_TOOLBAR_POSITION_CLASS: Record<SelectionToolbarPosition, string> = {
  [SELECTION_TOOLBAR_POSITION.INLINE]: "rounded-md border border-border bg-muted px-3 py-2",
  [SELECTION_TOOLBAR_POSITION.STICKY]:
    "sticky bottom-0 z-10 border-t border-border bg-background px-3 py-2",
  [SELECTION_TOOLBAR_POSITION.FIXED]:
    "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-3 pt-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))]",
};
