"use client";

import { useCallback } from "react";

import { FileUpload } from "@/components/app-starter/file-upload/file-upload";
import type { FileUploadRejection } from "@/components/app-starter/file-upload/file-upload.definition";
import { UploadPreview } from "@/components/app-starter/upload-preview/upload-preview";
import { FieldDescription } from "@/components/design-system/form/field/field";
import { RequirementBadge } from "@/components/design-system/form/requirement-badge/requirement-badge";
import { Alert, AlertDescription } from "@/components/design-system/status/alert/alert";

import { PRODUCT_IMAGE_ACCEPT } from "../../field-limits";
import { PRODUCT_FORM_NAMES } from "../../form-names";
import { formatMegabytes } from "../../image-rejection";
import type { ProductImages } from "../../use-product-images";

/** `ProductImagesSection` の props。 */
export type ProductImagesSectionProps = {
  /** 選択中の画像と、その動かし方。 */
  images: ProductImages;
  /** 受け付ける 1 枚あたりの大きさ（byte）。 */
  maxUploadBytes: number;
  /** 弾いたファイルの文言。呼び出し元が組み立てて渡す。 */
  rejection?: string;
  /** 弾いたファイルを受け取る。 */
  onReject: (rejections: FileUploadRejection[]) => void;
};

/**
 * 商品の画像。
 *
 * @remarks
 * **選んだ時点で送ります。**商品そのものの送信に載るのは、送り終わった画像のオブジェクトキー
 * だけです。並び順は hidden の欄の並びがそのまま表示順になります。
 *
 * **選んだ内容の持ち主は一覧の側だけです。**受け口は渡し終えたら空へ戻すため、1 件外したときに
 * 受け口の表示だけが古いまま残ることがありません。
 *
 * 選ぶ受け口と、選んだ内容の一覧は別の部品です。ここが持つのは 2 つを並べることと、弾かれた
 * ファイルの文言を出すことだけで、送信経路も寿命の管理も持ちません。
 */
export function ProductImagesSection({
  images,
  maxUploadBytes,
  onReject,
  rejection,
}: ProductImagesSectionProps) {
  const handleSelect = useCallback((files: File[]) => images.add(files), [images]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <RequirementBadge required={false} />
        <span className="font-emphasis text-sm">商品画像</span>
      </div>
      <FileUpload
        accept={PRODUCT_IMAGE_ACCEPT}
        maxSize={maxUploadBytes}
        multiple={true}
        onReject={onReject}
        onSelect={handleSelect}
        prompt="商品の画像"
        resetOnSelect={true}
        triggerLabel="画像を選ぶ"
      />
      <FieldDescription>
        画像が無くても登録できます。PNG / JPEG / WebP を {formatMegabytes(maxUploadBytes)} まで。
        並び順がそのまま表示順です。
      </FieldDescription>
      {rejection === undefined ? null : (
        <Alert variant="destructive">
          <AlertDescription>{rejection}</AlertDescription>
        </Alert>
      )}
      <UploadPreview
        items={images.items}
        label="選択中の商品画像"
        orientation="row"
        onMoveDown={images.moveDown}
        onMoveUp={images.moveUp}
        onRemove={images.remove}
        onRetry={images.retry}
      />
      {images.imagePaths.map((imagePath) => (
        <input key={imagePath} name={PRODUCT_FORM_NAMES.images} type="hidden" value={imagePath} />
      ))}
    </div>
  );
}
