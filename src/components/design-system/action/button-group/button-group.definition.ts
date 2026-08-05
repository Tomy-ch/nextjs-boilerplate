const HORIZONTAL_BUTTON_GROUP_ORIENTATION = "horizontal";
const VERTICAL_BUTTON_GROUP_ORIENTATION = "vertical";

/**
 * ButtonGroup が操作を並べる向きの定数。
 *
 * `horizontal` は左右に並べ、隣り合う辺の角丸と境界を横方向で繋ぐ。`vertical` は上下に積み、
 * 同じことを縦方向で行う。狭い画面で横に収まらない操作群は `vertical` を選ぶ。
 *
 * @see Storybook `Action/ButtonGroup`
 */
export const BUTTON_GROUP_ORIENTATION: Readonly<{
  HORIZONTAL: "horizontal";
  VERTICAL: "vertical";
}> = {
  HORIZONTAL: HORIZONTAL_BUTTON_GROUP_ORIENTATION,
  VERTICAL: VERTICAL_BUTTON_GROUP_ORIENTATION,
};

/** {@link BUTTON_GROUP_ORIENTATION} のいずれか。 */
export type ButtonGroupOrientation =
  (typeof BUTTON_GROUP_ORIENTATION)[keyof typeof BUTTON_GROUP_ORIENTATION];
