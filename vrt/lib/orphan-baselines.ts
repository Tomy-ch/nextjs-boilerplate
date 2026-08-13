// 置き場にある基準画像が、撮影対象の story と 1 対 1 で対応しているかを見る。
//
// story を消す・改名する・撮影対象から外すと、どの story からも参照されない基準画像が置き場に
// 残る。参照されない画像は比較に掛からないため、残り続けても誰も気づかず、置き場の中身が
// 実態から離れていく。
//
// 見るのは「対応する story が無い画像」の側だけ。逆向き(画像を持たない story)は Playwright の
// 比較そのものが落とすため、ここで重ねて見る必要が無い。
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
 * 同じです。撮る側と在るべき側で組み立てを分けると、片方だけを変えたときに全数が孤児になります。
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
 * 画像以外は数えません。置き場は基準画像だけを持つリポジトリですが、README を根に持つため
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
