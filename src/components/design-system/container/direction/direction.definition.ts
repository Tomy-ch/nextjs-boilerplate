const LTR_DIRECTION = "ltr";
const RTL_DIRECTION = "rtl";

/**
 * 文字を並べる向きを表す定数。
 *
 * @see Storybook `Container/Direction`
 */
export const DIRECTION: Readonly<{
  LTR: "ltr";
  RTL: "rtl";
}> = {
  LTR: LTR_DIRECTION,
  RTL: RTL_DIRECTION,
};

/** {@link DIRECTION} のいずれか。 */
export type DirectionValue = (typeof DIRECTION)[keyof typeof DIRECTION];
