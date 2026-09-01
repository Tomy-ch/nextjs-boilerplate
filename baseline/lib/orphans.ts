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
 * 孤児になった基準画像を、レポートへ運ぶための注記の型。
 *
 * @remarks
 * **孤児は撮り直しでは直りません。** 対応する撮影対象が無いので撮る相手が居らず、消すしか
 * ありません。消す側（撮り直しの workflow）は Playwright のレポートしか読めないため、検査が
 * 見つけた一覧をここへ載せて運びます。
 *
 * 載せずに「対応が落ちた」だけを伝えると、撮り直しは孤児か対象外かを区別できず全数を撮り直す
 * ことになります。全数の撮影は、報告されていない画像まで置き直します。
 */
export const BASELINE_ORPHAN = "baseline-orphan";

/**
 * 基準画像を持たない撮影対象を、レポートへ運ぶための注記の型。
 *
 * @remarks
 * **比較した実行では、これを運ぶ必要はありません。** 画像が無い撮影対象は撮影そのものが落ち、
 * 落ちた一覧に載るためです。**運ぶのは比較を省いた実行のためです** —— 絵を決める入力が前と
 * 同じとき比較は省かれ、落ちるのはこの検査だけになります。そのとき一覧が無いと、撮り直しは
 * 撮る相手を 1 つも見つけられません。
 */
export const BASELINE_MISSING = "baseline-missing";

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

/**
 * 基準画像の相対パスから、撮影対象の名前を取る。
 *
 * @remarks
 * story の id も画面の名前も、置き場ではファイル名そのものです。撮り直す範囲の指定は名前で
 * 渡すため、一覧を運ぶ側とのあいだでここが変換になります。
 *
 * @param baseline - 置き場からの相対パス
 */
export function baselineName(baseline: string): string {
  return path.basename(baseline, EXTENSION);
}
