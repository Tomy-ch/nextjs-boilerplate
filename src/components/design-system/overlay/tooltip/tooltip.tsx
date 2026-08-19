"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/**
 * 配下の Tooltip が表示遅延を共有するための境界。
 *
 * @remarks
 * `Tooltip` はこの Provider を祖先に必要とし、無い場合は render 時に例外になる。app shell や
 * tooltip を使う画面の外側で一度だけ mount し、`Tooltip` ごとに入れ子で置かない。同じ Provider を
 * 共有する tooltip の間では、一つ開いた後に別の trigger へ移ると遅延を挟まず切り替わる。
 * Provider を分けるとこの連続性が失われる。
 *
 * hydration が必要な client island であり、Server Component からは直接 render できない。
 *
 * @param props - Radix `Tooltip.Provider` の props。`delayDuration` は hover から表示までの
 *   待ち時間（ミリ秒、既定は `0`）、`skipDelayDuration` は連続表示で遅延を省く猶予、
 *   `disableHoverableContent` は内容の上へ pointer を移せなくする指定。
 *
 * @see Storybook `Overlay/Tooltip`
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

/**
 * trigger の hover / keyboard focus に応じて短い補足を表示する tooltip root。
 *
 * @remarks
 * `TooltipProvider` の配下でのみ使える。表示位置の計算・遅延・Escape の interaction を browser 側で
 * 行うため hydration が必要で、Server Component からは直接 render できない。内容自体に client
 * runtime が要らない場合は、Server Component で組み立てた要素を `children` として渡す。
 *
 * tooltip は pointer hover と keyboard focus でしか開かないため、touch 環境では到達できない。
 * 操作や判断に不可欠な情報は tooltip だけに置かず、常時表示または明示的な導線を feature 側にも
 * 用意する。
 *
 * @param props - Radix `Tooltip.Root` の props。`open` / `defaultOpen` / `onOpenChange` で開閉を
 *   制御でき、省略時は trigger の hover と focus だけで開閉する。
 *
 * @see Storybook `Overlay/Tooltip`
 */
function Tooltip({ ...props }: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

/**
 * Tooltip を開く trigger。
 *
 * @remarks
 * 既定では `button` を render する。`Button` や link を trigger にする場合は `asChild` を指定して
 * 単一の子要素へ合成する。
 *
 * trigger 自身のアクセシブルな名前は必ず trigger 側で与える。`TooltipContent` は開いている間だけ
 * `aria-describedby` で結び付く**説明**であり、名前にはならない。icon だけの trigger には
 * `aria-label` か視覚的に隠したテキストを添える。名前が tooltip の内容と重複する場合でも、
 * 閉じている間に名前を失うより重複させるほうがよい。
 *
 * @param props - Radix `Tooltip.Trigger` の props。
 *
 * @see Storybook `Overlay/Tooltip`
 */
function TooltipTrigger({ ...props }: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * Portal へ表示する tooltip の内容。
 *
 * @remarks
 * `role="tooltip"` を持ち、開いている間だけ trigger の `aria-describedby` から参照される。
 * 短い説明文だけを置き、link・button・入力などの focus 可能な要素は入れない。pointer が離れると
 * 閉じるため、tooltip 内の操作は到達できない。操作が必要な場合は `Popover` を使う。
 *
 * 面は `bg-foreground` / `text-background` の反転色で描画し、trigger を指す arrow を伴う。ページ
 * 内容の上へ重ねるため面は不透明である必要があり、反転色は同時に、常時表示の補足文と一時的な
 * tooltip を見分けられるようにする。
 *
 * 表示位置は `side` / `align` / `sideOffset` で調整する。arrow が trigger へ接するよう
 * `sideOffset` の既定は `0` である。viewport に収まらない場合は Radix が
 * 自動で反転・調整するため、feature 側で座標を計算しない。
 *
 * @param props - Radix `Tooltip.Content` の props。`className` は既定の見た目へ追加・上書き
 *   できる。
 *
 * @see Storybook `Overlay/Tooltip`
 */
function TooltipContent({
  className,
  children,
  sideOffset = 0,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-xs bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
