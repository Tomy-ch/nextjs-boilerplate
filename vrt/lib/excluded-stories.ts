/**
 * 比較の対象から外す story の宣言。
 *
 * @remarks
 * 何を除外してよいかは [README](../README.md#何を撮るか) が持ちます。理由と撤去条件を
 * 添えないものは足せません。
 */

/** 除外する story 1 件。 */
export type ExcludedStory = {
  /** story の id(`storybook-static/index.json` の `id`)。 */
  id: string;
  /** なぜ基準画像を持てないか。 */
  reason: string;
  /** どうなったら除外を外せるか。 */
  removeWhen: string;
};

export const EXCLUDED_STORIES: readonly ExcludedStory[] = [
  {
    id: "feedback-toaster--auto-close",
    reason: "残時間のバーが setInterval で動き、見た目が撮った時刻の関数になる",
    removeWhen: "残時間の描画が時刻に依らなくなったとき",
  },
  {
    id: "feedback-toaster--with-action",
    reason: "同上",
    removeWhen: "同上",
  },
];
