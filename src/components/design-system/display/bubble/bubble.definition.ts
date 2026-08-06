const DEFAULT_BUBBLE_VARIANT = "default";
const SECONDARY_BUBBLE_VARIANT = "secondary";
const MUTED_BUBBLE_VARIANT = "muted";
const TINTED_BUBBLE_VARIANT = "tinted";
const OUTLINE_BUBBLE_VARIANT = "outline";
const GHOST_BUBBLE_VARIANT = "ghost";
const DESTRUCTIVE_BUBBLE_VARIANT = "destructive";
const START_BUBBLE_ALIGN = "start";
const END_BUBBLE_ALIGN = "end";
const TOP_BUBBLE_REACTIONS_SIDE = "top";
const BOTTOM_BUBBLE_REACTIONS_SIDE = "bottom";

/**
 * 吹き出しの面の見せ方を表す定数。
 *
 * @see Storybook `Display/Bubble`
 */
export const BUBBLE_VARIANT: Readonly<{
  DEFAULT: "default";
  SECONDARY: "secondary";
  MUTED: "muted";
  TINTED: "tinted";
  OUTLINE: "outline";
  GHOST: "ghost";
  DESTRUCTIVE: "destructive";
}> = {
  DEFAULT: DEFAULT_BUBBLE_VARIANT,
  SECONDARY: SECONDARY_BUBBLE_VARIANT,
  MUTED: MUTED_BUBBLE_VARIANT,
  TINTED: TINTED_BUBBLE_VARIANT,
  OUTLINE: OUTLINE_BUBBLE_VARIANT,
  GHOST: GHOST_BUBBLE_VARIANT,
  DESTRUCTIVE: DESTRUCTIVE_BUBBLE_VARIANT,
};

/**
 * 吹き出しを寄せる向きを表す定数。
 *
 * @see Storybook `Display/Bubble`
 */
export const BUBBLE_ALIGN: Readonly<{
  START: "start";
  END: "end";
}> = {
  START: START_BUBBLE_ALIGN,
  END: END_BUBBLE_ALIGN,
};

/**
 * 反応を吹き出しのどちらの縁へ重ねるかを表す定数。
 *
 * @see Storybook `Display/Bubble`
 */
export const BUBBLE_REACTIONS_SIDE: Readonly<{
  TOP: "top";
  BOTTOM: "bottom";
}> = {
  TOP: TOP_BUBBLE_REACTIONS_SIDE,
  BOTTOM: BOTTOM_BUBBLE_REACTIONS_SIDE,
};

/** {@link BUBBLE_VARIANT} のいずれか。 */
export type BubbleVariant = (typeof BUBBLE_VARIANT)[keyof typeof BUBBLE_VARIANT];

/** {@link BUBBLE_ALIGN} のいずれか。 */
export type BubbleAlign = (typeof BUBBLE_ALIGN)[keyof typeof BUBBLE_ALIGN];

/** {@link BUBBLE_REACTIONS_SIDE} のいずれか。 */
export type BubbleReactionsSide =
  (typeof BUBBLE_REACTIONS_SIDE)[keyof typeof BUBBLE_REACTIONS_SIDE];
