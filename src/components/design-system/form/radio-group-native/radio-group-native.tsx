import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/** {@link RadioGroupNative} の props。 */
export type RadioGroupNativeProps = ComponentProps<"fieldset">;

/**
 * SSR first の native radio group を構成する fieldset。
 *
 * @see Storybook `Form/RadioGroupNative`
 */
export function RadioGroupNative({ className, ...props }: RadioGroupNativeProps) {
  return (
    <fieldset className={cn("grid gap-3", className)} data-slot="radio-group-native" {...props} />
  );
}

/** {@link RadioGroupNativeItem} の props。 */
export type RadioGroupNativeItemProps = Omit<ComponentProps<"input">, "type">;

/**
 * SSR first の native radio input。複数項目で同じ `name` を指定する。
 *
 * @see Storybook `Form/RadioGroupNative`
 */
export function RadioGroupNativeItem({ className, ...props }: RadioGroupNativeItemProps) {
  return (
    <input
      className={cn(
        "aspect-square size-4 shrink-0 appearance-none rounded-full border border-input bg-background shadow-xs transition-[border-color,box-shadow] checked:border-[5px] checked:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      data-slot="radio-group-native-item"
      type="radio"
      {...props}
    />
  );
}
