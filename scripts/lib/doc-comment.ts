/** doc comment のブロック 1 つ。 */
export type DocBlock = {
  /** ブロックが始まる行（1 始まり）。 */
  readonly startLine: number;
  /** ブロックが終わる行（1 始まり）。 */
  readonly endLine: number;
  /** ブロックを構成する行。元の綴りのまま。 */
  readonly lines: readonly string[];
};

/** doc comment の中に現れたタグ 1 件。 */
export type DocTag = {
  /** タグが現れた行（1 始まり）。 */
  readonly line: number;
  /** タグを含むブロック。 */
  readonly block: DocBlock;
};

/** `/**` で始まる行。`/*` だけのブロックコメントは doc comment ではないので当てない。 */
const DOC_BLOCK_OPEN = /^\s*\/\*\*/;

/** ブロックの終わり。 */
const DOC_BLOCK_CLOSE = /\*\//;

/**
 * ソースから doc comment のブロックを取り出す。
 *
 * @remarks
 * **行の状態機械で解きます。** コードの側を構文解析しないのは、この抽出を使う検査が「どの宣言に
 * 付いているか」ではなく「doc comment の中に何が書かれているか」だけを見るためです。
 *
 * **コードの中の文字列は覗きません。** `"@example.com"` のような綴りがソースには実在するので、
 * ブロックの外を見た時点で検査は誤検出を出します。
 */
export function findDocBlocks(source: string): DocBlock[] {
  const lines = source.split("\n");
  const blocks: DocBlock[] = [];
  let start: number | null = null;

  for (const [index, line] of lines.entries()) {
    if (start === null) {
      if (DOC_BLOCK_OPEN.test(line)) {
        // 1 行で閉じるものは、開いた行がそのまま終わりでもある。
        if (DOC_BLOCK_CLOSE.test(line.replace(DOC_BLOCK_OPEN, ""))) {
          blocks.push({ startLine: index + 1, endLine: index + 1, lines: [line] });
          continue;
        }

        start = index;
      }

      continue;
    }

    if (DOC_BLOCK_CLOSE.test(line)) {
      blocks.push({
        startLine: start + 1,
        endLine: index + 1,
        lines: lines.slice(start, index + 1),
      });
      start = null;
    }
  }

  return blocks;
}

/**
 * doc comment の中に現れた特定のタグを、行つきで返す。
 *
 * @remarks
 * 当てるのは**行頭のタグ**だけです（`* @example`）。散文の途中に綴りとして現れた `@example` は
 * タグではなく、直す先も違います。
 *
 * @param tag - `@` を含まないタグ名
 */
export function findDocTags(source: string, tag: string): DocTag[] {
  const pattern = new RegExp(String.raw`^\s*\*\s*@${tag}\b`);

  return findDocBlocks(source).flatMap((block) =>
    block.lines.flatMap((line, offset) =>
      pattern.test(line) ? [{ line: block.startLine + offset, block }] : [],
    ),
  );
}
