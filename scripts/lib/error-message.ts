/**
 * 例外から表示用の 1 行を作る。
 *
 * @remarks
 * 文言を持たない `Error` と、`Error` ですらない値の双方を通します。呼び出し側でこの分岐を
 * 書くと、ツールごとに「空行だけが出る」「`[object Object]` が出る」といった差が生まれます。
 *
 * **改行と制御文字は空白へ均します。** 文言には外から来た応答や URL が混ざり得るので、そのまま
 * 流すと**記録に偽の 1 行を足せます** —— 読む側にも解析する側にも、本物と見分けが付きません。
 */
export function errorMessage(error: unknown): string {
  const text = error instanceof Error && error.message ? error.message : String(error);

  // 改行を先に、それだけを落とす。偽の 1 行を足せるのはこの 2 文字だけで、残りの制御文字は
  // 見え方の問題にとどまる。
  return text
    .replaceAll(/[\r\n]/g, " ")
    .replaceAll(/[\p{Cc}\p{Cf}]/gu, " ")
    .trim();
}
