import type { ComponentProps } from "react";

import { cn } from "@/components/cn";
import { SWITCH_SIZE, type SwitchSize } from "./switch-native.definition";

/** {@link SwitchNative} の props。 */
export type SwitchNativeProps = Omit<ComponentProps<"input">, "size" | "type"> & {
  /** 表示サイズ。 */
  size?: SwitchSize;
};

/**
 * 設定の ON / OFF を切り替える、SSR first の native switch 部品。
 *
 * @remarks
 * 実体は `input type="checkbox"` で、初期表示と form 送信に browser JavaScript を必要としない。
 * `name` と `value` は native form の属性としてそのまま使える。見た目の track と thumb は CSS
 * だけで組んでおり、状態は `:checked` が持つ。
 *
 * focus の可視化は `button` と同じ outline の指定に揃える。`outline-none` は併記しない。
 * Tailwind v4 の `outline-none` は `--tw-outline-style: none` を立てるため、`focus-visible` 側の
 * outline 指定まで打ち消してしまう。
 *
 * 意味論は checkbox であり `role="switch"` は与えない。`switch` role は `aria-checked` を必須と
 * するが、uncontrolled な native input では利用者の操作で React が再 render されないため同期
 * できず、実状態と食い違う `aria-checked` は checkbox として読み上げるより有害である。支援技術へ
 * 「入り / 切り」として伝える必要がある場合は、Radix が状態と role を対応させる client island の
 * `SwitchClient` を使う。
 *
 * この部品はラベルを持たない。何の設定かは `Label` などで呼び出し元が関連付ける。
 *
 * @param props - native `input` 属性。`type` は固定のため指定できない。native の `size`
 *   属性は text 入力の文字数を表すもので switch には意味がないため、表示サイズの props で置き換える。
 * @param props.size - 表示サイズ。{@link SWITCH_SIZE} のいずれか。
 * @see Storybook `Form/SwitchNative`
 */
export function SwitchNative({
  className,
  size = SWITCH_SIZE.DEFAULT,
  ...props
}: SwitchNativeProps) {
  return (
    <input
      className={cn(
        "peer relative inline-flex shrink-0 appearance-none items-center rounded-full border border-transparent bg-input shadow-xs transition-colors",
        "data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        "after:absolute after:top-1/2 after:left-0 after:-translate-y-1/2 after:rounded-full after:bg-background after:transition-transform after:content-['']",
        "data-[size=default]:after:size-4 data-[size=sm]:after:size-3",
        "checked:bg-primary checked:after:translate-x-[calc(100%-2px)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-size={size}
      data-slot="native-switch"
      type="checkbox"
      {...props}
    />
  );
}
