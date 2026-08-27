"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/components/cn";
import { SWITCH_SIZE, type SwitchSize } from "../switch-native/switch-native.definition";

/**
 * 設定の ON / OFF を切り替える client island の switch 部品。
 *
 * @remarks
 * 切り替えを React state として扱うため hydration が必要で、Server Component からは直接
 * render できない。form 送信と初期表示だけで足りる場合は SSR first の `SwitchNative` を使う。
 *
 * この部品を選ぶのは、切り替えた結果を即座に画面へ反映する、楽観更新して失敗時に元へ戻す、
 * 他の入力と状態を同期する、といった browser state が要る場合に限る。
 *
 * `role="switch"` は Radix が付与する。ラベルは持たないため、何の設定かは `Label` などで
 * 呼び出し元が関連付ける。
 *
 * focus の可視化は `button` / `input` と同じ outline の指定に揃える。生成物は `ring` を使うが、
 * その色トークンが未定義で focus 位置がまったく見えなくなる。
 *
 * @param props - Radix `Switch.Root` の props。`checked` / `onCheckedChange` で状態を扱う。
 * @param props.size - 表示サイズ。{@link SWITCH_SIZE} のいずれか。
 *
 * @see Storybook `Form/SwitchClient`
 */
function SwitchClient({
  className,
  size = SWITCH_SIZE.DEFAULT,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: SwitchSize;
}) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        className,
      )}
      data-size={size}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground",
        )}
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { SwitchClient };
