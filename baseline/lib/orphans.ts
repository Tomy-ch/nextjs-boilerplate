// 置き場の基準画像と撮影対象の対応を見る。
//
// 両方向を見る。比較を省いた実行では Playwright が「画像を持たない撮影対象」を落とさないため、
// 片方向だけだと基準画像の欠けたまま緑で通る。
//
// story 単位と画面単位の双方が呼ぶ。在るべき一覧の組み立てだけは撮影対象の数え方が違うので、
// それぞれが持つ（[vrt](../../vrt/lib/expected-baselines.ts) / [e2e](../../e2e/lib/screen-baselines.ts)）。
import { readdirSync } from "node:fs";
import path from "node:path";

import { SCREEN_AREA } from "./store";

/** 基準画像の拡張子。 */
export const EXTENSION = ".png";

/**
 * 置き場にある story の基準画像を相対パスで列挙する。
 *
 * @remarks
 * 数えるのは画像だけです。置き場は根に README を持つため
 * ([置き場の README](../../.github/settings/baseline-store/readme-template.md))、拡張子で絞らないと
 * それが孤児として上がります。
 *
 * 画面単位の区画（[store](store.ts)）も外します。置き場は 2 種類の撮影が共有しており、story の
 * 対応だけを見る呼び出しからは、相手の画像は数えるべき対象ではありません。画面単位の側は区画の
 * 内側を根に取るため、この除外は効きません。
 */
export function listBaselines(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .map((entry) => entry.toString().split(path.sep).join("/"))
    .filter((entry) => entry.endsWith(EXTENSION) && !entry.startsWith(`${SCREEN_AREA}/`))
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
