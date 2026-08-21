import { parse } from "yaml";

/**
 * Markdown 冒頭の frontmatter。
 *
 * @remarks
 * 読み手が複数ある（層の境界宣言・層別責務の宣言）ため、取り出しをここ 1 箇所に置く。2 通りの
 * 読み方が並ぶと、片方だけが YAML の書式（引用符・コメント・改行後の値）に追従できなくなり、
 * 追従できない側の検査だけが黙って壊れる。
 */
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

/**
 * 冒頭の frontmatter ブロックを、YAML の本文として取り出す。
 *
 * @returns frontmatter が無ければ null
 */
export function extractFrontmatter(source: string): string | null {
  const matched = FRONTMATTER_PATTERN.exec(source);

  return matched === null ? null : matched[1];
}

/**
 * 宣言の対応表として読める形か。
 *
 * @remarks
 * `null` を除くのは型のためである。YAML は空の本文も `null` へ解き、`typeof null` は `"object"` に
 * なるので、これが無いと `null` を対応表として narrow してしまう。**振る舞いとしては差が出ない** ——
 * 弾いた先も既定も同じ `null` なので、この 1 項を消してもテストは落ちない。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** YAML として解けなければ undefined を返す。 */
function tryParse(block: string): unknown {
  try {
    return parse(block);
  } catch {
    return undefined;
  }
}

/**
 * 冒頭の frontmatter を読み、宣言の対応表として返す。
 *
 * @remarks
 * YAML として解けない frontmatter は、宣言が無いのと同じに扱う。壊れた宣言を部分的に読むと、
 * 書いたつもりの宣言が効かないまま検査が緑になる。
 *
 * @returns frontmatter が無い、または対応表として読めなければ null
 */
export function parseFrontmatter(source: string): Record<string, unknown> | null {
  const block = extractFrontmatter(source);

  if (block === null) {
    return null;
  }

  const parsed = tryParse(block);

  return isRecord(parsed) ? parsed : null;
}
