import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/**
 * 読み込み中のコンテンツ形状を示す、装飾専用の Server Component。
 *
 * @remarks
 * 利用者へ読み込み状態を伝える role や文言は持たない。feature が近くに意味のある loading message
 * を置き、Skeleton は最終コンテンツに近い大きさだけを表現する。`prefers-reduced-motion` 時は
 * animation を停止する。
 */
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
