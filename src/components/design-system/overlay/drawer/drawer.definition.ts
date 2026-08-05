const TOP_DRAWER_DIRECTION = "top";
const BOTTOM_DRAWER_DIRECTION = "bottom";
const LEFT_DRAWER_DIRECTION = "left";
const RIGHT_DRAWER_DIRECTION = "right";

/**
 * Drawer が現れ、drag で閉じる方向を表す定数。
 *
 * @see Storybook `Overlay/Drawer`
 */
export const DRAWER_DIRECTION: Readonly<{
  TOP: "top";
  BOTTOM: "bottom";
  LEFT: "left";
  RIGHT: "right";
}> = {
  TOP: TOP_DRAWER_DIRECTION,
  BOTTOM: BOTTOM_DRAWER_DIRECTION,
  LEFT: LEFT_DRAWER_DIRECTION,
  RIGHT: RIGHT_DRAWER_DIRECTION,
};

/** {@link DRAWER_DIRECTION} のいずれか。 */
export type DrawerDirection = (typeof DRAWER_DIRECTION)[keyof typeof DRAWER_DIRECTION];
