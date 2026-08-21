"use client";

import { useCallback, useId } from "react";

import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";

import { STOCK_FORM_NAMES } from "../../form-names";
import type { StockDirection } from "../../stock-direction";
import { isStockDirection, STOCK_DIRECTION, STOCK_DIRECTION_LABELS } from "../../stock-direction";

const DIRECTIONS: readonly StockDirection[] = [STOCK_DIRECTION.REPLENISH, STOCK_DIRECTION.DEDUCT];

/** `StockDirectionField` の props。 */
export type StockDirectionFieldProps = {
  /** いま選ばれている向き。 */
  value: StockDirection;
  /** 選び直されたことを伝える。 */
  onValueChange: (value: StockDirection) => void;
};

/**
 * 在庫を増やすか減らすかを選ぶ項目。
 *
 * @remarks
 * native の radio で組みます。選択肢は 2 つで固定されており、独自の keyboard 操作も client
 * state も要らないためです（[`RadioGroupNative`](../../../../../../components/design-system/form/radio-group-native/README.md)）。
 *
 * 値を呼び出し元が持つのは、同じ選択が見込みの計算にも使われるためです。入力欄に任せると、
 * 見込みだけが選び直しに追従しません。
 */
export function StockDirectionField({ value, onValueChange }: StockDirectionFieldProps) {
  const idPrefix = useId();

  const change = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // 並べた選択肢が出所でも、DOM から返るのは素の文字列なので判定を通す。
      if (isStockDirection(event.target.value)) onValueChange(event.target.value);
    },
    [onValueChange],
  );

  return (
    <RadioGroupNative className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <legend className="mb-2 font-medium text-sm">操作</legend>
      {DIRECTIONS.map((direction) => (
        <Label
          className="flex items-center gap-2"
          htmlFor={`${idPrefix}${direction}`}
          key={direction}
        >
          <RadioGroupNativeItem
            checked={value === direction}
            id={`${idPrefix}${direction}`}
            name={STOCK_FORM_NAMES.direction}
            onChange={change}
            value={direction}
          />
          {STOCK_DIRECTION_LABELS[direction]}
        </Label>
      ))}
    </RadioGroupNative>
  );
}
