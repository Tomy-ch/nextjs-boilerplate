const DEFAULT_MARKER_VARIANT = "default";
const SEPARATOR_MARKER_VARIANT = "separator";
const BORDER_MARKER_VARIANT = "border";

/**
 * Marker と周囲の内容をどう区切って見せるかを表す定数。
 *
 * @see Storybook `Display/Marker`
 */
export const MARKER_VARIANT: Readonly<{
  DEFAULT: "default";
  SEPARATOR: "separator";
  BORDER: "border";
}> = {
  DEFAULT: DEFAULT_MARKER_VARIANT,
  SEPARATOR: SEPARATOR_MARKER_VARIANT,
  BORDER: BORDER_MARKER_VARIANT,
};

/** {@link MARKER_VARIANT} のいずれか。 */
export type MarkerVariant = (typeof MARKER_VARIANT)[keyof typeof MARKER_VARIANT];
