const MOD_SHORTCUT_MODIFIER = "mod";
const ALT_SHORTCUT_MODIFIER = "alt";
const SHIFT_SHORTCUT_MODIFIER = "shift";
const CONTROL_SHORTCUT_MODIFIER = "control";
const APPLE_SHORTCUT_PLATFORM = "apple";
const OTHER_SHORTCUT_PLATFORM = "other";

/**
 * プラットフォームによって表記が変わる修飾キーを表す定数。
 *
 * - `mod`: 主となる修飾キー。Apple では `⌘`、それ以外では `Ctrl`
 * - `alt`: `⌥` / `Alt`
 * - `shift`: `⇧` / `Shift`
 * - `control`: `⌃` / `Ctrl`。`mod` と区別して Control そのものを指す場合に使う
 *
 * @see Storybook `Display/KeyboardShortcut`
 */
export const SHORTCUT_MODIFIER: Readonly<{
  MOD: "mod";
  ALT: "alt";
  SHIFT: "shift";
  CONTROL: "control";
}> = {
  MOD: MOD_SHORTCUT_MODIFIER,
  ALT: ALT_SHORTCUT_MODIFIER,
  SHIFT: SHIFT_SHORTCUT_MODIFIER,
  CONTROL: CONTROL_SHORTCUT_MODIFIER,
};

/**
 * 修飾キーの表記を選ぶプラットフォームを表す定数。
 *
 * @see Storybook `Display/KeyboardShortcut`
 */
export const SHORTCUT_PLATFORM: Readonly<{
  APPLE: "apple";
  OTHER: "other";
}> = {
  APPLE: APPLE_SHORTCUT_PLATFORM,
  OTHER: OTHER_SHORTCUT_PLATFORM,
};

/** {@link SHORTCUT_MODIFIER} のいずれか。 */
export type ShortcutModifier = (typeof SHORTCUT_MODIFIER)[keyof typeof SHORTCUT_MODIFIER];

/** {@link SHORTCUT_PLATFORM} のいずれか。 */
export type ShortcutPlatform = (typeof SHORTCUT_PLATFORM)[keyof typeof SHORTCUT_PLATFORM];

/**
 * 修飾キーをプラットフォームごとの表記へ引く表。
 *
 * @remarks
 * ここに無いキーは受け取った文字列をそのまま表示する。`K` や `Enter` のように表記が変わらない
 * キーを列挙しないのは、増やし続ける表を持たないためである。
 */
export const SHORTCUT_MODIFIER_LABEL: Readonly<
  Record<ShortcutPlatform, Readonly<Record<ShortcutModifier, string>>>
> = {
  [SHORTCUT_PLATFORM.APPLE]: {
    [SHORTCUT_MODIFIER.MOD]: "⌘",
    [SHORTCUT_MODIFIER.ALT]: "⌥",
    [SHORTCUT_MODIFIER.SHIFT]: "⇧",
    [SHORTCUT_MODIFIER.CONTROL]: "⌃",
  },
  [SHORTCUT_PLATFORM.OTHER]: {
    [SHORTCUT_MODIFIER.MOD]: "Ctrl",
    [SHORTCUT_MODIFIER.ALT]: "Alt",
    [SHORTCUT_MODIFIER.SHIFT]: "Shift",
    [SHORTCUT_MODIFIER.CONTROL]: "Ctrl",
  },
};

function isShortcutModifier(key: string): key is ShortcutModifier {
  return Object.values(SHORTCUT_MODIFIER).some((modifier) => modifier === key);
}

/**
 * キー 1 つを、そのプラットフォームで表示する文字列へ変換する。
 *
 * @remarks
 * {@link SHORTCUT_MODIFIER} に無いキーは受け取った文字列をそのまま返す。
 *
 * @param key - 表示するキー。
 * @param platform - 表記を引くプラットフォーム。
 */
export function shortcutKeyLabel(key: string, platform: ShortcutPlatform): string {
  return isShortcutModifier(key) ? SHORTCUT_MODIFIER_LABEL[platform][key] : key;
}
