// YAML のブロックスカラー（`key: |` / `key: >-`）の中身に当たる行の判定。
//
// 参照の取りこぼし検出は「厳格なパターンで潰した残り」を行単位で走査するが、ブロックスカラーの
// 中身は YAML の構造ではなく単なるテキストなので、その走査から外さなければならない。外さないと
// `run:` スクリプトが `uses:` や `image:` を含む文字列を出力するだけで検出が誤爆する。
//
// 判定を actions-pin と images-pin で共有するのは、片方だけが除外すると同じ workflow が経路に
// よって違う判定を受けるため。

// 値がブロックスカラー（`|` / `>`）で始まる行。
// 字下げ指示子と chomp 指示子は YAML がどちらの順序も許すため（`|2-` / `|-2`）両方を受ける。
const BLOCK_SCALAR_HEADER = /:[ \t]*[|>][+-]?\d?[+-]?[ \t]*(?:#.*)?$/;

/**
 * ブロックスカラーの中身に当たる行番号（1 始まり）を返す。
 *
 * @remarks
 * 中身の範囲は字下げで決まります。ヘッダ行より深い字下げの行と、その途中の空行が中身で、
 * 字下げがヘッダ以下へ戻った行で終わります。ヘッダ行そのものは中身に含めません。
 */
export function blockScalarLines(data: string): Set<number> {
  const content = new Set<number>();
  let headerIndent = -1;

  for (const [index, line] of data.split("\n").entries()) {
    const indent = line.length - line.trimStart().length;
    if (headerIndent >= 0) {
      if (line.trim() === "" || indent > headerIndent) {
        content.add(index + 1);
        continue;
      }
      headerIndent = -1;
    }
    if (BLOCK_SCALAR_HEADER.test(line)) headerIndent = indent;
  }

  return content;
}
