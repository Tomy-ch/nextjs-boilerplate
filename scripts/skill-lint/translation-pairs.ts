/**
 * 追跡されている翻訳のミラー（`<name>.ja.md`）と、その canonical（`<name>.md`）の組。
 *
 * @remarks
 * ミラーは canonical と同じディレクトリに兄弟として置くので、組は名前だけから決まります。
 * ファイルの読み取りと報告は入口が担います。
 */

import { canonicalOf } from "../lib/mirror.js";

/** canonical とそのミラーの組。どちらもリポジトリ相対パス。 */
export type TranslationPair = {
  canonical: string;
  translation: string;
};

/**
 * 追跡されているファイルの一覧から、canonical も追跡されているミラーの組を取り出す。
 *
 * @remarks
 * canonical の無いミラーは組にしません。ここが見るのは**在る組の構造**であって、canonical が
 * ミラーを持つかどうか（組の欠け）ではありません。
 *
 * @param tracked - `git ls-files` が返すリポジトリ相対パスの一覧
 */
export function translationPairsOf(tracked: readonly string[]): TranslationPair[] {
  const present = new Set(tracked);

  return tracked
    .flatMap((translation) => {
      const canonical = canonicalOf(translation);

      return canonical !== null && present.has(canonical) ? [{ canonical, translation }] : [];
    })
    .sort((left, right) => left.translation.localeCompare(right.translation));
}
