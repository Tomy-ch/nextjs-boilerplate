"use client";

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
import type { Cart } from "@/model/cart/cart";
import { useCartStore } from "@/stores/cart-store";

import { CartContents } from "../contents/contents";
import { CartCount } from "../count/count";

/** `CartHeaderDrawer` の props。 */
export type CartHeaderDrawerProps = {
  /** 表示するカート。 */
  cart: Cart;
};

/**
 * 脇に常設できない幅での、カートの入口と中身。
 *
 * @remarks
 * 本文へ被せる drawer の引き手になります。背面は半透明で覆われ、背面の押下と「閉じる」のどちらでも
 * 閉じます。**引き出す操作は押下だけ**で、画面端からの swipe は持ちません。端からの swipe は
 * browser の戻る操作と競合し、どちらが起きるかが端末ごとに変わります。
 *
 * 開閉は `stores` の要求に従います。商品をカートへ入れたときも開く必要があり、その操作は別の
 * feature にあるためです。
 */
export function CartHeaderDrawer({ cart }: CartHeaderDrawerProps) {
  const isOpen = useCartStore((state) => state.isOpen);
  const setOpen = useCartStore((state) => state.setOpen);

  return (
    <Drawer direction="right" onOpenChange={setOpen} open={isOpen}>
      <DrawerTrigger asChild>
        <Button aria-label="カートを開く" size="sm" type="button" variant="ghost">
          <CartCount count={cart.lines.length} />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex flex-col">
        <DrawerHeader>
          <DrawerTitle>カート</DrawerTitle>
          <DrawerDescription>
            {cart.lines.length === 0
              ? "商品が入っていません。"
              : `${cart.lines.length} 点入っています。`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <CartContents cart={cart} />
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
