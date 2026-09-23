/**
 * ADR を指す参照が節番号を伴っていないかの判定。
 *
 * @remarks
 * 判定だけをここに置き、ツリーの走査は `scripts/adr-reference.gate.test.ts` が担う
 * （`scope-spelling` と同形）。
 *
 * **節番号は名前ではない。** 節を足す・並べ替える・畳むと番号は動き、指していた側は綴りを
 * 変えずに別の節を指す。リンクの形で切れれば検査が気付くが、番号は形が残るので気付けない。
 * したがって ADR を指す形は `[NNNN](path)` だけとし、どの節かは指す側が要旨を書いて示す。
 */

/** 節番号を伴う ADR 参照 1 件。 */
export type SectionedAdrReference = {
  /** 検出したファイル（リポジトリルート相対）。 */
  readonly file: string;
  /** 1 起点の行番号。 */
  readonly line: number;
  /** 検出した綴りそのもの。 */
  readonly text: string;
};

/** ADR ファイルへのリンクと、その直後に続く節番号。 */
const SECTIONED = /\]\([^)]*?0\d{3}-[a-z0-9-]+\.md\)[ 　]*(?:§[ 　]*\d+(?:\.\d+)?|決定[ 　]*\d+|\d+(?:\.\d+)?)(?![\d.])/g;

/**
 * 数でありながら節を指していないもの。
 *
 * @remarks
 * 助数詞が続く数は件数であって節番号ではない。ここを見ないと「[0011](…) 1 つの理由」が
 * 違反として挙がり、**直しようのない指摘**になる（番号を消すと文が壊れる）。
 */
const COUNTER = /^[ 　]*[つ本件回点種段層人箇]/;

/**
 * リンクの直後に節番号を置いている箇所を挙げる。
 *
 * @param file - リポジトリルート相対のパス。報告にそのまま出す。
 * @param content - そのファイルの本文。
 * @returns 見つかった参照。無ければ空配列。
 */
export function findSectionedAdrReferences(
  file: string,
  content: string,
): readonly SectionedAdrReference[] {
  return content.split("\n").flatMap((text, index) =>
    [...text.matchAll(SECTIONED)]
      .filter((match) => !COUNTER.test(text.slice(match.index + match[0].length)))
      .map((match) => ({ file, line: index + 1, text: match[0].trim() })),
  );
}

/**
 * 検出結果を、直せる形の文言へ整える。
 *
 * @param references - 検出した参照。
 * @returns 1 件 1 行の文言。違反が無ければ空文字。
 */
export function formatSectionedAdrReferences(
  references: readonly SectionedAdrReference[],
): string {
  return references
    .map(
      ({ file, line, text }) =>
        `${file}:${line}: ADR は \`[NNNN](path)\` だけで指してください。節番号は節を動かすと黙って別の節を指します（検出: ${text}）`,
    )
    .join("\n");
}
