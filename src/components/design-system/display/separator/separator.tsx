import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/** {@link Separator} の props。 */
export type SeparatorProps = ComponentProps<"hr"> & {
  /** 読み上げ対象にしない装飾的な区切りか。 */
  decorative?: boolean;
  /** 区切り線の方向。 */
  orientation?: "horizontal" | "vertical";
};

/**
 * 近接する内容を視覚的・意味論的に区切る、SSR first の separator。
 *
 * @remarks
 * 装飾だけなら `decorative` を指定して screen reader の読み上げ対象から外す。操作・状態・余白を
 * 持たないため、client runtime は必要ない。
 *
 * @see Storybook `Display/Separator`
 */
export function Separator({
  className,
  decorative = false,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  const separatorClassName = cn(
    "shrink-0 bg-border",
    orientation === "horizontal" ? "h-px w-full" : "h-full w-px self-stretch",
    className,
  );

  if (decorative || orientation === "vertical") {
    return (
      <div
        className={separatorClassName}
        data-orientation={orientation}
        data-slot="separator"
        {...props}
      />
    );
  }

  return (
    <hr
      className={separatorClassName}
      data-orientation={orientation}
      data-slot="separator"
      {...props}
    />
  );
}
