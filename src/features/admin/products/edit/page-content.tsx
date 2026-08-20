import { getProductCategories, getProductStatuses } from "@/adapters/server/api/product-masters";
import { getProduct } from "@/adapters/server/api/products";
import { resolveMediaUrl } from "@/adapters/server/media/media-url";
import type { ProductId } from "@/model/product/product";
import type { UpdateProductAction, UploadProductImageAction } from "../form-state";
import { toMasterOptions } from "../master-option";
import { AdminProductEditView } from "./view";

/** `AdminProductEditPageContent` の props。 */
export type AdminProductEditPageContentProps = {
  /** 編集する商品の識別子。 */
  id: ProductId;
  /** 受け付ける 1 枚あたりの大きさ（byte）。 */
  maxUploadBytes: number;
  /** 商品を更新する送信先。 */
  updateAction: UpdateProductAction;
  /** 画像を送る送信先。 */
  uploadAction: UploadProductImageAction;
};

/**
 * 編集の画面に要る商品とマスタを揃える。
 *
 * @remarks
 * 商品とマスタは互いに依存しないので並行して取ります。存在しない識別子は取得の口が `not-found`
 * へ正規化し、route の境界が受けます。
 */
export async function AdminProductEditPageContent({
  id,
  maxUploadBytes,
  updateAction,
  uploadAction,
}: AdminProductEditPageContentProps) {
  const [product, categories, statuses] = await Promise.all([
    getProduct(id),
    getProductCategories(),
    getProductStatuses(),
  ]);

  // 表示 URL の組み立てには配信元が要り、画面の層はそれを読めない。境界のこちら側で解決する。
  const savedImages = product.imagePaths.flatMap((imagePath) => {
    const url = resolveMediaUrl(imagePath);

    return url === null ? [] : [{ imagePath, url }];
  });

  return (
    <AdminProductEditView
      categoryOptions={toMasterOptions(categories)}
      maxUploadBytes={maxUploadBytes}
      product={product}
      savedImages={savedImages}
      statusOptions={toMasterOptions(statuses)}
      updateAction={updateAction}
      uploadAction={uploadAction}
    />
  );
}
