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
 *
 * **3 つの式に分けてあるのは、1 本にすると後戻りが起きるためである。** 括弧の中身を読みながら
 * ファイル名の形も同時に試す式は、一致しない行ごとに開始位置をずらして試し直す。括弧の中身を
 * 取る・それが ADR か見る・直後を見る、の順に分ければ、どれも前から 1 度読むだけで済む。
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

/**
 * Markdown リンクの `](…)` の部分。
 *
 * @remarks
 * 中身を捕獲グループで取らないのは、取ると型の上で「無いかもしれない」値になり、
 * **到達しない分岐**が生まれるためです。一致全体から括弧を外して取り出します。
 */
const LINK = /\]\([^)]*\)/g;

/** その中身が ADR のファイルを指しているか。 */
const ADR_PATH = /(?:^|\/)0\d{3}-[a-z0-9-]+\.md$/;

/**
 * リンクの直後に続く節番号。節記号も決定の語も任意で、無ければ裸の番号として読む。
 *
 * @remarks
 * 語のあとの空白を任意の側へ入れてあるのは、**空白の繰り返しを隣り合わせない**ためです。
 * 外に出すと、語が無いときに 2 つの繰り返しが並び、どちらがどこまで取るかが一意に決まりません。
 */
const SECTION = /^[ 　]*(?:(?:§|決定)[ 　]*)?\d+(?:\.\d+)*(?!\d)/;

/**
 * 数でありながら節を指していないもの。
 *
 * @remarks
 * 助数詞が続く数は件数であって節番号ではない。ここを見ないと、ADR へのリンクの直後に
 * 「1 つの理由」と続く形が違反として挙がり、**直しようのない指摘**になる —— 番号を消すと
 * 文が壊れる。
 */
const COUNTER = /^[ 　]*[つ本件回点種段層人箇]/;

/**
 * 1 行から、リンクの直後に節番号を置いている箇所を挙げる。
 *
 * @param file - リポジトリルート相対のパス。報告にそのまま出す。
 * @param line - 1 起点の行番号。
 * @param text - その行の本文。
 * @returns 見つかった参照。無ければ空配列。
 */
function findInLine(file: string, line: number, text: string): readonly SectionedAdrReference[] {
  return [...text.matchAll(LINK)].flatMap((link) => {
    if (!ADR_PATH.test(link[0].slice("](".length, -")".length))) return [];

    const section = SECTION.exec(text.slice(link.index + link[0].length));

    if (section === null) return [];

    const after = text.slice(link.index + link[0].length + section[0].length);

    return COUNTER.test(after) ? [] : [{ file, line, text: `${link[0]}${section[0]}`.trim() }];
  });
}

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
  return content.split("\n").flatMap((text, index) => findInLine(file, index + 1, text));
}

/**
 * 検出結果を、直せる形の文言へ整える。
 *
 * @param references - 検出した参照。
 * @returns 1 件 1 行の文言。違反が無ければ空文字。
 */
export function formatSectionedAdrReferences(references: readonly SectionedAdrReference[]): string {
  return references
    .map(
      ({ file, line, text }) =>
        `${file}:${line}: ADR は \`[NNNN](path)\` だけで指してください。節番号は節を動かすと黙って別の節を指します（検出: ${text}）`,
    )
    .join("\n");
}
