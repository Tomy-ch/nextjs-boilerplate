/**
 * シェル変数が全角文字の直前に裸で置かれていないかを見る。
 *
 * @remarks
 * シェルは全角文字の先頭バイトを変数名の一部として食い、空へ展開したうえで壊れたバイト列を出します。
 * **壊れるのは表示だけで終了コードは変わらない**ため、検査でも人の目でも素通りします。だから綴りの
 * ほうを見ます。規約は `docs/rules.md`「生成物と補助スクリプト」が持ちます。
 *
 * Make の recipe では変数が `$$NAME` と書かれます。2 つ目の `$` から先が同じ形なので、同じ綴りで
 * 拾えます。`${NAME}` と囲んだ形は `{` が続くため当たりません —— それが直した姿です。
 */

/**
 * 裸のシェル変数のうしろに全角文字が続く形。
 *
 * @remarks
 * 全角の範囲は CJK・かな・全角記号（`U+3000`–`U+9FFF`）と全角形（`U+FF00`–`U+FFEF`）に採ります。
 */
const BARE_BEFORE_FULLWIDTH = /\$[A-Za-z_][A-Za-z0-9_]*(?=[　-鿿＀-￯])/g;

/** 見つかった 1 件。 */
export interface BareVariable {
  /** リポジトリ相対のパス。 */
  readonly file: string;
  /** 1 始まりの行。 */
  readonly line: number;
  /** 裸で置かれた変数の綴り。 */
  readonly variable: string;
}

/**
 * ファイル 1 つから、裸のまま全角の直前に置かれた変数を集める。
 *
 * @param file - リポジトリ相対のパス。
 * @param content - そのファイルの中身。
 * @returns 見つかった箇所。無ければ空。
 */
export function findBareVariables(file: string, content: string): BareVariable[] {
  return content.split("\n").flatMap((text, index) =>
    [...text.matchAll(BARE_BEFORE_FULLWIDTH)].map(([variable]) => ({
      file,
      line: index + 1,
      variable,
    })),
  );
}

/**
 * 見つかった箇所を、そのまま読める 1 つの文字列へ組む。
 *
 * @param found - {@link findBareVariables} が集めた箇所。
 * @returns 1 行 1 件の報告。
 */
export function formatBareVariables(found: readonly BareVariable[]): string {
  return found
    .map(({ file, line, variable }) => `${file}:${line} — ${variable} を \`\${…}\` で囲む`)
    .join("\n");
}
