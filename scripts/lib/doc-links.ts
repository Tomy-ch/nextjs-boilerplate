import { existsSync } from "node:fs";
import { dirname, normalize, relative, resolve } from "node:path";

/** 解決しなかったリンク 1 件。 */
export type BrokenLink = {
  /** リポジトリ相対のファイルパス。 */
  readonly file: string;
  /** そのファイルの中での行番号（1 始まり）。 */
  readonly line: number;
  /** 書かれていた相対パス。 */
  readonly href: string;
};

/**
 * 文書を指す相対リンクだけを拾う。
 *
 * @remarks
 * `](` で始まり `.md` で終わる形に限ります。URL と、同じ木の中を指さない参照は対象外です。
 */
const DOC_LINK = /\]\((\.\.?\/[^)]+\.md)\)/g;

/**
 * ソースの中から、解決しない文書リンクを拾う。
 *
 * @remarks
 * **段数を手で書く相対パスは、ファイルを動かした時点で静かに切れます。**型検査も lint も
 * 文字列の中までは見ないため、壊れても何も落ちません。読む人が辿って初めて気づく形になります。
 *
 * 実在を確かめるだけで、指し先の中身は見ません。節の名前が変わったかどうかは別の問題です。
 *
 * @param file - リポジトリ相対のファイルパス
 * @param content - そのファイルの中身
 * @param root - 相対パスを解決する起点（リポジトリルート）
 */
export function findBrokenDocLinks(file: string, content: string, root: string): BrokenLink[] {
  const broken: BrokenLink[] = [];

  content.split("\n").forEach((text, index) => {
    for (const match of text.matchAll(DOC_LINK)) {
      const href = match[1] ?? "";
      const target = normalize(resolve(root, dirname(file), href));

      if (!existsSync(target)) broken.push({ file, href, line: index + 1 });
    }
  });

  return broken;
}

/** 見つかったものを、そのまま直せる形の文言にする。 */
export function formatBrokenDocLinks(broken: readonly BrokenLink[], root: string): string {
  return broken
    .map(({ file, line, href }) => `${relative(root, resolve(root, file))}:${line}: ${href}`)
    .join("\n");
}
