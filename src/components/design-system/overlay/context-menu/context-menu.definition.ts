const DEFAULT_CONTEXT_MENU_ITEM_VARIANT = "default";
const DESTRUCTIVE_CONTEXT_MENU_ITEM_VARIANT = "destructive";

/**
 * menu 項目の見た目。
 *
 * `destructive` は削除など取り消せない操作だけに使い、確認が必要な場合は選択後に
 * `AlertDialog` を開く。
 *
 * @see Storybook `Overlay/ContextMenu`
 */
export const CONTEXT_MENU_ITEM_VARIANT: Readonly<{
  DEFAULT: "default";
  DESTRUCTIVE: "destructive";
}> = {
  DEFAULT: DEFAULT_CONTEXT_MENU_ITEM_VARIANT,
  DESTRUCTIVE: DESTRUCTIVE_CONTEXT_MENU_ITEM_VARIANT,
};

/** {@link CONTEXT_MENU_ITEM_VARIANT} のいずれか。 */
export type ContextMenuItemVariant =
  (typeof CONTEXT_MENU_ITEM_VARIANT)[keyof typeof CONTEXT_MENU_ITEM_VARIANT];
