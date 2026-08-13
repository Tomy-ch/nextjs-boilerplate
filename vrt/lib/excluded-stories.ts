/**
 * 比較の対象から外す story の宣言。
 *
 * @remarks
 * 宣言をここ 1 箇所に集めるのは、story 側にタグを 1 行足すだけで黙らせられる状態を作らない
 * ためです。揺らぐ story に当たったとき、いちばん安い逃げ道が「対象から外す」になると、
 * 外した記録がどこにも残らないまま比較の網が縮みます。
 *
 * 除外は**撮っても意味を持たない story** に限ります。撮るたび違う絵になるものは、基準画像を
 * 持てないので比較そのものが成立しません。「いまは直せない」は除外の理由になりません
 * (それは退行であり、直すか issue にするかのどちらかです)。
 *
 * 検査対象から外すモジュールの宣言([scripts/lib/untested-modules.ts](../../scripts/lib/untested-modules.ts))と
 * 同じ規律です。
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
