import type { ReactNode } from "react";

import type { DropdownMenuItemVariant } from "@/components/design-system/overlay/dropdown-menu/dropdown-menu.definition";

const LINK_ROW_ACTION_KIND = "link";
const COMMAND_ROW_ACTION_KIND = "command";
const SEPARATOR_ROW_ACTION_KIND = "separator";

/**
 * 行操作の種類。
 *
 * `link` は別画面への遷移、`command` はその場で実行する操作、`separator` は項目群の区切りを表す。
 *
 * @see Storybook `Sugar/Table/RowActions`
 */
export const ROW_ACTION_KIND: Readonly<{
  LINK: "link";
  COMMAND: "command";
  SEPARATOR: "separator";
}> = {
  LINK: LINK_ROW_ACTION_KIND,
  COMMAND: COMMAND_ROW_ACTION_KIND,
  SEPARATOR: SEPARATOR_ROW_ACTION_KIND,
};

/** {@link ROW_ACTION_KIND} のいずれか。 */
export type RowActionKind = (typeof ROW_ACTION_KIND)[keyof typeof ROW_ACTION_KIND];

/** 別画面へ遷移する操作。Server Component からも使える。 */
export type LinkRowAction = {
  disabled?: boolean;
  href: string;
  id: string;
  kind: "link";
  label: ReactNode;
};

/** その場で実行する操作。関数を持つため Client Component から使う。 */
export type CommandRowAction = {
  disabled?: boolean;
  id: string;
  kind: "command";
  label: ReactNode;
  onSelect: () => void;
  variant?: DropdownMenuItemVariant;
};

/** 項目群の区切り。 */
export type SeparatorRowAction = {
  id: string;
  kind: "separator";
};

/** 行操作の定義。行ごとに組み立てて {@link ROW_ACTION_KIND} で種類を指定する。 */
export type RowAction = CommandRowAction | LinkRowAction | SeparatorRowAction;
