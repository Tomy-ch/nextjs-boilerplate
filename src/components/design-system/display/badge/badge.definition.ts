const DEFAULT_BADGE_VARIANT = "default";
const SECONDARY_BADGE_VARIANT = "secondary";
const SUCCESS_BADGE_VARIANT = "success";
const DESTRUCTIVE_BADGE_VARIANT = "destructive";
const WARNING_BADGE_VARIANT = "warning";
const OUTLINE_BADGE_VARIANT = "outline";
const GHOST_BADGE_VARIANT = "ghost";
const LINK_BADGE_VARIANT = "link";

/**
 * Badge の視覚的な優先度を表す定数。
 *
 * @see Storybook `Display/Badge`
 */
export const BADGE_VARIANT: Readonly<{
  DEFAULT: "default";
  SECONDARY: "secondary";
  SUCCESS: "success";
  DESTRUCTIVE: "destructive";
  WARNING: "warning";
  OUTLINE: "outline";
  GHOST: "ghost";
  LINK: "link";
}> = {
  DEFAULT: DEFAULT_BADGE_VARIANT,
  SECONDARY: SECONDARY_BADGE_VARIANT,
  SUCCESS: SUCCESS_BADGE_VARIANT,
  DESTRUCTIVE: DESTRUCTIVE_BADGE_VARIANT,
  WARNING: WARNING_BADGE_VARIANT,
  OUTLINE: OUTLINE_BADGE_VARIANT,
  GHOST: GHOST_BADGE_VARIANT,
  LINK: LINK_BADGE_VARIANT,
};

/** {@link BADGE_VARIANT} のいずれか。 */
export type BadgeVariant = (typeof BADGE_VARIANT)[keyof typeof BADGE_VARIANT];
