"use client";

import { HoverCard as HoverCardPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/components/cn";

/**
 * trigger の hover または keyboard focus に応じて補足情報を表示する client-side root。
 *
 * @remarks
 * Portal と Radix の interaction を使うため hydration が必要です。hover だけでは到達できない
 * touch device を考慮し、内容が重要な場合は常時表示または別の明示的な導線も用意します。
 *
 * 補足の表示だけを担い、内容の取得は持ちません。開閉の遅延は `openDelay` / `closeDelay` で
 * 調整します。
 *
 * @example
 * ```tsx
 * <HoverCard>
 *   <HoverCardTrigger asChild>
 *     <a href="/help/pricing">料金の考え方</a>
 *   </HoverCardTrigger>
 *   <HoverCardContent>
 *     利用量に応じて課金されます。無料枠を超えた分だけが対象です。
 *   </HoverCardContent>
 * </HoverCard>
 * ```
 *
 * @param props - Radix `HoverCard.Root` の props。
 * @see Storybook `Overlay/HoverCard`
 */
function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

/**
 * 補足を開く起点。
 *
 * @remarks
 * 既定では素の `span` として描画されます。link や button を起点にする場合は `asChild` を指定し、
 * 単一の要素を子として渡します。keyboard 利用者が到達できるよう、起点は focus できる要素に
 * します。
 *
 * @param props - Radix `HoverCard.Trigger` の props。
 * @see Storybook `Overlay/HoverCard`
 */
function HoverCardTrigger({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

/**
 * trigger の近くに開く補足の面。
 *
 * @remarks
 * Portal で `body` 直下へ描画されるため、呼び出し元の `overflow` や `z-index` に切り取られません。
 * その代わり DOM 上は trigger の兄弟ではなくなるので、test で取得するときは `container` ではなく
 * `baseElement` を見ます。
 *
 * hover でしか開かないため、**ここにしか無い情報を置きません。** 操作や重要な内容は本文側にも
 * 置きます。
 *
 * @param props - Radix `HoverCard.Content` の props。
 * @param props.align - trigger に対する寄せ方向。
 * @param props.sideOffset - trigger との間隔（px）。
 * @see Storybook `Overlay/HoverCard`
 */
function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
