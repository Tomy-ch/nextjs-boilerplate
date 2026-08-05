/**
 * 選択を受け付けなかった理由。
 *
 * @see Storybook `Form/FileUpload`
 */
export const FILE_UPLOAD_REJECTION_REASON = {
  /** `accept` が受け付けない形式だった。 */
  TYPE: "type",
  /** `maxSize` を超える大きさだった。 */
  SIZE: "size",
} as const;

/** {@link FILE_UPLOAD_REJECTION_REASON} のいずれか。 */
export type FileUploadRejectionReason =
  (typeof FILE_UPLOAD_REJECTION_REASON)[keyof typeof FILE_UPLOAD_REJECTION_REASON];

/** 受け付けなかったファイル 1 件。 */
export type FileUploadRejection = {
  /** 受け付けなかったファイル。 */
  file: File;
  /** 受け付けなかった理由。 */
  reason: FileUploadRejectionReason;
};
