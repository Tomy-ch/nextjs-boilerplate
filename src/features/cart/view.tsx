import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import type { Cart } from "@/model/cart/cart";
import { formatMoney } from "@/model/money";

import { isPurchasable } from "./issue-notice";
import { CHECKOUT_PATH } from "./paths";
import { CartClearButton } from "./ui/clear-button/clear-button";
import { CartLineRow } from "./ui/line-row/line-row";

/** `CartView` の props。 */
export type CartViewProps = {
  /** 表示するカート。 */
  cart: Cart;
};

/** 商品を探しに戻る先。 */
const PRODUCTS_PATH = "/products";

/**
 * カートの全画面表示。
 *
 * @remarks
 * 明細と集計を左右に分け、広い幅では集計を貼り付けます。明細が伸びても小計と先へ進む導線が
 * 画面の中に残るためで、狭い幅では縦に積みます（帯の定義は
 * [0051](../../../docs/adr/0051-styling-system.md) §2）。
 *
 * 小計はバックエンドが返した値をそのまま出します。買える明細だけを合算した参考値であり、
 * 買えない明細を含む合計はどこにもありません。
 *
 * **買える明細が 1 つも無い状態では購入手続きへ進ませません。** 進んだ先で「買えるものがない」と
 * 伝えるより、進めない理由をこの画面で見せるほうが、利用者が次に取る行動に近い場所にあります。
 */
export function CartView({ cart }: CartViewProps) {
  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <p className="text-muted-foreground">カートに商品が入っていません。</p>
        <Button asChild variant="outline">
          <Link href={PRODUCTS_PATH}>商品を探す</Link>
        </Button>
      </div>
    );
  }

  const purchasableCount = cart.lines.filter(isPurchasable).length;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <section aria-label="カートの明細" className="min-w-0 flex-1">
        <ul className="flex flex-col divide-y border-y">
          {cart.lines.map((line) => (
            <CartLineRow key={line.productId} line={line} />
          ))}
        </ul>
        <div className="flex justify-end pt-4">
          <CartClearButton />
        </div>
      </section>

      <aside
        aria-label="お支払い金額"
        className="flex w-full flex-col gap-4 rounded-lg border p-4 lg:sticky lg:top-20 lg:w-80"
      >
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground text-sm">小計</span>
          <strong className="text-2xl">{formatMoney(cart.subtotalAmount)}</strong>
        </p>
        <p className="text-muted-foreground text-xs">
          買える明細だけを合算した金額です。送料や税は購入手続きで確定します。
        </p>
        {purchasableCount === 0 ? (
          <>
            <p className="text-destructive text-sm">
              今すぐ買える商品がありません。買えない明細を取り除くか、数量を減らしてください。
            </p>
            <Button className="w-full" disabled type="button">
              購入手続きへ
            </Button>
          </>
        ) : (
          <Button asChild className="w-full">
            <Link href={CHECKOUT_PATH}>購入手続きへ</Link>
          </Button>
        )}
      </aside>
    </div>
  );
}
