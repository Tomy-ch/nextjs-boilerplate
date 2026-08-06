import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/** {@link CheckboxNative} の props。 */
export type CheckboxNativeProps = Omit<ComponentProps<"input">, "type">;

/**
 * 二値の form 入力に使う、SSR first の native checkbox 部品。
 *
 * @remarks
 * 初期表示と form 送信に browser JavaScript を必要としない。`name` と `value` は native form
 * の属性として使える。`indeterminate` や custom popup のように browser state が必要な場合は、
 * client island の `CheckboxClient` を使う。
 *
 * @see Storybook `Form/CheckboxNative`
 */
export function CheckboxNative({ className, ...props }: CheckboxNativeProps) {
  return (
    <input
      className={cn(
        "size-4 shrink-0 appearance-none rounded-[4px] border border-input bg-background shadow-xs transition-[color,box-shadow] checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      data-slot="native-checkbox"
      type="checkbox"
      {...props}
    />
  );
}
