/**
 * `**` と `*` だけの glob を、パスに当てる正規表現へ直す。
 *
 * @remarks
 * 宣言側（`architecture.ts` の `patterns`）が使うのはこの 2 つだけです。**汎用の glob 実装を
 * 持ち込みません** —— 受け付ける記法が宣言側の記法より広くなり、書けるが検査されない形が
 * 生まれるためです。
 *
 * - `**` は 0 段以上のディレクトリ。`src/app/**\/route.ts` は `src/app/route.ts` にも当たる
 * - `*` は 1 段のディレクトリ名 / ファイル名の中の任意の並び。区切りは跨がない
 * - それ以外の文字は、正規表現のメタ文字を含めてそのまま照合される
 *
 * 末尾が `**` のパターンは受け付けません。ファイル名で終わる宣言しか無く、受け付けると
 * 「ディレクトリにだけ当たる正規表現」が黙って作られます。
 */
export function toPathPattern(glob: string): RegExp {
  const segments = glob.split("/");

  if (segments[segments.length - 1] === "**") {
    throw new Error(`末尾が ** のパターンは受け付けません: ${glob}`);
  }

  const source = segments
    .map((segment) => (segment === "**" ? "(?:[^/]+/)*" : `${escapeSegment(segment)}/`))
    .join("")
    .replace(/\/$/, "");

  return new RegExp(`^${source}$`);
}

/** 1 段ぶんを正規表現へ直す。`*` だけが meta として生き、他は文字として照合される。 */
function escapeSegment(segment: string): string {
  return segment.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
}
