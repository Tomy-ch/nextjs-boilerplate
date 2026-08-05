const TOP_SHEET_SIDE = "top";
const RIGHT_SHEET_SIDE = "right";
const BOTTOM_SHEET_SIDE = "bottom";
const LEFT_SHEET_SIDE = "left";

/**
 * Sheet が画面のどの端から現れ、どの端へ固定されるかを表す定数。
 *
 * @see Storybook `Overlay/Sheet`
 */
export const SHEET_SIDE: Readonly<{
  TOP: "top";
  RIGHT: "right";
  BOTTOM: "bottom";
  LEFT: "left";
}> = {
  TOP: TOP_SHEET_SIDE,
  RIGHT: RIGHT_SHEET_SIDE,
  BOTTOM: BOTTOM_SHEET_SIDE,
  LEFT: LEFT_SHEET_SIDE,
};

/** {@link SHEET_SIDE} のいずれか。 */
export type SheetSide = (typeof SHEET_SIDE)[keyof typeof SHEET_SIDE];
