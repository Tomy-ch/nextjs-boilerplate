/**
 * 横取りされなかった要求を、警告として報せるか。
 *
 * @remarks
 * **報せるのは `/api/*` だけです。** カタログ自身の資材とドキュメントの取得は横取りの対象では
 * ないため、それらまで警告にすると、開くたびに本物の見落としが埋もれます。
 *
 * @param url - 横取りされなかった要求の URL
 */
export function shouldWarnUnhandled(url: string): boolean {
  return new URL(url).pathname.startsWith("/api/");
}
