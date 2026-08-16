import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import type { Cart } from "@/model/cart/cart";

import { CartClearButton } from "./ui/clear-button/clear-button";
import { CartLineList } from "./ui/line-list/line-list";
import { CartLineRow } from "./ui/line-row/line-row";
import { CartRemovalNoticeList } from "./ui/removal-notice/removal-notice";
import { CartSummaryCard } from "./ui/summary-card/summary-card";
import { CartSummaryDock } from "./ui/summary-dock/summary-dock";

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
 * 画面の中に残るためで、脇に置けない幅では画面の下から出す引き出しが同じ役割を持ちます
 * （帯の定義は [0051](../../../docs/adr/0051-styling-system.md) §2）。
 *
 * 同じ集計を 2 か所に置いていますが、**出るのはどちらか一方だけ**です。器の出し分けは CSS で行い、
 * 中身は `CartSummaryCard` に 1 つだけ持ちます。
 *
 * 明細の下端には引き出しのぶんの余白を空けます。空けないと、最後の行の操作が引き出しに隠れます。
 */
export function CartView({ cart }: CartViewProps) {
  const presentProductIds = cart.lines.map((line) => line.productId);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <CartRemovalNoticeList presentProductIds={presentProductIds} />
        <p className="text-muted-foreground">カートに商品が入っていません。</p>
        <Button asChild variant="outline">
          <Link href={PRODUCTS_PATH}>商品を探す</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8 pb-24 lg:flex-row lg:items-start lg:pb-0">
        <section aria-label="カートの明細" className="flex min-w-0 flex-1 flex-col gap-4">
          <CartLineList
            className="border-y"
            presentProductIds={presentProductIds}
            rows={cart.lines.map((line, index) => (
              <CartLineRow index={index} key={line.productId} line={line} />
            ))}
          />
          <div className="flex justify-end">
            <CartClearButton />
          </div>
        </section>

        <aside
          aria-label="お支払い金額"
          className="hidden w-full rounded-lg border p-4 lg:sticky lg:top-20 lg:block lg:w-80"
        >
          <CartSummaryCard cart={cart} />
        </aside>
      </div>

      <CartSummaryDock>
        <CartSummaryCard cart={cart} />
      </CartSummaryDock>
    </>
  );
}
