/**
 * 先送りにした検査が見るファイルか。
 *
 * @remarks
 * 量で見る側（[`volume.ts`](volume.ts)）と構造で見る側（[`recommend.ts`](recommend.ts)）が同じ
 * 除外を持つため、宣言を 1 つにしてあります。片方だけに足すと、行数では拾うのに名指しはしない
 * （またはその逆）という食い違いが黙って生まれます。
 */

/**
 * 検査の結果を動かさないファイル。
 *
 * @remarks
 * 単体テストは jsdom の中で完結し、実ブラウザの検査は 1 件も読みません。散文は描かれません。
 * **story と spec は外しません** —— story は撮影と axe の対象そのもので、spec は検査の手順
 * そのものなので、動けば結果が動きます。
 */
const MOVES_NOTHING = /\.test\.tsx?$|\.md$/;

/** その差分が、先送りにした検査の結果を動かしうるか。 */
export function movesResult(path: string): boolean {
  return !MOVES_NOTHING.test(path);
}
