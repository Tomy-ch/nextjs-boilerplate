import { getProductCategories, getProductStatuses } from "@/adapters/server/api/product-masters";
import { withRenderSpan } from "@/observability/render-span";
import type { CreateProductAction, UploadProductImageAction } from "../form-state";
import { toMasterOptions } from "../master-option";
import { AdminProductCreateView } from "./view";

/** `AdminProductCreatePageContent` の props。 */
export type AdminProductCreatePageContentProps = {
  /** 受け付ける 1 枚あたりの大きさ（byte）。 */
  maxUploadBytes: number;
  /** 商品を作る送信先。 */
  createAction: CreateProductAction;
  /** 画像を送る送信先。 */
  uploadAction: UploadProductImageAction;
};

/** 作成の画面に要るマスタを揃える。 */
export const AdminProductCreatePageContent = withRenderSpan(
  "features/admin/products/new/page-content",
  async ({ createAction, maxUploadBytes, uploadAction }: AdminProductCreatePageContentProps) => {
    const [categories, statuses] = await Promise.all([
      getProductCategories(),
      getProductStatuses(),
    ]);

    return (
      <AdminProductCreateView
        categoryOptions={toMasterOptions(categories)}
        createAction={createAction}
        maxUploadBytes={maxUploadBytes}
        statusOptions={toMasterOptions(statuses)}
        uploadAction={uploadAction}
      />
    );
  },
);
