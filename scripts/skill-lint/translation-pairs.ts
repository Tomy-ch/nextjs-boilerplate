/**
 * 追跡されている翻訳のミラー（`<name>.ja.md`）と、その canonical（`<name>.md`）の組。
 *
 * @remarks
 * ミラーは canonical と同じディレクトリに兄弟として置くので、組は名前だけから決まります。
 * ファイルの読み取りと報告は入口が担います。
 */

/** canonical とそのミラーの組。どちらもリポジトリ相対パス。 */
export type TranslationPair = {
  canonical: string;
  translation: string;
};

const MIRROR_SUFFIX = ".ja.md";

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
    .filter((file) => file.endsWith(MIRROR_SUFFIX))
    .map((translation) => ({
      canonical: `${translation.slice(0, -MIRROR_SUFFIX.length)}.md`,
      translation,
    }))
    .filter(({ canonical }) => present.has(canonical))
    .sort((left, right) => left.translation.localeCompare(right.translation));
}
