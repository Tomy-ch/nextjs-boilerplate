/**
 * 例外から表示用の 1 行を作る。
 *
 * @remarks
 * 文言を持たない `Error` と、`Error` ですらない値の双方を通します。呼び出し側でこの分岐を
 * 書くと、ツールごとに「空行だけが出る」「`[object Object]` が出る」といった差が生まれます。
 */
export function errorMessage(error: unknown): string {
  return (error instanceof Error && error.message ? error.message : String(error)).trim();
}
