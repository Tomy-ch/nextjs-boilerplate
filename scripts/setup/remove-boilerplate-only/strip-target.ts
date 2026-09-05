// 剥がしが読むファイルかの判定。宣言は manifest.ts、剥がし方は index.ts が持つ。

/**
 * 剥がしが読むファイルか。
 *
 * @remarks
 * 外すものは 2 つあります。マーカーを書けない形式（バイナリ）と、マーカーの形を**データ**として
 * 持つ区画です。後者を読ませると、そこに書かれた例示が消えます。
 *
 * 接頭辞は区切りまで含めて宣言されている前提で、ここは前方一致だけを見ます。区切りを含めない
 * 宣言が混ざると、名前が途中まで一致するだけの隣まで外れます。
 *
 * @param relativePath - リポジトリルート相対のパス（`/` 区切り）
 * @param binaryExtensions - マーカーを持てない拡張子
 * @param excludedPrefixes - 走査から外す相対パス接頭辞
 */
export function isStripTarget(
  relativePath: string,
  binaryExtensions: readonly string[],
  excludedPrefixes: readonly string[],
): boolean {
  return (
    !binaryExtensions.some((extension) => relativePath.endsWith(extension)) &&
    !excludedPrefixes.some((prefix) => relativePath.startsWith(prefix))
  );
}
