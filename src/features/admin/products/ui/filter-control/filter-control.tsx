"use client";

import { type ChangeEvent, useCallback, useId } from "react";

import { cn } from "@/components/cn";
import { Label } from "@/components/design-system/form/label/label";
import {
  SelectNative,
  SelectNativeOption,
} from "@/components/design-system/form/select-native/select-native";

import type { AdminProductFilterOption } from "../../filter-option";

/** `AdminProductFilterControl` の props。 */
export type AdminProductFilterControlProps = {
  /** 何で絞り込む欄かを示す文言。 */
  label: string;
  /** 選べる候補。先頭に「すべて」を含めて渡す。 */
  options: readonly AdminProductFilterOption[];
  /** いま選ばれている値。 */
  value: string;
  /** 選び直されたときに呼ばれる。反映するか下書きに留めるかは呼び出し元が決める。 */
  onSelect: (value: string) => void;
  /** 外側の並び方を決める class 名。 */
  className?: string;
};

/**
 * 絞り込みの選択欄。
 *
 * @remarks
 * 選ばれた値をどう扱うかは持ちません。**同じ欄が、選んだ時点で反映する場所と、まとめて確定する
 * overlay の中の 2 か所に出る**ためです（[0052](../../../../../../docs/adr/0052-ui-component-policy.md)）。
 *
 * native の `select` を使うのは、候補が静的で少数だからです
 * （`components/design-system/form/select-native`）。初期表示に client JavaScript を要しません。
 */
export function AdminProductFilterControl({
  label,
  options,
  value,
  onSelect,
  className,
}: AdminProductFilterControlProps) {
  const id = useId();
  const change = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onSelect(event.target.value);
    },
    [onSelect],
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label className="shrink-0 text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      <SelectNative id={id} onChange={change} size="sm" value={value}>
        {options.map((option) => (
          <SelectNativeOption key={option.value} value={option.value}>
            {option.label}
          </SelectNativeOption>
        ))}
      </SelectNative>
    </div>
  );
}
