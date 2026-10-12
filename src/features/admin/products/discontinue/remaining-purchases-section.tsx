import { getInProgressPurchasesOfProduct } from "@/adapters/server/api/purchases";
import { getLogger, reportQuietly } from "@/logging/logging.server";
import type { ProductId } from "@/model/product/product";
import { withScreenSpan } from "@/observability/render-span";

import { adminProductDiscontinuePath } from "../../paths";
import {
  DiscontinueRemainingPurchases,
  type RemainingPurchasesState,
} from "./ui/remaining-purchases/remaining-purchases";

/** 並べる件数の上限。ページ送りを持たないため、1 画面で見渡せる長さに留める。 */
const REMAINING_PURCHASES_LIMIT = 20;

/** `RemainingPurchasesSection` の props。 */
export type RemainingPurchasesSectionProps = {
  /** 廃番にしようとしている商品。 */
  productId: ProductId;
  /** 見積もりが数えた進行中の購入の件数。 */
  expectedCount: number;
};

/**
 * 廃番を拒ませている、進行中の購入を読む区画。
 *
 * @remarks
 * **見積もりとは別に待ち、別に失敗します。** 読めなかったときに見積もりまで失わないよう、失敗は
 * 境界へ投げず、この区画の表示として受けます。
 */
export const RemainingPurchasesSection = withScreenSpan(
  "features/admin/products/discontinue/remaining-purchases-section",
  async ({ expectedCount, productId }: RemainingPurchasesSectionProps) => {
    let state: RemainingPurchasesState;

    try {
      const page = await getInProgressPurchasesOfProduct(productId, REMAINING_PURCHASES_LIMIT);

      state = {
        status: "ready",
        items: page.items,
        partial: page.nextCursor !== null || page.items.length < expectedCount,
      };
    } catch (cause) {
      reportQuietly(() =>
        getLogger().warn("廃番を拒ませている購入を読めませんでした", { cause: String(cause) }),
      );
      state = { status: "failed" };
    }

    return (
      <DiscontinueRemainingPurchases
        reloadHref={adminProductDiscontinuePath(productId)}
        state={state}
      />
    );
  },
);
