/**
 * 表の行の詰め方。
 *
 * @see Storybook `Container/TableViewOptions`
 */
export const TABLE_DENSITY: Readonly<{ COMFORTABLE: "comfortable"; COMPACT: "compact" }> = {
  /** 既定。読みやすさを優先する。 */
  COMFORTABLE: "comfortable",
  /** 一画面に入る行数を優先する。 */
  COMPACT: "compact",
};

/** {@link TABLE_DENSITY} のいずれか。 */
export type TableDensity = (typeof TABLE_DENSITY)[keyof typeof TABLE_DENSITY];

/**
 * 密度を `Table` へ適用する class。
 *
 * 高さと上下の余白だけを詰め、左右の余白と文字の大きさは変えない。横方向まで詰めると列の境目が
 * 読み取りにくくなり、文字を小さくすると本文の最小サイズを下回る。
 */
export const TABLE_DENSITY_CLASS: Record<TableDensity, string> = {
  [TABLE_DENSITY.COMFORTABLE]: "",
  [TABLE_DENSITY.COMPACT]:
    "[&_[data-slot=table-cell]]:py-1 [&_[data-slot=table-head]]:h-8 [&_[data-slot=table-head]]:py-1",
};

/**
 * 画面が狭いときに、その列を残すかどうかの優先度。
 *
 * @see Storybook `Container/TableViewOptions`
 */
export const TABLE_COLUMN_PRIORITY: Readonly<{ ALWAYS: "always"; MEDIUM: "medium"; LOW: "low" }> = {
  /** どの画面幅でも残す。対象を識別できる列に使う。 */
  ALWAYS: "always",
  /** 狭い画面では隠す。 */
  MEDIUM: "medium",
  /** 広い画面でだけ出す。 */
  LOW: "low",
};

/** {@link TABLE_COLUMN_PRIORITY} のいずれか。 */
export type TableColumnPriority =
  (typeof TABLE_COLUMN_PRIORITY)[keyof typeof TABLE_COLUMN_PRIORITY];

/**
 * 優先度を列の `TableHead` / `TableCell` へ適用する class。
 *
 * 表は横に伸びるため、狭い画面では列を減らすほうが横 scroll より読み取りやすい。どの列を残すかは
 * 画面幅ではなく「対象を識別できるか」で決めるので、優先度は画面幅ではなく意味で名付けている。
 */
export const TABLE_COLUMN_PRIORITY_CLASS: Record<TableColumnPriority, string> = {
  [TABLE_COLUMN_PRIORITY.ALWAYS]: "",
  [TABLE_COLUMN_PRIORITY.MEDIUM]: "hidden md:table-cell",
  [TABLE_COLUMN_PRIORITY.LOW]: "hidden lg:table-cell",
};

/**
 * 横 scroll しても左端に残す列へ適用する class。{@link TABLE_STICKY_ROW_CLASS} と対で使う。
 *
 * 背景は行から引き継ぐ。固定した cell は他の cell の上へ重なるため透明にはできないが、色を
 * 固定すると行の hover と選択中の色だけが固定列に乗らず、行が途中で切れて見える。
 *
 * `Table` は既に横 scroll する容器を持つため、呼び出し元は容器を足さない。
 */
export const TABLE_STICKY_COLUMN_CLASS = "sticky left-0 z-10 bg-inherit";

/**
 * 固定列を持つ表の行へ適用する class。
 *
 * 行は既定で背景を持たないため、これを当てないと {@link TABLE_STICKY_COLUMN_CLASS} が透明を
 * 引き継ぎ、横 scroll した内容が固定列を透ける。
 *
 * 選択中の色は不透明なのでそのまま一致する。hover の色は半透明なので、固定列だけ僅かに濃くなる。
 * 行の色が固定列に乗らないほうが行の切れ目として目立つため、この差は許容する。
 */
export const TABLE_STICKY_ROW_CLASS = "bg-background";
