const DEFAULT_SWITCH_SIZE = "default";
const SMALL_SWITCH_SIZE = "sm";

/**
 * Switch の表示サイズを表す定数。
 *
 * `switch-native` を owner とし、`switch-client` も同じ値を参照する。native と client で
 * 見た目が揃わないと、同じ画面に両方が現れたときに別部品に見えるため。
 *
 * @see Storybook `Form/SwitchNative`
 */
export const SWITCH_SIZE: Readonly<{
  DEFAULT: "default";
  SMALL: "sm";
}> = {
  DEFAULT: DEFAULT_SWITCH_SIZE,
  SMALL: SMALL_SWITCH_SIZE,
};

/** {@link SWITCH_SIZE} のいずれか。 */
export type SwitchSize = (typeof SWITCH_SIZE)[keyof typeof SWITCH_SIZE];
