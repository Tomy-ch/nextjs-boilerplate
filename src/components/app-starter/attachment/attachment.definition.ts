const DEFAULT_ATTACHMENT_SIZE = "default";
const SMALL_ATTACHMENT_SIZE = "sm";
const EXTRA_SMALL_ATTACHMENT_SIZE = "xs";
const HORIZONTAL_ATTACHMENT_ORIENTATION = "horizontal";
const VERTICAL_ATTACHMENT_ORIENTATION = "vertical";
const IDLE_ATTACHMENT_STATE = "idle";
const UPLOADING_ATTACHMENT_STATE = "uploading";
const PROCESSING_ATTACHMENT_STATE = "processing";
const ERROR_ATTACHMENT_STATE = "error";
const DONE_ATTACHMENT_STATE = "done";
const ICON_ATTACHMENT_MEDIA_VARIANT = "icon";
const IMAGE_ATTACHMENT_MEDIA_VARIANT = "image";

/**
 * 添付 1 件の大きさを表す定数。
 *
 * @see Storybook `Display/Attachment`
 */
export const ATTACHMENT_SIZE: Readonly<{
  DEFAULT: "default";
  SMALL: "sm";
  EXTRA_SMALL: "xs";
}> = {
  DEFAULT: DEFAULT_ATTACHMENT_SIZE,
  SMALL: SMALL_ATTACHMENT_SIZE,
  EXTRA_SMALL: EXTRA_SMALL_ATTACHMENT_SIZE,
};

/**
 * 添付 1 件の内容の並べ方を表す定数。
 *
 * @see Storybook `Display/Attachment`
 */
export const ATTACHMENT_ORIENTATION: Readonly<{
  HORIZONTAL: "horizontal";
  VERTICAL: "vertical";
}> = {
  HORIZONTAL: HORIZONTAL_ATTACHMENT_ORIENTATION,
  VERTICAL: VERTICAL_ATTACHMENT_ORIENTATION,
};

/**
 * 添付 1 件が今どの段階にあるかを表す定数。
 *
 * @see Storybook `Display/Attachment`
 */
export const ATTACHMENT_STATE: Readonly<{
  IDLE: "idle";
  UPLOADING: "uploading";
  PROCESSING: "processing";
  ERROR: "error";
  DONE: "done";
}> = {
  IDLE: IDLE_ATTACHMENT_STATE,
  UPLOADING: UPLOADING_ATTACHMENT_STATE,
  PROCESSING: PROCESSING_ATTACHMENT_STATE,
  ERROR: ERROR_ATTACHMENT_STATE,
  DONE: DONE_ATTACHMENT_STATE,
};

/**
 * 添付の見出し位置に置く媒体の種類を表す定数。
 *
 * @see Storybook `Display/Attachment`
 */
export const ATTACHMENT_MEDIA_VARIANT: Readonly<{
  ICON: "icon";
  IMAGE: "image";
}> = {
  ICON: ICON_ATTACHMENT_MEDIA_VARIANT,
  IMAGE: IMAGE_ATTACHMENT_MEDIA_VARIANT,
};

/** {@link ATTACHMENT_SIZE} のいずれか。 */
export type AttachmentSize = (typeof ATTACHMENT_SIZE)[keyof typeof ATTACHMENT_SIZE];

/** {@link ATTACHMENT_ORIENTATION} のいずれか。 */
export type AttachmentOrientation =
  (typeof ATTACHMENT_ORIENTATION)[keyof typeof ATTACHMENT_ORIENTATION];

/** {@link ATTACHMENT_STATE} のいずれか。 */
export type AttachmentState = (typeof ATTACHMENT_STATE)[keyof typeof ATTACHMENT_STATE];

/** {@link ATTACHMENT_MEDIA_VARIANT} のいずれか。 */
export type AttachmentMediaVariant =
  (typeof ATTACHMENT_MEDIA_VARIANT)[keyof typeof ATTACHMENT_MEDIA_VARIANT];
