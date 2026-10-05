// 「その文書より先に失効する前提」を示す語彙の宣言。
//
// 何が前提かは [`docs/rules.md#comments`](../../docs/rules.md#comments)が持つ。ここはその規約の
// 機械側で、規約の写しは置かない。

/**
 * 日本語の綴り 1 つと、その英語の対訳。
 *
 * @remarks
 * canonical の文書は英語で、ミラーは日本語で残るので、両方の綴りを持ちます。英語は日本語の
 * 1 対 1 の対訳に限ります —— 対訳を持たない英語を足すと、どの日本語の判断を写したのかが
 * 引けなくなります。`en` が空の綴りは、英語にすると前提ではない一般の語に当たるもの
 * （`boilerplate` という名詞そのもの）か、言語に依らない綴り（`BACKLOG`）です。
 */
export type PremisePhrase = {
  readonly ja: string;
  readonly en: readonly string[];
};

/** 前提の形 1 つと、それを示す語。 */
export type PremiseShape = {
  /** 報告に出す形の名前 */
  readonly name: string;
  /** なぜこの形が前提なのか。報告にそのまま出す */
  readonly why: string;
  /** 日本語の綴りと英語の対訳の組 */
  readonly pairs: readonly PremisePhrase[];
  /** 本文に現れたら前提とみなす綴り。{@link pairs} の両言語を重複なしに並べたもの */
  readonly phrases: readonly string[];
};

/**
 * 形の宣言から、走査に使う綴りを組む。
 *
 * @param shape - 名前・理由・綴りの組。
 * @returns {@link PremiseShape.phrases} を足した形。
 */
function declare(shape: Omit<PremiseShape, "phrases">): PremiseShape {
  const phrases = new Set(shape.pairs.flatMap((pair) => [pair.ja, ...pair.en]));

  return { ...shape, phrases: [...phrases] };
}

/**
 * 検出する前提の形。
 *
 * @remarks
 * **語を増やすほど誤検出が増えます。**ここに並ぶのは、その語が現れたら**ほぼ確実に**
 * テンプレートから作る前の状態を述べている綴りだけです。判断の要る言い回し（「現時点では」
 * 「まだ」、英語の `not yet` / `placeholder` / `provisional`）を入れないのは、決定の理由として
 * 正しく使われている場所が多く、**赤が日常になると検査そのものが読まれなくなる**ためです。
 */
export const PREMISE_SHAPES: readonly PremiseShape[] = [
  declare({
    name: "同梱サンプルの現存",
    why: "サンプルは破棄されて渡るので、複製された側では最初から在りません",
    pairs: [
      { ja: "同梱のサンプル", en: ["bundled sample"] },
      { ja: "同梱されたサンプル", en: ["bundled sample"] },
      {
        ja: "サンプルを同梱",
        en: ["bundles the sample", "bundles a sample", "bundle the sample", "bundle a sample"],
      },
      { ja: "サンプルが同梱", en: ["sample is bundled"] },
      { ja: "サンプル破棄まで", en: ["until the sample purge"] },
      { ja: "破棄するまでは", en: ["until it is purged"] },
    ],
  }),
  declare({
    name: "整備が途中であること",
    why: "受け取るのは完成した 1 つの状態で、そこへ至る作業の進み方は見えません",
    pairs: [
      { ja: "未整備", en: ["not yet in place"] },
      { ja: "整備中", en: ["under construction"] },
      { ja: "これから整備", en: ["yet to be set up"] },
      { ja: "順次同梱", en: ["bundled incrementally"] },
      { ja: "順次追加", en: ["added incrementally"] },
      { ja: "後続のリリース", en: ["a later release"] },
      { ja: "今後追加", en: ["to be added"] },
      { ja: "仮置き", en: ["placed provisionally", "provisionally placed"] },
    ],
  }),
  declare({
    name: "この木の在庫を根拠にした除外",
    why: "在庫は複製した側のものです。「ここにそれが無いから置かない」は、渡った先では読み手が現に持っているものについて「無い」と述べる文になります",
    pairs: [
      { ja: "設置面が無い", en: ["no installation surface"] },
      { ja: "設置面が存在しない", en: ["installation surface does not exist"] },
      { ja: "設置面が実在", en: ["installation surface exists"] },
      { ja: "設置面が現れ", en: ["installation surface appears"] },
      { ja: "本体に現れたとき", en: ["when it appears in the core"] },
      { ja: "本体に現れるまで", en: ["until it appears in the core"] },
      { ja: "実例を本体は持たない", en: ["the core has no instance"] },
    ],
  }),
  declare({
    name: "配る側の視点",
    why: "テンプレートから作った時点で、読み手自身がその「作った側」になります。三人称で指す記述はそこで宛先を失います",
    pairs: [
      { ja: "作った側", en: ["the creating side"] },
      { ja: "配る側", en: ["the distributing side"] },
      { ja: "テンプレートから作った", en: ["created from the template"] },
      { ja: "テンプレートから作られた", en: ["made from the template"] },
      { ja: "ボイラープレート", en: [] },
      { ja: "本 boilerplate", en: ["this boilerplate"] },
      { ja: "この boilerplate", en: ["this boilerplate"] },
      { ja: "boilerplate 本体", en: ["the boilerplate itself"] },
      { ja: " boilerplate が", en: [] },
      { ja: " boilerplate は", en: [] },
      { ja: "boilerplate 限定", en: [] },
    ],
  }),
  declare({
    name: "工程の文書への参照",
    why: "計画書と BACKLOG はこのリポジトリを作る工程の文書で、複製した側には渡りません。そこを指す参照は、渡った先で辿れません",
    pairs: [
      { ja: "docs/plan", en: [] },
      { ja: "BACKLOG", en: [] },
      { ja: "v1 実装計画", en: ["v1 implementation plan"] },
    ],
  }),
  declare({
    name: "私的な issue 番号への参照",
    why: "issue は複製した側へ渡らないので、番号は渡った先で別の issue を指すか、何も指しません",
    pairs: [{ ja: "triage #", en: [] }],
  }),
];

/**
 * 検出しない形。
 *
 * @remarks
 * **「いま何世代目か」は検出しません。**このリポジトリで版を前提にしている記述はどれも、
 * 同じ文書の中に**撤去の手順を持って**います（`v1.0.0 までの暫定運用` とその削除手順）。
 * 撤去条件つきの前提と、置き去りの前提を綴りで見分ける手立てが無い以上、両方を挙げると
 * 前者の量に後者が埋もれます。
 *
 * **未評価であることを黙らせないために、ここに宣言として残します**
 * 。撤去条件は、版を前提に
 * する記述に「いつ消すか」を機械が読める形で持たせたときです。
 */
export const UNCHECKED_SHAPES: readonly string[] = ["いま何世代目か（版を前提にした記述）"];
