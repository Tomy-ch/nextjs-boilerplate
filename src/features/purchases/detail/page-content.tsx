import { notFound } from "next/navigation";

import { getMyPurchase } from "@/adapters/server/api/purchases";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { Purchase } from "@/model/purchase/purchase";

import { readReferenceAmount } from "../reference-amount";
import { PurchaseDetailView } from "./view";

/** `PurchaseDetailPageContent` の props。 */
export type PurchaseDetailPageContentProps = {
  /**
   * route が受け取った購入の識別子。
   *
   * @remarks
   * 一覧が持っているのは購入コードで、契約の取得口が要求するのは購入 ID です。**この 2 つは
   * 別の値で、一覧の応答から ID は取れません。** 契約側で公開識別子を購入コードへ一本化する
   * のを待っており、それが着地したらこの引数はそのまま購入コードになります。
   */
  purchaseId: string;
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
async function loadPurchase(purchaseId: string): Promise<Purchase> {
  try {
    return await getMyPurchase(purchaseId);
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
export async function PurchaseDetailPageContent({ purchaseId }: PurchaseDetailPageContentProps) {
  const purchase = await loadPurchase(purchaseId);
  const reference = await readReferenceAmount(purchase.totalAmount);

  return <PurchaseDetailView purchase={purchase} reference={reference} />;
}
