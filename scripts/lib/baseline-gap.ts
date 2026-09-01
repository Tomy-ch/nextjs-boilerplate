// 1 対 1 の検査が見つけた「置き場と撮影対象のずれ」を、レポートから読み戻す。
//
// story 単位と画面単位で読む側が 2 つあるが、違うのは spec を選ぶ tag だけなので、たどり方は
// ここが 1 つ持つ。
import { BASELINE_MISSING, BASELINE_ORPHAN, baselineName } from "../../baseline/lib/orphans.js";
import { taggedAnnotations } from "./playwright-report.js";

/**
 * 撮影対象を失った基準画像の一覧。
 *
 * @remarks
 * **孤児は撮り直しでは直りません。** 撮る相手が居ないので、消すしかありません。
 *
 * 一覧を運ぶのは、撮り直しが**全数へ落ちずに済む**ようにするためです。名前が分かれば消す対象を
 * 名指しできます。分からないと「対応が落ちた」という事実しか無く、孤児と範囲外を区別できないので
 * 全数を撮り直すほかありません —— そのとき、報告されていない画像まで置き直されます。
 *
 * @param json - Playwright の JSON レポート
 * @param tag - 1 対 1 の検査に付いている tag
 * @returns 置き場からの相対パス
 */
export function orphanedBaselines(json: string, tag: string): string[] {
  return taggedAnnotations(json, tag, BASELINE_ORPHAN);
}

/**
 * 基準画像を持たない撮影対象の名前。
 *
 * @remarks
 * **比較した実行では、これを読む必要はありません。** 画像が無い撮影対象は撮影そのものが落ち、
 * 落ちた一覧に載るためです。**読むのは比較を省いた実行のためです** —— 絵を決める入力が前と同じ
 * とき比較は省かれ、落ちるのは 1 対 1 の検査だけになります。そのとき撮る相手はここからしか
 * 分かりません。
 *
 * @param json - Playwright の JSON レポート
 * @param tag - 1 対 1 の検査に付いている tag
 * @returns 撮り直す範囲として渡せる名前
 */
export function baselinelessTargets(json: string, tag: string): string[] {
  return taggedAnnotations(json, tag, BASELINE_MISSING).map(baselineName);
}
