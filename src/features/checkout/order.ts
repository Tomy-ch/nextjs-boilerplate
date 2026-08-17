import type { Cart } from "@/model/cart/cart";
import { isPurchasable } from "@/model/cart/issue-notice";
import type { PurchaseOrderLine } from "@/model/purchase/purchase";

/**
 * カートのうち、この購入に載せる明細を取り出す。
 *
 * @remarks
 * **事情が立っている明細は載せません。** 買えない明細を載せられないのは当然として、値が変わった
 * だけの明細も外します。小計はそれらを除いた合算であり
 * （[0070](../../../docs/adr/0070-backend-role-separation.md)）、載せてしまうと画面が見せた金額と
 * 請求額が食い違います。
 *
 * 外した明細はカートに残ります。値が変わった明細を買うには、カートで新しい価格を確かめ直す
 * ことになります。
 */
export function orderLinesOf(cart: Cart): readonly PurchaseOrderLine[] {
  return cart.lines
    .filter(isPurchasable)
    .map(({ productId, quantity }) => ({ productId, quantity }));
}

/**
 * この購入に載らない明細があるか。
 *
 * @remarks
 * 何件外れたかは数えません。外れた明細はそれぞれ理由とともに画面へ出るため、数だけを別に
 * 持つと同じことを 2 通りで言うことになります。
 */
export function hasExcludedLines(cart: Cart): boolean {
  return cart.lines.some((line) => !isPurchasable(line));
}
