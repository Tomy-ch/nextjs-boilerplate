"use client";

import { useMediaQuery } from "@/capabilities/use-media-query";
import { Button } from "@/components/design-system/action/button/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/design-system/overlay/drawer/drawer";
import { useCartStore } from "@/stores/cart-store";

import { CartContents } from "../contents/contents";
import { CartCount } from "../count/count";

/** 脇に常設できない幅。`md` の下限（Tailwind の既定）に合わせる。 */
const NARROW = "(max-width: 767px)";

/**
 * header に置くカートの入口。
 *
 * @remarks
 * 広い幅では点数だけを出します。中身は脇の `CartPanel` が常設しているため、ここから開く必要が
 * ありません。
 *
 * 狭い幅では本文へ被せる drawer の引き手になります。背面は半透明で覆われ、背面の押下と「閉じる」
 * のどちらでも閉じます。**引き出す操作は押下だけ**で、画面端からの swipe は持ちません。端からの
 * swipe は browser の戻る操作と競合し、どちらが起きるかが端末ごとに変わります。
 *
 * 出し分けを CSS ではなく media query の購読で行うのは、drawer が focus trap を持つためです。
 * CSS で隠しても DOM は残るため、広い幅でも focus が閉じ込められます。
 */
export function CartHeaderAction() {
  const isNarrow = useMediaQuery(NARROW);
  const lines = useCartStore((state) => state.lines);

  if (!isNarrow) {
    return <CartCount />;
  }

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button aria-label="カートを開く" size="sm" type="button" variant="ghost">
          <CartCount />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex flex-col">
        <DrawerHeader>
          <DrawerTitle>カート</DrawerTitle>
          <DrawerDescription>
            {lines.length === 0 ? "商品が入っていません。" : `${lines.length} 点入っています。`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <CartContents />
          <DrawerClose asChild>
            <Button className="w-full" size="sm" type="button" variant="ghost">
              閉じる
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
