// 本文から、失効する前提を拾う判定。ファイルの走査は入口([index.ts](index.ts))が持つ。
//
// **見るのは剥がした後の本文だけ。**マーカーで囲われた区画は作った側へ渡らないので、そこに前提を
// 書くのは正しい書き方である。剥がし方の写しを持たないよう、除去そのものは
// [markers.ts](../setup/lib/markers.ts) をそのまま使う —— サンプル破棄と剥がしが使っている実物で
// あり、ここが別の解釈を持つと**検査だけが通って本番の剥がしで残る**形が生まれる。

import { stripMarkers } from "../setup/lib/markers.js";
import { PREMISE_SHAPES, type PremiseShape } from "./vocabulary.js";

/** 見つけた前提 1 件。 */
export type Premise = {
  readonly file: string;
  readonly shape: string;
  readonly why: string;
  /** 当たった綴り */
  readonly phrase: string;
  /** その綴りを含む行 */
  readonly text: string;
};

// boilerplate-only:replace-begin
/**
 * 剥がしのマーカーの族。両方を落としてから読む。
 *
 * @remarks
 * 作った側の木には boilerplate 限定節の族がもう無いので、この宣言は剥がしで 1 つへ縮む。
 * 綴りごと縮めるのは、`strip-verify` が剥がし後の木にこの族の綴りが残っていないことを見るためで、
 * 生き残った綴りは「剥がし切れていない節がある」と読める。
 */
const MARKERS: readonly string[] = ["sample", "boilerplate-only"];
// boilerplate-only:replace-with
// = /** 剥がしのマーカーの族。 */
// = const MARKERS: readonly string[] = ["sample"];
// boilerplate-only:replace-end

// boilerplate-only:replace-begin
/**
 * 作った側へ渡る本文だけを残す。
 *
 * @remarks
 * マーカーが対応していない本文は**そのまま読みます**。対応の破れは
 * [marker-baseline](../marker-baseline/index.ts) の受け持ちで、ここで落とすと**別の検査の失敗が
 * この検査の失敗として出ます** —— 直す場所を取り違えさせるより、囲われていない扱いで読むほうが
 * 安全側です（囲えていない前提は、いずれにせよ渡ってしまう）。
 */
// boilerplate-only:replace-with
// = /**
// =  * 作った側へ渡る本文だけを残す。
// =  *
// =  * @remarks
// =  * マーカーが対応していない本文は**そのまま読みます**。ここで落とすと**囲い方の誤りが、
// =  * 前提の検査の失敗として出ます** —— 直す場所を取り違えさせるより、囲われていない扱いで
// =  * 読むほうが安全側です（囲えていない前提は、いずれにせよ渡ってしまう）。
// =  */
// boilerplate-only:replace-end
export function survivingText(content: string): string {
  return MARKERS.reduce((text, marker) => {
    try {
      return stripMarkers(text, marker).content;
    } catch {
      return text;
    }
  }, content);
}

/**
 * 綴りがその行に現れるか。
 *
 * @remarks
 * **英語の対訳だけは大文字小文字を区別しません。** 文頭に来ると先頭が大文字になり
 * （`This boilerplate …`）、区別すると同じ前提が文の位置だけで素通りします。
 *
 * 日本語の側に並ぶ ASCII の綴り（`BACKLOG` / `docs/plan`）は区別します。どれも固有の名前で、
 * 小文字の一般語（`a backlog`）に当てると前提ではない散文を挙げます。
 *
 * @param line - 剥がした後の本文の 1 行。
 * @param phrase - 探す綴り。
 * @param shape - その綴りを持つ形。英語の対訳かどうかをここから引く。
 * @returns 現れれば true。
 */
function appears(line: string, phrase: string, shape: PremiseShape): boolean {
  const english = shape.pairs.some((pair) => pair.en.includes(phrase));

  return english ? line.toLowerCase().includes(phrase.toLowerCase()) : line.includes(phrase);
}

/**
 * 本文から前提を拾う。
 *
 * @param file - 報告に出すパス
 *
 * @remarks
 * 行番号を返しません。読むのは**剥がした後**の本文で、そこでの行番号は元のファイルの行番号と
 * ずれます。**ずれた番号を出すほうが、番号が無いより悪い** —— 指した先に何も無い指摘は、
 * 読み手に検査そのものを疑わせます。代わりに当たった行を全文で返します。
 */
export function findPremises(content: string, file: string): readonly Premise[] {
  const found: Premise[] = [];

  for (const line of survivingText(content).split("\n")) {
    for (const shape of PREMISE_SHAPES) {
      for (const phrase of shape.phrases) {
        if (appears(line, phrase, shape)) {
          found.push({ file, shape: shape.name, why: shape.why, phrase, text: line.trim() });
        }
      }
    }
  }

  return found;
}
