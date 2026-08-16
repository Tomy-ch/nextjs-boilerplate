"use client";

import { useCallback, useId } from "react";

import { CheckboxNative } from "@/components/design-system/form/checkbox-native/checkbox-native";
import { Label } from "@/components/design-system/form/label/label";

import type { FilterOption } from "../../query";

/** `ProductCategoryField` の props。 */
export type ProductCategoryFieldProps = {
  /** 選べる分類。「すべて」は含めない。 */
  options: readonly FilterOption[];
  /** いま選ばれている分類。 */
  selected: readonly string[];
  /** 選択が変わったときに呼ぶ。 */
  onChange: (values: readonly string[]) => void;
};

/**
 * 分類の絞り込み。
 *
 * @remarks
 * 複数選べます。1 つしか選べない形では「食器と雑貨を見たい」に応えられず、見たいものが分類を
 * またぐたびに検索をやり直すことになります。
 *
 * **「すべて」の選択肢を置きません。** 1 つも選んでいない状態がそのまま「すべて」であり、選択肢
 * として並べると、それを選ぶことと他を外すことのどちらが効いているのかが読めなくなります。
 */
export function ProductCategoryField({ options, selected, onChange }: ProductCategoryFieldProps) {
  const scope = useId();

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 font-medium text-sm">カテゴリ</legend>
      {options.map((option) => (
        <CategoryOption
          checked={selected.includes(option.value)}
          key={option.value}
          onChange={onChange}
          option={option}
          scope={scope}
          selected={selected}
        />
      ))}
    </fieldset>
  );
}

/**
 * 分類 1 つ。
 *
 * @remarks
 * 独立した component にしているのは、切り替えを伝える関数を選択肢ごとに安定させるためです。
 */
function CategoryOption({
  checked,
  onChange,
  option,
  scope,
  selected,
}: {
  checked: boolean;
  onChange: (values: readonly string[]) => void;
  option: FilterOption;
  scope: string;
  selected: readonly string[];
}) {
  const id = `${scope}-${option.value}`;
  const toggle = useCallback(() => {
    onChange(
      checked ? selected.filter((value) => value !== option.value) : [...selected, option.value],
    );
  }, [checked, onChange, option.value, selected]);

  return (
    <Label htmlFor={id}>
      <CheckboxNative checked={checked} id={id} onChange={toggle} value={option.value} />
      {option.label}
    </Label>
  );
}
