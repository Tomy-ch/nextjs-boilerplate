/**
 * lint 対象がテストか。
 *
 * @param filename - lint 対象のファイル
 * @returns テストなら true
 */
export function isTest(filename: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(filename);
}
