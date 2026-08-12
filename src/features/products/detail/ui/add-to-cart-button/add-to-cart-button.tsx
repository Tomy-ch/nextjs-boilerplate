"use client";

import { ShoppingCartIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { type CartLineInput, useCartStore } from "@/stores/cart-store";

/** `AddToCartButton` の props。 */
export type AddToCartButtonProps = {
  /** カートへ入れる 1 行。表示に要る値は追加した時点のものを渡す。 */
  line: CartLineInput;
};

/**
 * 商品をカートへ入れる操作。
 *
 * @remarks
 * カートの状態は `stores` カーネルが持ちます。商品側とカート側は別の feature であり、どちらかが
 * 相手を参照すると feature 間の依存になるためです（[0023](../../../../docs/adr/0023-stores-kernel.md)）。
 *
 * 在庫ぶんすべてカートに入っている場合は押せなくします。押しても何も起きない操作を残すと、
 * 反応が無いのか上限なのかが利用者から区別できません。在庫が無い商品もこの判定に含まれます。
 *
 * 押した結果はカートが開くことで伝わります。この操作のためだけの通知は出しません。開くのは store の
 * 責務で、この部品は追加を頼むだけです（脇に常設できる幅では既に見えているため何も動きません）。
 */
export function AddToCartButton({ line }: AddToCartButtonProps) {
  const add = useCartStore((state) => state.add);
  const quantityInCart = useCartStore(
    (state) => state.lines.find((existing) => existing.productId === line.productId)?.quantity ?? 0,
  );
  const addLine = useCallback(() => add(line), [add, line]);

  return (
    <Button
      className="w-full lg:w-auto"
      disabled={quantityInCart >= line.stockQuantity}
      onClick={addLine}
      size="lg"
      type="button"
    >
      <ShoppingCartIcon aria-hidden="true" className="size-4" />
      カートに追加
    </Button>
  );
}
