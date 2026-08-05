const DEFAULT_AVATAR_SIZE = "default";
const SMALL_AVATAR_SIZE = "sm";
const LARGE_AVATAR_SIZE = "lg";

/**
 * Avatar の表示サイズを表す定数。
 *
 * @see Storybook `Display/Avatar`
 */
export const AVATAR_SIZE: Readonly<{
  DEFAULT: "default";
  SMALL: "sm";
  LARGE: "lg";
}> = {
  DEFAULT: DEFAULT_AVATAR_SIZE,
  SMALL: SMALL_AVATAR_SIZE,
  LARGE: LARGE_AVATAR_SIZE,
};

/** {@link AVATAR_SIZE} のいずれか。 */
export type AvatarSize = (typeof AVATAR_SIZE)[keyof typeof AVATAR_SIZE];
