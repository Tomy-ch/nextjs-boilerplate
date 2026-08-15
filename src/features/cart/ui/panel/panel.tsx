"use client";

import { XIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/design-system/action/button/button";
import type { Cart } from "@/model/cart/cart";
import { useCartStore } from "@/stores/cart-store";

import { CartContents } from "../contents/contents";
import { useHasPendingRemoval } from "../removal-notice/removal-notice";

/** `CartPanel` の props。 */
export type CartPanelProps = {
  /** 表示するカート。 */
  cart: Cart;
};

/**
 * カートの中身を本文の脇に常設する領域。
 *
 * @remarks
 * カートが空の間は枠ごと描画しません。中身の無い枠が常に場所を取ると、本文の幅がカートの有無で
 * 変わらないぶん、空白だけが残ります。
 *
 * **`lg` 未満では出しません**（タブレットを含む。境界の根拠は
 * [0051](../../../../../docs/adr/0051-styling-system.md) §2）。本文の下へ積むと内側のスクロールが外側の
 * スクロールを奪い、本文へ戻れなくなるため、`lg` 未満は本文へ被せる `CartHeaderAction` が受け持ちます。
 *
 * 出し分けを CSS で行うのは、本文の幅がカートの有無で変わるためです（hydration を待つと幅が動きます）。
 *
 * **取り消しを抱えているあいだは、空でも枠を残します。** 最後の 1 件を取り除いた直後に枠ごと消すと、
 * 戻す手段が同時に消えます。
 *
 * **開いているかどうかは幅によらず store の要求に従います。** 脇に常設できる幅でも、この領域は本文から
 * 280px 前後を持っていきます。閉じられないと、一度カートへ入れた利用者は一覧を狭いまま読み続けることに
 * なります。閉じた後は header の入口から開き直せます。
 */
export function CartPanel({ cart }: CartPanelProps) {
  const isOpen = useCartStore((state) => state.isOpen);
  const setOpen = useCartStore((state) => state.setOpen);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const hasPendingRemoval = useHasPendingRemoval(cart.lines.map((line) => line.productId));

  if ((cart.lines.length === 0 && !hasPendingRemoval) || !isOpen) {
    return null;
  }

  return (
    <aside
      aria-label="カート"
      className="hidden lg:block lg:w-72 lg:shrink-0 lg:border-l"
      data-slot="cart-panel"
    >
      <div className="sticky top-14 flex max-h-[calc(100dvh-3.5rem)] flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm">カート</p>
          <Button
            aria-label="カートを閉じる"
            onClick={close}
            size="sm"
            type="button"
            variant="ghost"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <CartContents cart={cart} />
      </div>
    </aside>
  );
}
