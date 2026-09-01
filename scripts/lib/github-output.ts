/**
 * `$GITHUB_OUTPUT` へ書く行を組み立てる。
 *
 * @remarks
 * 出力は `名前=値` を 1 行に 1 つ並べた形で、**行の区切りがそのまま意味の区切り**です。値へ改行が
 * 混ざれば、そこから先は次の出力の宣言として読まれます。値が外から届くもの（応答の id、判定の
 * 綴り）である以上、これは後続のステップが読む値を差し替えられる経路です。
 *
 * **均さずに落とします。** 記録なら偽の 1 行が混ざっても読み手が気付けますが、ここは機械が読む
 * ので、均した値は「正しく読めた」として先へ進みます。改行を含む値は、応答がこちらの想定した
 * 形ではないということなので、その場で止めます。
 */

/** 行の区切りとして解釈されうる文字。 */
const LINE_BREAK = /[\r\n]/;

/**
 * 出力の行を、そのまま追記できる 1 つの文字列にする。
 *
 * @param lines - `名前=値` の並び
 * @returns 末尾に改行を持つ、追記用の文字列
 * @throws いずれかの行が改行を含むとき
 */
export function formatOutputLines(lines: readonly string[]): string {
  for (const line of lines) {
    if (LINE_BREAK.test(line)) {
      throw new Error(`出力へ改行を含む値が渡されました: ${line.split(LINE_BREAK)[0]}`);
    }
  }

  return lines.map((line) => `${line}\n`).join("");
}
