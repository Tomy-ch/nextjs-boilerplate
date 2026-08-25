import { notFound } from "next/navigation";

import { readReferenceAmount } from "@/adapters/server/api/exchange-rates";
import { getMyPurchase } from "@/adapters/server/api/purchases";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { Purchase } from "@/model/purchase/purchase";

import type { RawSearchParams } from "@/model/search-params";
import { withScreenSpan } from "@/observability/render-span";
import { readPurchaseCode } from "./purchase-code";
import { CheckoutCompleteView } from "./view";

/** `CheckoutCompletePageContent` の props。 */
export type CheckoutCompletePageContentProps = {
  /** route が受け取った検索条件。どの購入を見せるかがここに載る。 */
  searchParams: RawSearchParams;
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
 * 購入完了の取得と組み立て。
 *
 * @remarks
 * **確定の応答をそのまま描かず、購入を取り直します。** 完了を別の URL に置いたので、再読み込みでも
 * 共有でも同じ内容が出ます。取り直す先は契約が持つ購入 1 件の取得で、明細の商品名もそこで解決
 * されて届きます。
 *
 * 指し先が読めない場合も `not-found` にします。確定を経ずに開かれた URL であり、見せる購入が
 * ありません。
 */
export const CheckoutCompletePageContent = withScreenSpan(
  "features/checkout/complete/page-content",
  async ({ searchParams }: CheckoutCompletePageContentProps) => {
    const purchaseCode = readPurchaseCode(searchParams);

    if (purchaseCode === null) {
      notFound();
    }

    const purchase = await loadPurchase(purchaseCode);

    return (
      <CheckoutCompleteView
        purchase={purchase}
        reference={await readReferenceAmount(purchase.totalAmount)}
      />
    );
  },
);
