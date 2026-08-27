// story 単位の撮影が、置き場に在るべき基準画像を数える。
import { EXTENSION } from "../../baseline/lib/orphans";
import type { Story } from "./story-index";
import { SHOT_THEMES } from "./themes";

/**
 * 対応の検査に付ける Playwright のタグ。
 *
 * @remarks
 * 比較を省いた実行がこのタグで検査を選び出すため、`.makefiles/testing/vrt.mk` と対で変えます。
 */
export const BASELINE_TAG = "@baselines";

/**
 * 撮影対象から、置き場に在るべき基準画像の相対パスを組み立てる。
 *
 * @remarks
 * 区画の並びは `stories.spec.ts` が `toHaveScreenshot` へ渡すもの(系統 / テーマ / story の id)と
 * 一致していなければなりません。食い違うと全数が孤児として上がります。
 */
export function expectedBaselines(stories: readonly Story[]): string[] {
  return stories
    .flatMap((story) =>
      SHOT_THEMES.map((theme) => `${story.group}/${theme}/${story.id}${EXTENSION}`),
    )
    .sort();
}
