"use client";

import { useCallback, useId } from "react";

import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";

import type { FilterOption } from "../../query";

/** 絞り込みの 1 群。 */
export type FilterGroup = {
  /** URL に載せるキー。 */
  readonly key: string;
  /** 群の見出し。 */
  readonly legend: string;
  /** 選べる値。「すべて」を含む。 */
  readonly options: readonly FilterOption[];
};

/** `ProductFilterFields` の props。 */
export type ProductFilterFieldsProps = {
  /** 並べる群。 */
  groups: readonly FilterGroup[];
  /** いま選ばれている値。キーに対応する値が無ければ「すべて」を選んだものとして扱う。 */
  selection: Readonly<Record<string, string>>;
  /** 選択が変わったときに呼ぶ。 */
  onSelect: (key: string, value: string) => void;
};

/**
 * 絞り込みの入力欄。
 *
 * @remarks
 * 選択を持ちません。同じ入力欄を、選ぶたびに反映する脇の領域と、まとめて確定する overlay の
 * 両方から使うためです。どちらの確定の仕方を採るかは呼び出し元が決めます。
 *
 * 単一選択にしているのは、契約が受け付けるカテゴリとステータスがそれぞれ 1 つだからです。
 * 複数選べる見た目にすると、選べたものが URL に載らずに落ちます。
 *
 * `name` に生成した ID を混ぜているのは、脇の領域と overlay が同時に DOM へ存在するためです。
 * 同じ `name` の radio が 2 組あると、ブラウザはそれらを 1 つの群として扱い、片方を選ぶと
 * もう片方の選択が外れます。
 */
export function ProductFilterFields({ groups, selection, onSelect }: ProductFilterFieldsProps) {
  const scope = useId();

  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <RadioGroupNative key={group.key}>
          <legend className="mb-3 font-medium text-sm">{group.legend}</legend>
          {group.options.map((option) => (
            <FilterOptionItem
              checked={(selection[group.key] ?? "") === option.value}
              groupKey={group.key}
              key={option.value}
              onSelect={onSelect}
              option={option}
              scope={scope}
            />
          ))}
        </RadioGroupNative>
      ))}
    </div>
  );
}

/**
 * 選択肢 1 つ。
 *
 * @remarks
 * 群の中の 1 件を独立した component にしているのは、選んだことを伝える関数を選択肢ごとに
 * 安定させるためです。描画のたびに新しい関数を渡すと、選択肢の数だけ差分が出ます。
 */
function FilterOptionItem({
  checked,
  groupKey,
  onSelect,
  option,
  scope,
}: {
  checked: boolean;
  groupKey: string;
  onSelect: (key: string, value: string) => void;
  option: FilterOption;
  scope: string;
}) {
  const id = `${scope}-${groupKey}-${option.value}`;
  const select = useCallback(() => {
    onSelect(groupKey, option.value);
  }, [groupKey, onSelect, option.value]);

  return (
    <Label htmlFor={id}>
      <RadioGroupNativeItem
        checked={checked}
        id={id}
        name={`${scope}-${groupKey}`}
        onChange={select}
        value={option.value}
      />
      {option.label}
    </Label>
  );
}
