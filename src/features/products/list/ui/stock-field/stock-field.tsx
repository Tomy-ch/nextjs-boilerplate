"use client";

import { useCallback, useId } from "react";

import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";

import {
  STOCK_AVAILABILITY_LABEL,
  STOCK_AVAILABILITY_OPTIONS,
  type StockAvailability,
  type StockAvailabilityOption,
} from "../../stock-availability";

/** `ProductStockField` の props。 */
export type ProductStockFieldProps = {
  /** いま選ばれている在庫状況。 */
  value: StockAvailability;
  /** 選択が変わったときに呼ぶ。 */
  onChange: (value: StockAvailability) => void;
};

/**
 * 在庫状況の絞り込み。
 *
 * @remarks
 * 3 つの状態は互いに排他なので radio で表します。分類のように積み上げられるものではありません。
 *
 * `name` に生成した ID を混ぜているのは、脇の領域と overlay が同時に DOM へ存在するためです。
 * 同じ `name` の radio が 2 組あると、ブラウザはそれらを 1 つの群として扱い、片方を選ぶと
 * もう片方の選択が外れます。
 */
export function ProductStockField({ value, onChange }: ProductStockFieldProps) {
  "use memo";

  const scope = useId();

  return (
    <RadioGroupNative>
      <legend className="mb-3 font-emphasis text-sm">{STOCK_AVAILABILITY_LABEL}</legend>
      {STOCK_AVAILABILITY_OPTIONS.map((option) => (
        <StockOption
          checked={value === option.value}
          key={option.value}
          onChange={onChange}
          option={option}
          scope={scope}
        />
      ))}
    </RadioGroupNative>
  );
}

/**
 * 在庫状況の選択肢 1 つ。
 *
 * @remarks
 * 独立した component にしているのは、選んだことを伝える関数を選択肢ごとに安定させるためです。
 */
function StockOption({
  checked,
  onChange,
  option,
  scope,
}: {
  checked: boolean;
  onChange: (value: StockAvailability) => void;
  option: StockAvailabilityOption;
  scope: string;
}) {
  "use memo";

  const id = `${scope}-${option.value}`;
  const select = useCallback(() => {
    onChange(option.value);
  }, [onChange, option.value]);

  return (
    <Label htmlFor={id}>
      <RadioGroupNativeItem
        checked={checked}
        id={id}
        name={scope}
        onChange={select}
        value={option.value}
      />
      {option.label}
    </Label>
  );
}
