import { getProduct } from "@/adapters/server/api/products";
import type { ProductId } from "@/model/product/product";
import { withScreenSpan } from "@/observability/render-span";
import type { AdjustProductStockAction } from "./form-state";
import { AdminProductStockView } from "./view";

/** `AdminProductStockPageContent` の props。 */
export type AdminProductStockPageContentProps = {
  /** 在庫を動かす商品の識別子。 */
  id: ProductId;
  /** 在庫を動かす送信先。 */
  adjustAction: AdjustProductStockAction;
};

/**
 * 在庫を動かす画面に要る商品を揃える。
 *
 * @remarks
 * 存在しない識別子は取得の口が `not-found` へ正規化し、route の境界が受けます。
 */
export const AdminProductStockPageContent = withScreenSpan(
  "features/admin/products/stock/page-content",
  async ({ adjustAction, id }: AdminProductStockPageContentProps) => {
    const product = await getProduct(id);

    return (
      // 在庫が変われば作り直す。読み込み直す導線は同じ URL を指すため、作り直さないと入力欄には
      // 前回打った量が残ったまま在庫だけが最新になり、見込みと打った内容が食い違う。
      <AdminProductStockView adjustAction={adjustAction} key={product.quantity} product={product} />
    );
  },
);
