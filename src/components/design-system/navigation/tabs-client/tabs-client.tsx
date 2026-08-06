"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/**
 * 同一 URL のまま複数のパネルを切り替える client island の tabs root。
 *
 * @remarks
 * 選択中の tab を browser 側の state として保持するため hydration が必要で、Server Component から
 * 直接 render できない。パネルの内容自体に client runtime が要らない場合は、Server Component で
 * 組み立てた要素を `TabsClientContent` の `children` として渡す。
 *
 * 選び分けは見た目ではなく取得コストで決める。この component は表示していない観点のパネルまで
 * 初期表示に載せるため、観点ごとに取得が分かれる場合や内容が大きい場合は `TabsNative` を使う。
 * こちらを選ぶのは、取得済みの内容を URL に載せずに出し分けるだけの場合に限る。
 *
 * `value` を渡すと制御 component、`defaultValue` を渡すと非制御 component として動く。各 tab と
 * パネルは `value` の一致で対応づけられる。
 *
 * @param props - Radix `Tabs.Root` の props。`orientation` は `horizontal`（既定）と `vertical` を
 *   受け取り、矢印キーの移動方向に反映される。
 *
 * @see Storybook `Navigation/TabsClient`
 */
export function TabsClient({
  className,
  orientation = "horizontal",
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      data-orientation={orientation}
      data-slot="tabs"
      orientation={orientation}
      {...props}
    />
  );
}

/** {@link TabsClientList} の見た目の variant。 */
export const tabsClientListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * tab を並べる領域。
 *
 * @remarks
 * `role="tablist"` を持つ。同じ画面に複数の tabs を置く場合は、どの切り替えなのかが判るよう
 * `aria-label` で名前を与える。矢印キーによる tab 間の移動と roving tabindex はここが担うため、
 * `TabsClientTrigger` 以外の focus 可能な要素を直接の子に置かない。
 *
 * @param props - Radix `Tabs.List` の props と `variant`。`variant` は面で示す `default` と、
 *   下線で示す `line` を選べる。
 *
 * @see Storybook `Navigation/TabsClient`
 */
export function TabsClientList({
  className,
  variant = "default",
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsClientListVariants>) {
  return (
    <TabsPrimitive.List
      className={cn(tabsClientListVariants({ variant }), className)}
      data-slot="tabs-list"
      data-variant={variant}
      {...props}
    />
  );
}

/**
 * パネルを選択する tab。
 *
 * @remarks
 * `role="tab"` を持ち、対応する `TabsClientContent` と同じ `value` で結び付く。選択中は
 * `aria-selected` と `data-state="active"` が付く。
 *
 * 表示する文言が tab のアクセシブルな名前になる。icon だけを置く場合は `aria-label` を添える。
 *
 * @param props - Radix `Tabs.Trigger` の props。`value` は必須で、対応するパネルと一致させる。
 * @see Storybook `Navigation/TabsClient`
 */
export function TabsClientTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

/**
 * tab に対応するパネル。
 *
 * @remarks
 * `role="tabpanel"` を持ち、選択中の 1 枚だけが render される。既定では非選択のパネルが DOM から
 * 外れるため、入力途中の値を保持したい場合は呼び出し元が state を持つか `forceMount` を指定する。
 *
 * @param props - Radix `Tabs.Content` の props。`value` は必須で、対応する tab と一致させる。
 * @see Storybook `Navigation/TabsClient`
 */
export function TabsClientContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className,
      )}
      data-slot="tabs-content"
      {...props}
    />
  );
}
