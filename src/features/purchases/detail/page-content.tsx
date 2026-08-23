import { notFound } from "next/navigation";

import { readReferenceAmount } from "@/adapters/server/api/exchange-rates";
import { getMyPurchase } from "@/adapters/server/api/purchases";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { Purchase } from "@/model/purchase/purchase";

import { PurchaseDetailView } from "./view";

/** `PurchaseDetailPageContent` の props。 */
export type PurchaseDetailPageContentProps = {
  /** route が受け取った購入コード。利用者へ注文番号として見せている値。 */
  purchaseCode: string;
};

/**
 * 購入を取得し、`not-found` だけを Next の境界へ渡す。
 *
 * @remarks
 * 他人の購入も存在しない購入も、契約は区別せず `not found` にします。指し先を書き換えられても、
 * この画面が他人の購入を映すことはありません。
 *
 * try の範囲は取得だけです。描画中の例外はここでは捕まらないため、捕まるように見える形にしません。
 */
async function loadPurchase(purchaseCode: string): Promise<Purchase> {
  try {
    return await getMyPurchase(purchaseCode);
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}

/**
 * 購入詳細の取得と組み立て。
 *
 * @remarks
 * 参考換算額は取得に失敗しても投げません。請求されたのは基準通貨の金額で、換算額は読み手が
 * 大きさを掴むための添え物だからです（`reference-amount.ts`）。
 *
 * 購入を取ってから換算額を引きます。並行にできますが、購入が `not-found` のときに換算の取得を
 * 始めるのは無駄で、外部のレート提供元へ余計な要求を出すことになります。
 */
export async function PurchaseDetailPageContent({ purchaseCode }: PurchaseDetailPageContentProps) {
  const purchase = await loadPurchase(purchaseCode);
  const reference = await readReferenceAmount(purchase.totalAmount);

  return <PurchaseDetailView purchase={purchase} reference={reference} />;
}
