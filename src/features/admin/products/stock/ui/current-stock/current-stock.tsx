import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { withPartSpan } from "@/observability/render-span";

/** `StockCurrentAmount` の props。 */
export type StockCurrentAmountProps = {
  /** 対象の商品名。 */
  productName: string;
  /** 読み込んだ時点の在庫数。 */
  quantity: number;
  /** 取り直す先。この画面自身を指す。 */
  reloadHref: string;
};

/**
 * いま判っている在庫と、その鮮度。
 *
 * @remarks
 * **増減は相対値で送るため、この数が古くても更新の結果は壊れません**
 * （[`adjustProductStock`](../../../../../../adapters/server/api/products.ts)）。ずれるのは見込みの
 * 値だけで、鮮度を添える理由はそこにあります。
 *
 * 何をどう出すか（鮮度の注記 / 取り直す導線 / 商品名を 2 行で打ち切る）は
 * [画面要件](../../../../../../../docs/spec/route/admin/products/[id]/stock/page.screen.md)。
 */
export const StockCurrentAmount = withPartSpan(
  "features/admin/products/stock/ui/current-stock/current-stock",
  ({ productName, quantity, reloadHref }: StockCurrentAmountProps) => {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border p-4">
        <div className="min-w-0">
          <p className="line-clamp-2 break-words font-emphasis text-sm">{productName}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-muted-foreground text-sm">現在の在庫</span>
            <span className="font-emphasis text-2xl tabular-nums">{quantity}</span>
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            読み込んだ時点の値です。ほかの販売や補充で動いていることがあります。
          </p>
        </div>
        <Button asChild className="shrink-0" size="sm" variant="outline">
          <Link href={reloadHref}>読み込み直す</Link>
        </Button>
      </div>
    );
  },
);
