import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/** {@link SliderNative} の props。 */
export type SliderNativeProps = Omit<ComponentProps<"input">, "type">;

/**
 * 単一の数値を連続的な操作で指定する、SSR first の native slider 部品。
 *
 * @remarks
 * native `input type="range"` をそのまま使うため、初期表示と form 送信に browser JavaScript を
 * 必要としない。`name` / `value` / `min` / `max` / `step` は native form の属性として使える。
 *
 * thumb が一つしかないため、下限と上限を同時に指定する範囲入力には使えない。複数 thumb が要る
 * 場合は client island の `SliderClient` を使う。
 *
 * `input type="range"` は screen reader に `slider` として公開され、値は `min` / `max` / 現在値から
 * 読み上げられる。要素自体は名前を持たないため、`aria-label` か、`label` 要素と `id` の関連付けで
 * アクセシブルな名前を必ず与える。値そのものは読み上げられるが画面上には出ないため、数値を利用者へ
 * 見せたい場合はテキストを併記する。
 *
 * track と thumb は browser ごとに別の擬似要素で描画されるため、`::-webkit-slider-runnable-track` /
 * `::-webkit-slider-thumb` / `::-moz-range-track` / `::-moz-range-thumb` の四つへ指定する。
 *
 * 選択済みの範囲は塗り分けず、track は端から端まで一色にする。塗りを描く擬似要素は Firefox の
 * `::-moz-range-progress` しかなく、片方だけ塗ると browser 間で affordance が食い違う。塗り分けが
 * 必要な場合は `SliderClient` を使う。
 *
 * @see Storybook `Form/SliderNative`
 */
export function SliderNative({ className, ...props }: SliderNativeProps) {
  return (
    <input
      className={cn(
        "h-4 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-border [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground",
        className,
      )}
      data-slot="slider-native"
      type="range"
      {...props}
    />
  );
}
