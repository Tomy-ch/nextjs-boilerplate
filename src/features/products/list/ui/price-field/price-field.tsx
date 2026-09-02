"use client";

import { type ChangeEvent, useCallback, useId, useState } from "react";

import { Label } from "@/components/design-system/form/label/label";
import { SelectNative } from "@/components/design-system/form/select-native/select-native";
import { SliderClient } from "@/components/design-system/form/slider-client/slider-client";

import {
  formatPriceBound,
  PRICE_RANGE_MAX,
  PRICE_RANGE_MIN,
  PRICE_SCALE,
  type PriceRange,
} from "../../price-range";

/** `ProductPriceField` の props。 */
export type ProductPriceFieldProps = {
  /** いま選ばれている下限と上限の位置。 */
  value: PriceRange;
  /** 位置が確定したときに呼ぶ。 */
  onChange: (range: PriceRange) => void;
};

/** 目盛りの位置。下限は上限なしの端を、上限は下限なしの端を選べない。 */
const LOW_INDEXES: readonly number[] = PRICE_SCALE.map((_, index) => index).slice(
  PRICE_RANGE_MIN,
  PRICE_RANGE_MAX,
);
const HIGH_INDEXES: readonly number[] = PRICE_SCALE.map((_, index) => index).slice(
  PRICE_RANGE_MIN + 1,
  PRICE_RANGE_MAX + 1,
);

/**
 * 操作面が返した位置を、下限と上限の組として読む。
 *
 * @remarks
 * 端の位置へ落とす分岐は、渡した値と同じ数の位置が返るため実際には通りません。要素の有無を
 * 型が保証しないぶんの補いです。
 */
function toRange(values: number[]): PriceRange {
  /* istanbul ignore next -- 端は TS の絞り込みのためだけで、操作面は渡した数と同じ数の位置を返す。 */
  return [values[0] ?? PRICE_RANGE_MIN, values[1] ?? PRICE_RANGE_MAX];
}

/**
 * 価格の絞り込み。
 *
 * @remarks
 * 同じ範囲を 2 つの操作面で指定します。セレクトボックスは目盛りを名前で選べて keyboard だけで
 * 完結し、レンジスライダーは下限と上限の関係を一目で示します。どちらも
 * [`price-range.ts`](../../price-range.ts) の目盛りの上を動くため、指せる値は完全に同じです。
 *
 * **スライダーは滑らせている間、外へ伝えません。** 指を離した時点だけを確定として扱います。
 * 通り過ぎた目盛りをすべて確定にすると、確定のたびに取得が走ります。
 *
 * 逆にセレクトボックスからは即座に伝えます。1 回の操作が 1 つの確定であり、途中の状態を持ちません。
 *
 * 滑らせている間の位置は自分で持ちますが、離した後は外から来る位置に従います。持ち続けると、
 * セレクトボックスで選び直した値をスライダーが映さなくなります。
 */
export function ProductPriceField({ value, onChange }: ProductPriceFieldProps) {
  "use memo";

  const scope = useId();
  const [sliding, setSliding] = useState<PriceRange | null>(null);
  const [low, high] = sliding ?? value;

  const slide = useCallback((next: number[]) => {
    setSliding(toRange(next));
  }, []);

  const commit = useCallback(
    (next: number[]) => {
      setSliding(null);
      onChange(toRange(next));
    },
    [onChange],
  );

  const changeLow = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const next = Number(event.target.value);

      setSliding(null);
      onChange([next, Math.max(next, high)]);
    },
    [high, onChange],
  );

  const changeHigh = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const next = Number(event.target.value);

      setSliding(null);
      onChange([Math.min(low, next), next]);
    },
    [low, onChange],
  );

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 font-emphasis text-sm">価格</legend>
      <div className="flex items-center gap-2">
        <Label className="sr-only" htmlFor={`${scope}-low`}>
          価格の下限
        </Label>
        <SelectNative
          className="min-w-0"
          id={`${scope}-low`}
          onChange={changeLow}
          size="sm"
          value={low}
        >
          {LOW_INDEXES.map((index) => (
            <option key={index} value={index}>
              {formatPriceBound(index, "low")}
            </option>
          ))}
        </SelectNative>
        <span aria-hidden="true" className="text-muted-foreground text-sm">
          〜
        </span>
        <Label className="sr-only" htmlFor={`${scope}-high`}>
          価格の上限
        </Label>
        <SelectNative
          className="min-w-0"
          id={`${scope}-high`}
          onChange={changeHigh}
          size="sm"
          value={high}
        >
          {HIGH_INDEXES.map((index) => (
            <option key={index} value={index}>
              {formatPriceBound(index, "high")}
            </option>
          ))}
        </SelectNative>
      </div>
      <SliderClient
        max={PRICE_RANGE_MAX}
        min={PRICE_RANGE_MIN}
        onValueChange={slide}
        onValueCommit={commit}
        thumbLabels={["価格の下限", "価格の上限"]}
        value={[low, high]}
      />
    </fieldset>
  );
}
