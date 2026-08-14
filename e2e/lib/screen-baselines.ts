// 画面単位の撮影対象と、置き場にある基準画像の対応。
//
// 突き合わせそのものは story 単位と同じ問い（在るべきものが在るか / 対応を失った画像が残って
// いないか）なので、判定は [vrt/lib/orphan-baselines](../../vrt/lib/orphan-baselines.ts) を
// そのまま使う。ここが持つのは、画面と帯から在るべきパスを組み立てるところだけである。

import type { Screen } from "./screens";
import type { Band } from "./viewports";

const EXTENSION = ".png";

/**
 * 対応の検査に付ける Playwright のタグ。
 *
 * @remarks
 * 対応は置き場に対して 1 回見れば足ります。帯ごとの project すべてで走らせると、同じ検査が
 * 帯の数だけ走り、失敗も帯の数だけ並びます。実行側がこのタグで 1 つの project だけを選びます。
 */
export const SCREEN_BASELINE_TAG = "@screen-baselines";

/**
 * 撮影対象から、置き場に在るべき基準画像の相対パスを組み立てる。
 *
 * @remarks
 * 区画の並びは spec が `toHaveScreenshot` へ渡すもの（帯 / 画面の名前）と一致していなければ
 * なりません。食い違うと全数が孤児として上がります。
 */
export function expectedScreenBaselines(
  screens: readonly Screen[],
  bands: readonly Band[],
): string[] {
  return screens
    .flatMap((screen) => bands.map((band) => `${band.name}/${screen.name}${EXTENSION}`))
    .sort();
}
