import type { FileUploadRejection } from "@/components/app-starter/file-upload/file-upload.definition";
import { FILE_UPLOAD_REJECTION_REASON } from "@/components/app-starter/file-upload/file-upload.definition";

import { PRODUCT_IMAGE_ACCEPT_LABEL } from "./field-limits";

/**
 * バイト数を、利用者が読める単位へ丸める。
 *
 * @remarks
 * 受け口は大きさの整形を持たないため、見せ方はこちらが決めます。切り上げないのは、上限を
 * 超える値を「まだ入る」と読ませないためです。
 */
export function formatMegabytes(bytes: number): string {
  return `${Math.floor(bytes / 1024 / 1024)} MB`;
}

/**
 * 弾いた理由を文言へ写す。
 *
 * @remarks
 * 受け口が渡すのは弾いたファイルと理由の組だけで、文言は持ちません。**何をどう伝えるかは画面の
 * 判断**なので、ここが決めます。
 *
 * 先頭の 1 件だけを出します。まとめて選び直す操作しか無いので、何件目が原因かを並べても直し方は
 * 変わりません。
 */
export function toRejectionMessage(
  rejections: readonly FileUploadRejection[],
  maxUploadBytes: number,
): string | undefined {
  const first = rejections[0];

  if (first === undefined) return undefined;

  return first.reason === FILE_UPLOAD_REJECTION_REASON.SIZE
    ? `${first.file.name} は ${formatMegabytes(maxUploadBytes)} を超えています。`
    : `${first.file.name} は ${PRODUCT_IMAGE_ACCEPT_LABEL} のいずれでもありません。`;
}
