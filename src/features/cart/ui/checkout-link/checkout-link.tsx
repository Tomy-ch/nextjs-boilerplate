import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_SIZE } from "@/components/design-system/action/button/button.definition";
import type { Cart } from "@/model/cart/cart";

import { canCheckout } from "../../checkout";
import { CHECKOUT_PATH } from "../../paths";

/** `CartCheckoutLink` の props。 */
export type CartCheckoutLinkProps = {
  /** 進める先のカート。 */
  cart: Cart;
  /** 器に合わせた大きさ。脇の領域は小さく、全画面は既定。 */
  size?: (typeof BUTTON_SIZE)[keyof typeof BUTTON_SIZE];
};

const LABEL = "購入手続きへ";

/**
 * 購入手続きへ進む操作。
 *
 * @remarks
 * **買える明細が 1 つも無ければ押せません。** 進んだ先で「買えるものがない」と伝えるより、進めない
 * ことを明細の隣で見せるほうが、利用者が次に取る行動に近い場所にあります。判定は
 * [`canCheckout`](../../checkout.ts) が持ち、この部品は見せ方だけを持ちます。
 *
 * 押せない状態を link のままにしません。link は押せば必ず移動するもので、移動しない link は
 * 支援技術から見ると壊れた導線です。
 */
export function CartCheckoutLink({ cart, size = BUTTON_SIZE.DEFAULT }: CartCheckoutLinkProps) {
  if (!canCheckout(cart)) {
    return (
      <Button className="w-full" disabled size={size} type="button">
        {LABEL}
      </Button>
    );
  }

  return (
    <Button asChild className="w-full" size={size}>
      <Link href={CHECKOUT_PATH}>{LABEL}</Link>
    </Button>
  );
}
