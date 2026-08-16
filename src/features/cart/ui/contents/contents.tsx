import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { ScrollArea } from "@/components/design-system/container/scroll-area/scroll-area";
import type { Cart } from "@/model/cart/cart";
import { formatMoney } from "@/model/money";

import { isPurchasable } from "../../issue-notice";
import { CART_PATH, CHECKOUT_PATH } from "../../paths";
import { CartClearButton } from "../clear-button/clear-button";
import { CartLineList } from "../line-list/line-list";
import { CartLineRow } from "../line-row/line-row";
import { CartRemovalNotice } from "../removal-notice/removal-notice";

/** `CartContents` の props。 */
export type CartContentsProps = {
  /** 表示するカート。 */
  cart: Cart;
};

/**
 * カートの中身。小計・導線・明細を縦に並べる。
 *
 * @remarks
 * 器を持ちません。脇の領域として常設する場合と、狭い幅で本文へ被せる場合の両方から使うため、
 * 位置と大きさは呼び出し元が決めます。
 *
 * 小計はバックエンドが返した値です。買える明細だけを合算した参考値であり、この画面では
 * 足し直しません（[0070](../../../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * 小計と先へ進む導線は送りの外に置き、明細だけを局所スクロールさせます。高さを超えた明細を
 * 外側のスクロールに委ねると、器が固定されている場合に届かない行が出ます。**この器では小計が
 * 常に見えているため、全画面の側にある引き出しは要りません。**
 *
 * 導線は 2 本あり、主が購入手続き、副がカートページです（それぞれの理由は
 * [cart の README](../../README.md)）。
 */
export function CartContents({ cart }: CartContentsProps) {
  const presentProductIds = cart.lines.map((line) => line.productId);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <CartRemovalNotice presentProductIds={presentProductIds} />
        <p className="text-muted-foreground text-sm">カートに商品が入っていません。</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-sm">小計</span>
        <strong className="text-lg">{formatMoney(cart.subtotalAmount)}</strong>
      </p>

      <div className="grid gap-2">
        {cart.lines.some(isPurchasable) ? (
          <Button asChild className="w-full" size="sm">
            <Link href={CHECKOUT_PATH}>購入手続きへ</Link>
          </Button>
        ) : (
          <Button className="w-full" disabled size="sm" type="button">
            購入手続きへ
          </Button>
        )}
        <Button asChild className="w-full" size="sm" variant="outline">
          <Link href={CART_PATH}>カートを見る</Link>
        </Button>
      </div>

      <ScrollArea aria-label="カートの明細" className="min-h-0 flex-1">
        <CartLineList
          presentProductIds={presentProductIds}
          rows={cart.lines.map((line, index) => (
            <CartLineRow index={index} key={line.productId} line={line} />
          ))}
        />
      </ScrollArea>

      <CartClearButton />
    </div>
  );
}
