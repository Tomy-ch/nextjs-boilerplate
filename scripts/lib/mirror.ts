/**
 * 翻訳のミラーの綴り。ミラーは canonical と同じディレクトリに兄弟の `<name>.ja.md` として置く
 * （ADR 0140）。
 *
 * @remarks
 * 接尾辞の読み方を検査ごとに持つと、どれか 1 つだけが綴りの変更に追従できず、ミラーを
 * canonical として数える検査が黙って生まれます。読み方はここが 1 箇所で持ちます。
 */

/** canonical の拡張子。 */
const CANONICAL_SUFFIX = ".md";

/** ミラーの接尾辞。 */
const MIRROR_SUFFIX = ".ja.md";

/**
 * そのパスが翻訳のミラーか。
 *
 * @param path - 判定するパス。
 * @returns 兄弟の `<name>.ja.md` の形なら true。
 */
export function isMirror(path: string): boolean {
  return path.endsWith(MIRROR_SUFFIX);
}

/**
 * canonical に対応するミラーのパス。
 *
 * @param canonicalPath - canonical のパス。
 * @returns ミラーのパス。Markdown でないか、すでにミラーであれば null。
 */
export function mirrorOf(canonicalPath: string): string | null {
  if (isMirror(canonicalPath) || !canonicalPath.endsWith(CANONICAL_SUFFIX)) return null;

  return `${canonicalPath.slice(0, -CANONICAL_SUFFIX.length)}${MIRROR_SUFFIX}`;
}

/**
 * ミラーに対応する canonical のパス。
 *
 * @param mirrorPath - ミラーのパス。
 * @returns canonical のパス。ミラーでなければ null。
 */
export function canonicalOf(mirrorPath: string): string | null {
  if (!isMirror(mirrorPath)) return null;

  return `${mirrorPath.slice(0, -MIRROR_SUFFIX.length)}${CANONICAL_SUFFIX}`;
}
