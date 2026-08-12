"use client";

import { ShoppingCartIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { type CartLineInput, useCartStore } from "@/stores/cart-store";

/** `AddToCartButton` の props。 */
export type AddToCartButtonProps = {
  /** カートへ入れる 1 行。表示に要る値は追加した時点のものを渡す。 */
  line: CartLineInput;
  /**
   * 一覧の 1 件に添える形で出すか。
   *
   * 既定は画面の主操作としての形で、幅を占めて大きく出す。一覧では 1 件ぶんの枠に他の情報と
   * 並ぶため、内容の幅に収める。小さくしすぎないのは、一覧でも指で押す対象であることが
   * 変わらないためで、`size` は既定より下げない。
   */
  compact?: boolean;
};

/**
 * 商品をカートへ入れる操作。
 *
 * @remarks
 * カートの状態は `stores` カーネルが持ちます（[0023](../../../docs/adr/0023-stores-kernel.md)）。
 *
 * **在庫ぶんすべて入っている場合は押せません。** 在庫が無い商品もこの判定に含まれます
 * （理由は [cart の README](../../../features/cart/README.md)）。
 *
 * 押した結果はカートが開くことで伝わり、この操作のためだけの通知は出しません。開くのは store の
 * 責務で、この部品は追加を頼むだけです。
 *
 * 画面の下には置かれません。詳細と一覧の両方から使うため、どこへ置くかは呼び出し元が決めます。
 */
export function AddToCartButton({ line, compact = false }: AddToCartButtonProps) {
  const add = useCartStore((state) => state.add);
  const quantityInCart = useCartStore(
    (state) => state.lines.find((existing) => existing.productId === line.productId)?.quantity ?? 0,
  );
  const addLine = useCallback(() => add(line), [add, line]);

  return (
    <Button
      className={compact ? undefined : "w-full lg:w-auto"}
      disabled={quantityInCart >= line.stockQuantity}
      onClick={addLine}
      size={compact ? "default" : "lg"}
      type="button"
    >
      <ShoppingCartIcon aria-hidden="true" className="size-4" />
      カートに追加
    </Button>
  );
}
