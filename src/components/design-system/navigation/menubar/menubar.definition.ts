const DEFAULT_MENUBAR_ITEM_VARIANT = "default";
const DESTRUCTIVE_MENUBAR_ITEM_VARIANT = "destructive";

/**
 * menu 項目の見た目。
 *
 * `destructive` は削除など取り消せない操作だけに使い、確認が必要な場合は選択後に
 * `AlertDialog` を開く。
 *
 * @see Storybook `Navigation/Menubar`
 */
export const MENUBAR_ITEM_VARIANT: Readonly<{
  DEFAULT: "default";
  DESTRUCTIVE: "destructive";
}> = {
  DEFAULT: DEFAULT_MENUBAR_ITEM_VARIANT,
  DESTRUCTIVE: DESTRUCTIVE_MENUBAR_ITEM_VARIANT,
};

/** {@link MENUBAR_ITEM_VARIANT} のいずれか。 */
export type MenubarItemVariant = (typeof MENUBAR_ITEM_VARIANT)[keyof typeof MENUBAR_ITEM_VARIANT];
