"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/design-system/overlay/dropdown-menu/dropdown-menu";
import { ROW_ACTION_KIND, type RowAction } from "./row-actions.definition";

/** {@link RowActionsMenuContent} の props。 */
export type RowActionsMenuContentProps = {
  /** 並べる操作。区切り・link・command のいずれか。 */
  items: readonly RowAction[];
};

/**
 * 行の操作メニューの中身。
 *
 * @remarks
 * **command は、選んだ瞬間ではなくメニューが閉じて focus が trigger へ戻ってから実行する。**
 * command が確認の面を開くとき、面を閉じた後の focus をこの trigger へ戻せるのはこの順序のときだけ
 * である。順序は、Radix が `onCloseAutoFocus` を trigger へ focus を戻す処理より先に、同じ task の
 * 中で呼ぶことに依っている。
 *
 * @param props - {@link RowActionsMenuContentProps} を参照。
 */
export function RowActionsMenuContent({ items }: RowActionsMenuContentProps) {
  const selected = useRef<(() => void) | null>(null);

  /** 選ばれていた command を、メニューが閉じた後に 1 度だけ実行する。 */
  const runSelected = useCallback(() => {
    const run = selected.current;

    selected.current = null;

    if (run !== null) queueMicrotask(run);
  }, []);

  return (
    <DropdownMenuContent align="end" onCloseAutoFocus={runSelected}>
      {items.map((action) => {
        if (action.kind === ROW_ACTION_KIND.SEPARATOR) {
          return <DropdownMenuSeparator key={action.id} />;
        }

        if (action.kind === ROW_ACTION_KIND.LINK) {
          return (
            <DropdownMenuItem asChild disabled={action.disabled} key={action.id}>
              <Link href={action.href}>{action.label}</Link>
            </DropdownMenuItem>
          );
        }

        return (
          <DropdownMenuItem
            disabled={action.disabled}
            key={action.id}
            onSelect={() => {
              selected.current = action.onSelect;
            }}
            variant={action.variant}
          >
            {action.label}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuContent>
  );
}
