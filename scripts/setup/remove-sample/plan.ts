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
 * 外す側だけを宣言する形にした理由は `sample-manifest.ts` の `MARKER_LITERAL_FILES` が持ちます。
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

/** 破棄の 1 手順。`strip` はマーカー除去、`restore` は雛形の書き出し、`delete` はパスの削除。 */
export type SampleStep =
  | { kind: "strip"; relativePath: string }
  | { kind: "restore"; from: string; to: string }
  | { kind: "delete"; relativePath: string };

/** 置き直す 1 件の宣言（`sample-manifest.ts` の `SAMPLE_RESTORATIONS`）。 */
type Restoration = { readonly from: string; readonly to: string };

/** パスが削除対象そのものか、その配下にあるか。 */
function isCoveredBy(relativePath: string, samplePaths: readonly string[]): boolean {
  return samplePaths.some(
    (target) => relativePath === target || relativePath.startsWith(`${target}${path.posix.sep}`),
  );
}

/**
 * 破棄の手順を組む。**マーカー除去 → 置き直し → 削除の順に並べる。**
 *
 * @remarks
 * マーカー除去を先に置くのは、順序が逆だとマーカーの対応が取れていない場合に「消したが
 * マーカーは残った」半端な状態になるためです。マーカー除去は不整合で throw するので、先に
 * 走らせれば削除は 1 つも起きません。
 *
 * **置き直しは削除より前です。** 雛形は削除対象の内側に置く決まりなので（`from` の宣言）、
 * 削除を先に済ませると読む相手が消えています。書き出す先は削除対象の外だと確かめてあるため、
 * 後続の削除が書いたものを持っていくことはありません。
 *
 * @param scannedFiles - 走査で見つかったマーカー除去の対象
 * @param samplePaths - まるごと消すパス
 * @param restorations - 破棄後に置き直すファイル
 * @param rootDir - リポジトリルートの絶対パス
 * @throws 宣言がリポジトリの外を指す場合。
 */
export function buildSteps(
  scannedFiles: readonly string[],
  samplePaths: readonly string[],
  restorations: readonly Restoration[],
  rootDir: string,
): SampleStep[] {
  for (const relativePath of samplePaths) {
    assertWithinRoot(relativePath, rootDir);
  }

  for (const restoration of restorations) {
    assertWithinRoot(restoration.from, rootDir);
    assertWithinRoot(restoration.to, rootDir);
  }

  return [
    ...scannedFiles.map((relativePath): SampleStep => ({ kind: "strip", relativePath })),
    ...restorations.map(({ from, to }): SampleStep => ({ kind: "restore", from, to })),
    ...samplePaths.map((relativePath): SampleStep => ({ kind: "delete", relativePath })),
  ];
}

/**
 * 置き直しの宣言が、削除との関係で成立しないものを洗い出す。
 *
 * @remarks
 * 見るのは 2 方向です。**書き出す先が削除対象の内側にある**と、置いた直後に削除が持っていき、
 * 破棄後の木にはどちらも残りません。**雛形が削除対象の外にある**と、置き直したあとも fork 先が
 * 使い道の無い雛形を持ち続けます —— 破棄の道具は使い終わったら消えるのが決まりで、雛形だけが
 * 例外になる理由がありません。
 *
 * どちらも実行時には無言で成立してしまうため、実行の前に宣言だけで落とします。
 *
 * @param restorations - 破棄後に置き直すファイル
 * @param samplePaths - まるごと消すパス
 */
export function findMisplacedRestorations(
  restorations: readonly Restoration[],
  samplePaths: readonly string[],
): string[] {
  return restorations.flatMap(({ from, to }) => [
    ...(isCoveredBy(to, samplePaths) ? [`置き直す先が削除対象の内側にあります: ${to}`] : []),
    ...(isCoveredBy(from, samplePaths) ? [] : [`雛形が削除対象の外にあります: ${from}`]),
  ]);
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
