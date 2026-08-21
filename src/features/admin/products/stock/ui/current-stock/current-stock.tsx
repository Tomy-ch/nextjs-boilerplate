import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";

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
 * **読み込んだ時点の値であることを明示します。**在庫は他の主体の販売・補充でいつでも動くため、
 * ここに出ている数は画面を開いた瞬間の写しです。増減は相対値で送るので古くても結果は壊れません
 * が（[`adjustProductStock`](../../../../../../adapters/server/api/products.ts)）、**見込みの値は
 * ずれます**。それを知らないまま「見込みどおりにならなかった」と読まれるのを避けます。
 *
 * 取り直す導線を常設します。ずれていることが判ってから探すのでは遅く、送る前に確かめたい人が
 * 必ず居ます。
 */
export function StockCurrentAmount({ productName, quantity, reloadHref }: StockCurrentAmountProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{productName}</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-muted-foreground text-sm">現在の在庫</span>
          <span className="font-semibold text-2xl tabular-nums">{quantity}</span>
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
}
