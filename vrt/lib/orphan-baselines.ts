// 置き場の基準画像と撮影対象の対応を見る。
//
// 扱うのは「対応する story を持たない画像」だけ。逆向き(画像を持たない story)は Playwright の
// 比較そのものが落とす。
import { readdirSync } from "node:fs";
import path from "node:path";

import type { Story } from "./story-index";
import { THEMES } from "./themes";

const EXTENSION = ".png";

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
