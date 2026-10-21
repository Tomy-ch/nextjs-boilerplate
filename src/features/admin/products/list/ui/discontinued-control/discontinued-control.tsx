"use client";

import { useCallback, useId } from "react";

import { cn } from "@/components/cn";
import {
  ToggleGroupNative,
  ToggleGroupNativeItem,
} from "@/components/design-system/form/toggle-group-native/toggle-group-native";

import {
  DISCONTINUED_FILTER,
  DISCONTINUED_FILTER_LABEL,
  type DiscontinuedFilter,
  FILTER_KEY,
  FILTER_KEY_LABEL,
} from "../../query";

const CHOICES: readonly DiscontinuedFilter[] = [
  DISCONTINUED_FILTER.ONLY,
  DISCONTINUED_FILTER.EXCLUDED,
];

/** `AdminProductDiscontinuedControl` の props。 */
export type AdminProductDiscontinuedControlProps = {
  /** いま選ばれている値。null ならどちらも選ばれていない（絞り込まない）。 */
  value: DiscontinuedFilter | null;
  /** 選ばれたときに呼ばれる。反映するか下書きに留めるかは呼び出し元が決める。 */
  onSelect: (value: DiscontinuedFilter) => void;
  /** 外側の並び方を決める class 名。 */
  className?: string;
};

/**
 * 廃番で絞り込む選択欄。
 *
 * @remarks
 * 「指定なし」を候補に置きません。外すのは効いている条件の chip か、すべてを外す操作です。
 *
 * 選ばれた値をどう扱うかは持ちません。選んだ時点で反映する場所と、まとめて確定する overlay の
 * 中の 2 か所に出るためです。2 か所は同時に文書へ載り得るため、radio の `name` は置き場ごとに
 * 別の値にします。
 *
 * @param props - {@link AdminProductDiscontinuedControlProps} を参照。
 *
 * @see Storybook `Features/Admin/Products/List/DiscontinuedControl`
 */
export function AdminProductDiscontinuedControl({
  className,
  onSelect,
  value,
}: AdminProductDiscontinuedControlProps) {
  const groupName = useId();
  const labelId = useId();

  const change = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onSelect(
        event.target.value === DISCONTINUED_FILTER.ONLY
          ? DISCONTINUED_FILTER.ONLY
          : DISCONTINUED_FILTER.EXCLUDED,
      ),
    [onSelect],
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="shrink-0 text-muted-foreground text-sm" id={labelId}>
        {FILTER_KEY_LABEL[FILTER_KEY.DISCONTINUED]}
      </span>
      <ToggleGroupNative aria-labelledby={labelId}>
        {CHOICES.map((choice) => (
          <ToggleGroupNativeItem
            checked={value === choice}
            key={choice}
            name={groupName}
            onChange={change}
            size="sm"
            value={choice}
            variant="outline"
          >
            {DISCONTINUED_FILTER_LABEL[choice]}
          </ToggleGroupNativeItem>
        ))}
      </ToggleGroupNative>
    </div>
  );
}
