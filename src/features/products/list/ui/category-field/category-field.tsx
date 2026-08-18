"use client";

import { useCallback, useId } from "react";
import { cn } from "@/components/cn";
import { CheckboxNative } from "@/components/design-system/form/checkbox-native/checkbox-native";
import { Label } from "@/components/design-system/form/label/label";

import type { FilterOption } from "../../query";

/** `ProductCategoryField` の props。 */
export type ProductCategoryFieldProps = {
  /** 選べる分類。「すべて」は含めない。 */
  options: readonly FilterOption[];
  /** いま選ばれている分類。 */
  selected: readonly string[];
  /** 一度に選べる数。契約が決めるため、呼び出し元が渡す。 */
  limit: number;
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
 *
 * **選べる数には上限があり、達するまで何も出しません。** 上限は契約が決める数で、多くの利用者は
 * そこへ到達しません。残り数を常に出すと、届かない制約のために全員の視界を占めることになります。
 *
 * **上限に達したら、まだ選んでいない分類を選べなくします。** 押せるのに何も起きない形にすると、
 * 壊れていると読まれます。`disabled` ではなく `aria-disabled` にするのは、`disabled` だと focus が
 * 当たらず、keyboard と支援技術の利用者が理由へ辿り着けないためです。外す操作は常に通します。
 */
export function ProductCategoryField({
  options,
  selected,
  limit,
  onChange,
}: ProductCategoryFieldProps) {
  const scope = useId();
  const noticeId = `${scope}-limit`;
  const reachedLimit = selected.length >= limit;

  return (
    <fieldset aria-describedby={reachedLimit ? noticeId : undefined} className="grid gap-3">
      <legend className="mb-3 font-medium text-sm">カテゴリ</legend>
      {options.map((option) => (
        <CategoryOption
          checked={selected.includes(option.value)}
          key={option.value}
          onChange={onChange}
          option={option}
          reachedLimit={reachedLimit}
          scope={scope}
          selected={selected}
        />
      ))}
      {reachedLimit ? (
        <p className="text-muted-foreground text-sm" id={noticeId} role="status">
          {`カテゴリは ${limit} 件まで選べます。`}
        </p>
      ) : null}
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
  reachedLimit,
  scope,
  selected,
}: {
  checked: boolean;
  onChange: (values: readonly string[]) => void;
  option: FilterOption;
  reachedLimit: boolean;
  scope: string;
  selected: readonly string[];
}) {
  const id = `${scope}-${option.value}`;
  const blocked = reachedLimit && !checked;
  const toggle = useCallback(() => {
    if (blocked) {
      return;
    }

    onChange(
      checked ? selected.filter((value) => value !== option.value) : [...selected, option.value],
    );
  }, [blocked, checked, onChange, option.value, selected]);

  return (
    <Label className={cn(blocked && "text-muted-foreground")} htmlFor={id}>
      <CheckboxNative
        aria-disabled={blocked || undefined}
        checked={checked}
        id={id}
        onChange={toggle}
        value={option.value}
      />
      {option.label}
    </Label>
  );
}
