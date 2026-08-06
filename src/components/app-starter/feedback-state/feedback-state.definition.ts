const LOADING_FEEDBACK_STATE_KIND = "loading";
const EMPTY_FEEDBACK_STATE_KIND = "empty";
const ERROR_FEEDBACK_STATE_KIND = "error";
const SUCCESS_FEEDBACK_STATE_KIND = "success";

/**
 * FeedbackState が表示する画面状態の定数。
 *
 * `loading` は処理中、`empty` は正常だが表示対象がない状態、`error` は利用者の対応が
 * 必要な失敗、`success` は完了を表す。
 *
 * @see Storybook `View State/Feedback State`
 */
export const FEEDBACK_STATE_KIND: Readonly<{
  LOADING: "loading";
  EMPTY: "empty";
  ERROR: "error";
  SUCCESS: "success";
}> = {
  LOADING: LOADING_FEEDBACK_STATE_KIND,
  EMPTY: EMPTY_FEEDBACK_STATE_KIND,
  ERROR: ERROR_FEEDBACK_STATE_KIND,
  SUCCESS: SUCCESS_FEEDBACK_STATE_KIND,
};

/** {@link FEEDBACK_STATE_KIND} のいずれか。 */
export type FeedbackStateKind = (typeof FEEDBACK_STATE_KIND)[keyof typeof FEEDBACK_STATE_KIND];
