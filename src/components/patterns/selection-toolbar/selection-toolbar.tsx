import type { ComponentProps, ReactNode } from "react";
import { useCallback } from "react";

import { cn } from "@/components/cn";
import { Button } from "@/components/design-system/action/button/button";
import { CheckboxClient } from "@/components/design-system/form/checkbox-client/checkbox-client";
import {
  SELECTION_TOOLBAR_POSITION,
  SELECTION_TOOLBAR_POSITION_CLASS,
  type SelectionToolbarPosition,
} from "./selection-toolbar.definition";

/** {@link SelectAllCheckbox} の props。 */
export type SelectAllCheckboxProps = Omit<
  ComponentProps<typeof CheckboxClient>,
  "checked" | "onCheckedChange"
> & {
  /** いま選択されている件数。 */
  selectedCount: number;
  /** 選択できる全件数。 */
  totalCount: number;
  /** すべて選択する / すべて外す。 */
  onSelectAllChange: (selectAll: boolean) => void;
  /** 操作のアクセシブルな名前。 */
  label?: string;
};

/**
 * 一覧の全件を選択・解除する checkbox。
 *
 * @remarks
 * 一部だけ選ばれているときは indeterminate になる。checked と unchecked の 2 値だと「一部選択」
 * が「未選択」と同じ見え方になり、押した結果がどちらへ転ぶか予測できない。
 *
 * indeterminate から押したときは全選択にする。一部選択の状態で利用者が求めるのは、選び直しでは
 * なく残りを含めた全選択のほうが多い。
 *
 * 選択状態そのものは持たない。件数を受け取り、変更を呼び出し元へ返す。
 *
 * @param props.selectedCount - いま選択されている件数。
 * @param props.totalCount - 選択できる全件数。
 * @param props.onSelectAllChange - すべて選択する / すべて外す。
 *
 * @see Storybook `Container/SelectionToolbar`
 */
export function SelectAllCheckbox({
  selectedCount,
  totalCount,
  onSelectAllChange,
  label = "すべて選択",
  ...props
}: SelectAllCheckboxProps) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const checked = selectedCount === 0 ? false : allSelected || "indeterminate";
  const toggleAll = useCallback(
    () => onSelectAllChange(!allSelected),
    [allSelected, onSelectAllChange],
  );

  return (
    <CheckboxClient
      aria-label={label}
      checked={checked}
      data-slot="select-all-checkbox"
      disabled={totalCount === 0}
      onCheckedChange={toggleAll}
      {...props}
    />
  );
}

/** {@link SelectionToolbar} の props。 */
export type SelectionToolbarProps = ComponentProps<"div"> & {
  /** いま選択されている件数。 */
  selectedCount: number;
  /** 選択できる全件数。渡すと「全 N 件中」を添える。 */
  totalCount?: number;
  /** 件数の単位。「件」「人」など。 */
  unit?: string;
  /** 選択を解除する操作。渡すと解除ボタンを表示する。 */
  onClearSelection?: () => void;
  /** 操作を出す位置。 */
  position?: SelectionToolbarPosition;
  /** 選択した対象への操作。 */
  children?: ReactNode;
};

/**
 * 選択された件数と、その選択に対して行える操作をまとめる領域。
 *
 * @remarks
 * 何も選ばれていないときも要素を残す。件数は `aria-live` で伝えるため、選択が始まってから領域ごと
 * 現れると、その最初の 1 件が読み上げられない。中身が空のあいだは高さも枠も持たない。
 *
 * 操作をまとめる領域には件数を含む名前を与える。「削除」だけでは何件に対する操作か分からず、
 * 一覧のどこかにある別の削除操作と区別できない。名前は `fieldset` の group として与える。
 * `role="toolbar"` は矢印キーでの移動を約束することになるため使わない。
 *
 * 一覧が長い画面では `position` を `sticky` / `fixed` にして、scroll しても操作へ届くようにする。
 * どちらも内容の上へ重なるため、`fixed` にした場合は最後の項目が隠れないよう、本文側に下余白を
 * 置くのは呼び出し元の責務になる。
 *
 * 業務操作の実行、権限の判定、確認 dialog は持たない。呼び出し元が操作を `children` として渡す。
 *
 * @param props.selectedCount - いま選択されている件数。
 * @param props.totalCount - 選択できる全件数。
 * @param props.unit - 件数の単位。
 * @param props.onClearSelection - 選択を解除する操作。
 * @param props.position - 操作を出す位置。
 * @param props.children - 選択した対象への操作。
 *
 * @see Storybook `Container/SelectionToolbar`
 */
export function SelectionToolbar({
  className,
  selectedCount,
  totalCount,
  unit = "件",
  onClearSelection,
  position = SELECTION_TOOLBAR_POSITION.INLINE,
  children,
  ...props
}: SelectionToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-sm",
        hasSelection && SELECTION_TOOLBAR_POSITION_CLASS[position],
        className,
      )}
      data-position={position}
      data-selected={hasSelection}
      data-slot="selection-toolbar"
      {...props}
    >
      <p aria-live="polite" data-slot="selection-toolbar-count">
        {hasSelection ? formatSelection(selectedCount, totalCount, unit) : null}
      </p>
      {hasSelection ? (
        <fieldset
          aria-label={`選択した ${selectedCount} ${unit}への操作`}
          className="flex min-w-0 flex-wrap items-center gap-2"
          data-slot="selection-toolbar-actions"
        >
          {children}
          {onClearSelection === undefined ? null : (
            <Button onClick={onClearSelection} size="sm" type="button" variant="ghost">
              選択を解除
            </Button>
          )}
        </fieldset>
      ) : null}
    </div>
  );
}

/** 母数が分かるときだけ添える。選択の意味は全体との比で変わる。 */
function formatSelection(selectedCount: number, totalCount: number | undefined, unit: string) {
  if (totalCount === undefined) return `${selectedCount} ${unit}を選択中`;

  return `全 ${totalCount} ${unit}中 ${selectedCount} ${unit}を選択中`;
}
