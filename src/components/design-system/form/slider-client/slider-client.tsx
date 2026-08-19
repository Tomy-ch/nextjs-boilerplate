"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { type ComponentProps, useMemo } from "react";

import { cn } from "@/components/cn";

/** {@link SliderClient} の props。 */
export type SliderClientProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /**
   * thumb ごとのアクセシブルな名前。値の数と同じ順序で渡す。範囲入力では「下限価格」「上限価格」
   * のように、どちらの端かが判る名前にする。
   */
  thumbLabels?: string[];
};

/**
 * 数値または範囲を連続的な操作で指定する client island の slider 部品。
 *
 * @remarks
 * thumb を複数持てるため、下限と上限を一つの操作面で指定する範囲入力に使う。単一の値を選ぶだけで
 * 足りる場合は、native form へそのまま載る `SliderNative` を使う。
 *
 * hydration が必要で、Server Component からは直接 render できない。値の保持と確定、`searchParams`
 * への反映、送信は呼び出し元が持つ。`value` を渡すと制御 component、`defaultValue` を渡すと
 * 非制御 component として動き、いずれも省略した場合は `min` を初期値とする thumb を一つ置く。
 *
 * 名前を持つのは Root ではなく各 thumb である。`slider` role は thumb 側に付くため、Root へ
 * `aria-label` や `aria-labelledby` を渡しても名前にならない。`thumbLabels` に値と同じ順序で
 * 名前を渡す。
 *
 * `aria-valuemin` / `aria-valuemax` は thumb ごとの可動域ではなく、slider 全体の `min` / `max` を
 * 指す。範囲入力で「下限は上限を越えない」ことを利用者へ伝えたい場合は、名前や併記テキストで補う。
 *
 * `orientation="vertical"` を指定すると縦向きになる。その場合は高さを `className` で与える。
 *
 * @see Storybook `Form/SliderClient`
 */
export function SliderClient({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  ...props
}: SliderClientProps) {
  const thumbs = useMemo(() => {
    const values = Array.isArray(value)
      ? value
      : Array.isArray(defaultValue)
        ? defaultValue
        : [min];
    return values.map((_, index) => ({
      key: `slider-thumb-${index}`,
      label: thumbLabels?.[index],
    }));
  }, [value, defaultValue, min, thumbLabels]);

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      data-slot="slider"
      defaultValue={defaultValue}
      max={max}
      min={min}
      value={value}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative grow overflow-hidden rounded-full bg-border data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
        )}
        data-slot="slider-track"
      >
        <SliderPrimitive.Range
          className={cn(
            "absolute bg-foreground data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
          )}
          data-slot="slider-range"
        />
      </SliderPrimitive.Track>
      {thumbs.map((thumb) => (
        <SliderPrimitive.Thumb
          aria-label={thumb.label}
          className="block size-4 shrink-0 rounded-full border border-foreground bg-background shadow-sm outline-solid outline-0 outline-active/50 transition-[outline-width] hover:outline-4 focus-visible:outline-4 disabled:pointer-events-none disabled:opacity-50"
          data-slot="slider-thumb"
          key={thumb.key}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
