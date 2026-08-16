import type { Cart } from "@/model/cart/cart";
import { formatMoney } from "@/model/money";

import { canCheckout } from "../../checkout";
import { CartCheckoutLink } from "../checkout-link/checkout-link";

/** `CartSummaryCard` の props。 */
export type CartSummaryCardProps = {
  /** 集計するカート。 */
  cart: Cart;
};

/**
 * 小計と先へ進む導線。
 *
 * @remarks
 * 器を持ちません。広い幅では本文の脇に貼り付き、狭い幅では画面の下から出てくるため、位置は
 * 呼び出し元が決めます。
 *
 * 小計はバックエンドが返した値です。買える明細だけを合算した参考値であり、ここでは足し直しません
 * （[0070](../../../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * **買える明細が 1 つも無い状態では購入手続きへ進ませません。** 進んだ先で「買えるものがない」と
 * 伝えるより、進めない理由を明細の隣で見せるほうが、利用者が次に取る行動に近い場所にあります。
 */
export function CartSummaryCard({ cart }: CartSummaryCardProps) {
  const purchasable = canCheckout(cart);

  return (
    <div className="flex flex-col gap-4" data-slot="cart-summary-card">
      <p className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-sm">小計</span>
        <strong className="text-2xl">{formatMoney(cart.subtotalAmount)}</strong>
      </p>
      <div className="flex flex-col gap-1 text-muted-foreground text-xs">
        <p>買える明細だけを合算した金額です。</p>
        <p>送料や税は購入手続きで確定します。</p>
      </div>
      {purchasable ? null : (
        <p className="text-destructive text-sm">
          今すぐ買える商品がありません。買えない明細を取り除くか、数量を減らしてください。
        </p>
      )}
      <CartCheckoutLink cart={cart} />
    </div>
  );
}
