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
 * 存在しない識別子は取得の口が `not-found` へ正規化し、route の境界が受けます。
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

  // URL はここで解決する（`ProductSavedImage` は解決済みで受け取る契約）。
  const savedImages = product.imagePaths.flatMap((imagePath) => {
    const url = resolveMediaUrl(imagePath);

    return url === null ? [] : [{ imagePath, url }];
  });

  return (
    // 版が変われば作り直す。読み込み直す導線は同じ URL を指すため、作り直さないと入力欄には
    // 古い編集内容が残ったまま版だけが最新になり、他者の更新を見ないまま上書きできてしまう。
    <AdminProductEditView
      key={product.version}
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
