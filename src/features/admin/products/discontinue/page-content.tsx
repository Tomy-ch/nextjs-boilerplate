import { Suspense } from "react";

import {
  getProductDiscontinueImpact,
  getProductIncludingUnpublished,
} from "@/adapters/server/api/products";
import { newIdempotencyKey } from "@/model/idempotency-key";
import type { ProductId } from "@/model/product/product";
import { withScreenSpan } from "@/observability/render-span";

import { adminProductDiscontinuePath } from "../../paths";
import type { DiscontinueProductAction } from "./form-state";
import { RemainingPurchasesSection } from "./remaining-purchases-section";
import { DiscontinueRemainingPurchases } from "./ui/remaining-purchases/remaining-purchases";
import { AdminProductDiscontinueView, type DiscontinueStanding } from "./view";

/** `AdminProductDiscontinuePageContent` の props。 */
export type AdminProductDiscontinuePageContentProps = {
  /** 廃番にする商品の識別子。 */
  id: ProductId;
  /** 廃番の送信先。 */
  discontinueAction: DiscontinueProductAction;
};

/**
 * 商品を廃番にする画面に要るものを揃える。
 *
 * @remarks
 * **未公開の商品も読みます。** 廃番の商品は非公開になるため、公開済みだけを読む口では実行した
 * 直後の取り直しが not-found に落ちます。存在しない識別子は取得の口が `not-found` へ正規化し、
 * route の境界が受けます。
 *
 * **既に廃番なら見積もりを取りません。**
 *
 * 進行中の購入が残っているときだけ、その並びを別の待機で読みます。
 *
 * **island には鍵を与えません。** 成立や競合のあとの取り直しで island を作り直すと、送信の結果が
 * 消えます。冪等キーは組み立てるたびに 1 つ作り、island が最初の値を持ち続けます。
 *
 * @param props - {@link AdminProductDiscontinuePageContentProps} を参照。
 */
export const AdminProductDiscontinuePageContent = withScreenSpan(
  "features/admin/products/discontinue/page-content",
  async ({ discontinueAction, id }: AdminProductDiscontinuePageContentProps) => {
    const product = await getProductIncludingUnpublished(id);
    const standing: DiscontinueStanding =
      product.discontinuedAt === null
        ? { kind: "open", impact: await getProductDiscontinueImpact(id) }
        : { kind: "discontinued", discontinuedAt: product.discontinuedAt };

    const remainingPurchases =
      standing.kind === "open" && standing.impact.inProgressPurchaseCount > 0 ? (
        <Suspense
          fallback={
            <DiscontinueRemainingPurchases
              reloadHref={adminProductDiscontinuePath(id)}
              state={{ status: "loading" }}
            />
          }
        >
          <RemainingPurchasesSection
            expectedCount={standing.impact.inProgressPurchaseCount}
            productId={id}
          />
        </Suspense>
      ) : null;

    return (
      <AdminProductDiscontinueView
        discontinueAction={discontinueAction}
        idempotencyKey={newIdempotencyKey()}
        product={{ id: product.id, name: product.name }}
        remainingPurchases={remainingPurchases}
        standing={standing}
      />
    );
  },
);
