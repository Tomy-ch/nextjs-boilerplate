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
 * **入っていることは、塗りと印の 2 つで示す。** 塗りだけだと、候補が縦に並ぶ場でどれが入って
 * いるかを色の違いだけで読むことになる。印は `CheckboxClient` と同じ位置・同じ token の色で
 * 描いており、同じ checkbox が場所によって違う顔にならない。
 *
 * @see Storybook `Form/CheckboxNative`
 */
export function CheckboxNative({ className, ...props }: CheckboxNativeProps) {
  return (
    <input
      className={cn(
        "relative size-4 shrink-0 appearance-none rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow] checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        // 画像ではなく罫線で描く。画像にすると色が焼き付き、面（surface）や配色で
        // token が変わっても追従しない。
        "checked:after:absolute checked:after:top-[45%] checked:after:left-1/2 checked:after:h-[9px] checked:after:w-[5px] checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:rotate-45 checked:after:border-primary-foreground checked:after:border-r-2 checked:after:border-b-2 checked:after:content-['']",
        className,
      )}
      data-slot="native-checkbox"
      type="checkbox"
      {...props}
    />
  );
}
