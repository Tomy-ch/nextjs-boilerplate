import { getProductCategories, getProductStatuses } from "@/adapters/server/api/product-masters";
import type { CreateProductAction, UploadProductImageAction } from "../form/form-state";
import { toMasterOptions } from "../form/master-option";
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

/**
 * 作成の画面に要るマスタを揃える。
 *
 * @remarks
 * 分類と状態は互いに依存しないので並行して取ります。片方ずつ待つと、遅い方の待ち時間に速い方の
 * 待ち時間が積み上がります。
 */
export async function AdminProductCreatePageContent({
  createAction,
  maxUploadBytes,
  uploadAction,
}: AdminProductCreatePageContentProps) {
  const [categories, statuses] = await Promise.all([getProductCategories(), getProductStatuses()]);

  return (
    <AdminProductCreateView
      categoryOptions={toMasterOptions(categories)}
      createAction={createAction}
      maxUploadBytes={maxUploadBytes}
      statusOptions={toMasterOptions(statuses)}
      uploadAction={uploadAction}
    />
  );
}
