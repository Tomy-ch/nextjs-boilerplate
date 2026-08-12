// 破棄の計画を組む判定。ファイル入出力は index.ts が担い、ここは宣言の妥当性と手順だけを持つ。

import path from "node:path";

/**
 * 宣言されたパスがリポジトリの内側を指していることを確かめる。
 *
 * @remarks
 * manifest の書き間違いは**消してはいけないものを消す**方向に効きます。`..` を含む相対パス、
 * 絶対パス、リポジトリルート自身のいずれも、解決するとルートの外か全体を指します。削除は
 * 取り消せないため、実行前にここで落とします。
 *
 * @param relativePath - manifest が宣言したリポジトリルート相対のパス
 * @param rootDir - リポジトリルートの絶対パス
 * @throws ルートの外を指す場合、またはルート自身を指す場合。
 */
export function assertWithinRoot(relativePath: string, rootDir: string): void {
  if (relativePath === "") {
    throw new Error("空のパスは削除対象にできません。");
  }

  if (path.isAbsolute(relativePath)) {
    throw new Error(`絶対パスは削除対象にできません: ${relativePath}`);
  }

  const resolved = path.resolve(rootDir, relativePath);

  if (resolved === path.resolve(rootDir)) {
    throw new Error("リポジトリルート自身は削除対象にできません。");
  }

  if (!resolved.startsWith(`${path.resolve(rootDir)}${path.sep}`)) {
    throw new Error(`リポジトリの外を指しています: ${relativePath}`);
  }
}

/**
 * 走査の対象に含めるかを判定する。
 *
 * @remarks
 * 一覧ではなく走査にするのは、一覧の外側へマーカーを書いたときに**無言で取りこぼす**ためです。
 * 代わりに外す側を宣言し、そちらの漏れは対象ファイルが壊れて検査が落ちる形で表に出します。
 *
 * @param relativePath - リポジトリルート相対のパス（`/` 区切り）
 * @param excludedPrefixes - 外す相対パス接頭辞
 * @param literalFiles - マーカーをデータ・散文として持つファイル
 */
export function isScanTarget(
  relativePath: string,
  excludedPrefixes: readonly string[],
  literalFiles: readonly string[],
): boolean {
  if (literalFiles.includes(relativePath)) {
    return false;
  }

  return !excludedPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

/**
 * マーカーを書ける形式かを拡張子で判定する。
 *
 * @remarks
 * 読み込む前に外します。読んでから判ると、実行のたびに意味のない警告が出ます。
 *
 * @param relativePath - リポジトリルート相対のパス
 * @param binaryExtensions - マーカーを持てない拡張子（小文字・ドット始まり）
 */
export function canHoldMarker(relativePath: string, binaryExtensions: readonly string[]): boolean {
  const lowered = relativePath.toLowerCase();

  return !binaryExtensions.some((extension) => lowered.endsWith(extension));
}

/** 破棄の 1 手順。`strip` はマーカー除去、`delete` はパスの削除。 */
export type SampleStep =
  | { kind: "strip"; relativePath: string }
  | { kind: "delete"; relativePath: string };

/**
 * 破棄の手順を組む。**マーカー除去を削除より先に並べる。**
 *
 * @remarks
 * 順序が逆だと、マーカーの対応が取れていない場合に「消したがマーカーは残った」半端な状態に
 * なります。マーカー除去は不整合で throw するので、先に走らせれば削除は 1 つも起きません。
 *
 * @param scannedFiles - 走査で見つかったマーカー除去の対象
 * @param samplePaths - まるごと消すパス
 * @param rootDir - リポジトリルートの絶対パス
 * @throws 宣言がリポジトリの外を指す場合。
 */
export function buildSteps(
  scannedFiles: readonly string[],
  samplePaths: readonly string[],
  rootDir: string,
): SampleStep[] {
  for (const relativePath of samplePaths) {
    assertWithinRoot(relativePath, rootDir);
  }

  return [
    ...scannedFiles.map((relativePath): SampleStep => ({ kind: "strip", relativePath })),
    ...samplePaths.map((relativePath): SampleStep => ({ kind: "delete", relativePath })),
  ];
}

/**
 * 削除対象が別の削除対象の内側にある宣言を洗い出す。
 *
 * @remarks
 * 内側の宣言は外側の削除で一緒に消えるため、検証側から見ると「登録したのに自分では消して
 * いない」対象になります。宣言としての重複であり、消し漏れの見落としを招くので報告します。
 *
 * @param samplePaths - まるごと消すパス
 */
export function findRedundantPaths(samplePaths: readonly string[]): string[] {
  return samplePaths
    .filter((candidate) =>
      samplePaths.some(
        (other) => other !== candidate && candidate.startsWith(`${other}${path.posix.sep}`),
      ),
    )
    .map((candidate) => `他の対象に含まれる宣言: ${candidate}`);
}
