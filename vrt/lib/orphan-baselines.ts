// 置き場の基準画像と撮影対象の対応を見る。
//
// 両方向を見る。比較を省いた実行では Playwright が「画像を持たない story」を落とさないため、
// 片方向だけだと基準画像の欠けたまま緑で通る。
import { readdirSync } from "node:fs";
import path from "node:path";

import type { Story } from "./story-index";
import { THEMES } from "./themes";

const EXTENSION = ".png";

/**
 * 対応の検査に付ける Playwright のタグ。
 *
 * @remarks
 * 比較を省いた実行は、このタグで対応の検査だけを選び出します(`.makefiles/testing/vrt.mk`)。
 * 見出しの文字列で選ぶと、名前を変えた瞬間に何も走らないまま緑になります。
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
    .flatMap((story) => THEMES.map((theme) => `${story.group}/${theme}/${story.id}${EXTENSION}`))
    .sort();
}

/**
 * 置き場にある基準画像を相対パスで列挙する。
 *
 * @remarks
 * 数えるのは画像だけです。置き場は根に README を持つため
 * ([置き場の README](../../.github/settings/vrt-images/readme-template.md))、拡張子で絞らないと
 * それが孤児として上がります。
 */
export function listBaselines(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .map((entry) => entry.toString().split(path.sep).join("/"))
    .filter((entry) => entry.endsWith(EXTENSION))
    .sort();
}

/** 撮影対象のどれにも対応しない基準画像。 */
export function orphanBaselines(present: readonly string[], expected: readonly string[]): string[] {
  const wanted = new Set(expected);

  return present.filter((baseline) => !wanted.has(baseline)).sort();
}

/** 撮影対象に対応する基準画像が置き場に無いもの。 */
export function missingBaselines(
  present: readonly string[],
  expected: readonly string[],
): string[] {
  const found = new Set(present);

  return expected.filter((baseline) => !found.has(baseline)).sort();
}
