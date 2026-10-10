/**
 * [実装規約](../../docs/rules.md)を読んで、[トレーサビリティ](../../docs/traceability.md)へ載せる
 * 集計を組む。
 *
 * 読むのは英語の canonical だけで、日本語のミラーは読まない。集計ブロックは同じデータから
 * canonical（英語）とミラー（日本語）の 2 つへ描く —— ミラーの生成ブロックを手で訳すと、
 * 次の生成で canonical だけが進んで、ミラーの件数が黙って古くなる。
 *
 * @remarks
 * 集計を手で書かない判断と、判定の綴りを 3 語へ閉じる判断は、[scripts](../README.md)「関連する ADR」
 * が持ちます。
 *
 * ここが機械で数えられるのは綴りが閉じているからです。**読めなかったものは数えずに
 * {@link RuleTally.violations} へ載せます** —— 読み飛ばすと、取りこぼした分だけ件数が小さく出て、
 * 集計が「守られている」向きに倒れます。載せる先は綴りだけではなく、錨と節の対応・要旨の閉じ方・
 * 判定の置き場所も同じです。
 */

/** 判定の綴り。この 3 語の外は数えない。 */
const VERDICTS = ["not mechanizable", "partly mechanizable", "mechanizable"] as const;

type Verdict = (typeof VERDICTS)[number];

/** 節の見出し。 */
const HEADING = /^## (.+)$/;

/** 見出しの直前に置く錨。 */
const ANCHOR = /^<a id="([^"]+)"><\/a>$/;

/** 節頭の根拠。`enforced via` を持つものだけが「その節を機械が見ている」と述べている。 */
const RATIONALE = /^> Rationale:.*enforced via/;

/** 規約の箇条書き。要旨は最初の強調に入っている。 */
const RULE = /^- \*\*(.+?)\*\*/;

/** 規約の書き出し。{@link RULE} に一致しないものは、要旨がその行で閉じていない。 */
const RULE_OPENING = "- **";

/** コードフェンスの開閉。 */
const FENCE = /^\s*(```|~~~)/;

/** 判定の前置き。判定の語はこの直後の強調に入る。 */
const VERDICT_PREFIX = "Prose — **";

const ESCAPED_VERDICT_PREFIX = VERDICT_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** 規約が自分で述べる判定。前置きは {@link VERDICT_PREFIX} を逃がして組む —— 綴りの出所は 1 つ。 */
const VERDICT = new RegExp(String.raw`(?<=${ESCAPED_VERDICT_PREFIX})[^*]+(?=\*\*)`, "g");

/** 集計の埋め込み先を挟む印。 */
const BLOCK = /<!-- generated: rules-tally -->[\s\S]*?<!-- \/generated: rules-tally -->/;

/** 判定を自分で述べた規約 1 件。 */
interface JudgedRule {
  /** 属する節の錨。指す側はこれを使う。 */
  readonly anchor: string;
  /** 属する節の見出し。 */
  readonly section: string;
  /** 規約の要旨（箇条書きの最初の強調）。**識別子ではない** —— 言い換えれば変わる。 */
  readonly summary: string;
  /** 3 語のどれを述べたか。 */
  readonly verdict: Verdict;
}

/** `rules.md` から数えた結果。 */
export interface RuleTally {
  /** 節の数。 */
  readonly sections: number;
  /** 節頭で機械の手段を名乗った節の数。 */
  readonly enforcedSections: number;
  /** 規約の数。 */
  readonly rules: number;
  /** 判定を自分で述べた規約。 */
  readonly judged: readonly JudgedRule[];
  /** 数えられなかったもの。1 件でも在れば集計は成り立たない。 */
  readonly violations: readonly string[];
}

/** 節 1 つの範囲。 */
interface SectionChunk {
  readonly anchor: string;
  readonly title: string;
  readonly body: string[];
}

/** 規約 1 件の範囲。判定は本文のどこにでも書けるので、次の規約までを 1 つに持つ。 */
interface RuleChunk {
  readonly summary: string;
  readonly lines: string[];
}

/**
 * コードフェンスの中を落とす。
 *
 * @param markdown - `docs/rules.md` の中身。
 * @returns フェンスの外に在る行だけ。
 */
function withoutFences(markdown: string): string[] {
  const lines: string[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (!inFence) lines.push(line);
  }

  return lines;
}

/**
 * 節が名乗る錨を確かめる。
 *
 * @param anchor - 見出しの直前に在った錨。無ければ `null`。
 * @param title - 節の見出し。
 * @param seen - ここまでに使われた錨。
 * @param violations - 読めなかったものの置き場。
 * @returns その節の錨。名乗れていなければ空。
 */
function acceptAnchor(
  anchor: string | null,
  title: string,
  seen: Set<string>,
  violations: string[],
): string {
  if (anchor === null) {
    violations.push(`節が錨を持たない: 「${title}」`);
    return "";
  }

  if (seen.has(anchor)) violations.push(`錨が重複している: 「${anchor}」`);
  else seen.add(anchor);

  return anchor;
}

/**
 * 行を節へ割る。
 *
 * @param lines - フェンスの外の行。
 * @param violations - 読めなかったものの置き場。
 * @returns 文書に現れた順の節。
 */
function splitSections(lines: readonly string[], violations: string[]): SectionChunk[] {
  const sections: SectionChunk[] = [];
  const seen = new Set<string>();
  let anchor: string | null = null;

  for (const line of lines) {
    const found = ANCHOR.exec(line)?.[1];

    if (found !== undefined) {
      if (anchor !== null) violations.push(`錨が節へ対応していない: 「${anchor}」`);

      anchor = found;
      continue;
    }

    const title = HEADING.exec(line)?.[1];

    if (title === undefined) {
      sections.at(-1)?.body.push(line);
      continue;
    }

    sections.push({ anchor: acceptAnchor(anchor, title, seen, violations), body: [], title });
    anchor = null;
  }

  if (anchor !== null) violations.push(`錨が節へ対応していない: 「${anchor}」`);

  return sections;
}

/**
 * 節頭の根拠を数える。
 *
 * @param section - 数える節。
 * @param violations - 読めなかったものの置き場。
 * @returns その節が機械の手段を名乗っていれば 1、名乗っていなければ 0。
 */
function countRationale(section: SectionChunk, violations: string[]): number {
  const found = section.body.filter((line) => RATIONALE.test(line)).length;

  if (found > 1) violations.push(`節頭の根拠が ${found} つある: 「${section.title}」`);

  return found > 0 ? 1 : 0;
}

/**
 * 規約の外に書かれた判定を報告する。
 *
 * @param line - 規約に属さない行。
 * @param title - その行が居る節の見出し。
 * @param violations - 読めなかったものの置き場。
 */
function reportLooseVerdicts(line: string, title: string, violations: string[]): void {
  for (const [spelling] of line.matchAll(VERDICT)) {
    violations.push(`判定が規約の外にある: 「${spelling}」（${title}）`);
  }
}

/**
 * 節の本文を規約へ割る。
 *
 * @param section - 割る節。
 * @param violations - 読めなかったものの置き場。
 * @returns 節に現れた順の規約。
 */
function splitRules(section: SectionChunk, violations: string[]): RuleChunk[] {
  const chunks: RuleChunk[] = [];

  for (const line of section.body) {
    if (RATIONALE.test(line)) continue;

    const summary = RULE.exec(line)?.[1];

    if (summary !== undefined) {
      chunks.push({ lines: [line], summary });
      continue;
    }

    if (line.startsWith(RULE_OPENING)) {
      violations.push(`規約の要旨がその行で閉じていない: 「${line.trim()}」`);
    }

    const open = chunks.at(-1);

    if (open === undefined) {
      reportLooseVerdicts(line, section.title, violations);
      continue;
    }

    open.lines.push(line);
  }

  return chunks;
}

/**
 * 規約 1 件の判定を読む。
 *
 * @param chunk - 読む規約。
 * @param section - その規約が居る節。
 * @param violations - 読めなかったものの置き場。
 * @returns judged へ載せる 1 件。判定が無い・読めない規約は `null`。
 */
function judge(chunk: RuleChunk, section: SectionChunk, violations: string[]): JudgedRule | null {
  const spellings = [...chunk.lines.join("\n").matchAll(VERDICT)].map(([word]) => word);

  if (spellings.length > 1) {
    violations.push(`1 つの規約が判定を ${spellings.length} つ述べている: 「${chunk.summary}」`);
    return null;
  }

  const [spelling] = spellings;

  if (spelling === undefined) return null;

  const verdict = VERDICTS.find((known) => known === spelling);

  if (verdict === undefined) {
    violations.push(`判定の綴りが 3 語の外: 「${spelling}」（${chunk.summary}）`);
    return null;
  }

  return { anchor: section.anchor, section: section.title, summary: chunk.summary, verdict };
}

/**
 * 判定の前置きを持つ行を数える。
 *
 * @remarks
 * {@link collectRuleTally} と同じ行を見る —— フェンスの外で、節頭の根拠を除いた行。判定の語の
 * 綴りとは別に前置きだけで数えるので、読めた判定の数と突き合わせれば、綴りの変更で判定だけが
 * 0 件へ縮んだことが分かる。
 *
 * @param markdown - `docs/rules.md` の中身。
 * @returns 前置きを含む行の数。
 */
export function countVerdictPrefixedLines(markdown: string): number {
  return withoutFences(markdown).filter(
    (line) => !RATIONALE.test(line) && line.includes(VERDICT_PREFIX),
  ).length;
}

/**
 * 実装規約を数える。
 *
 * @param markdown - `docs/rules.md` の中身。
 * @returns 節と規約の数、判定を述べた規約、そして数えられなかったものの一覧。
 */
export function collectRuleTally(markdown: string): RuleTally {
  const violations: string[] = [];
  const judged: JudgedRule[] = [];
  const sections = splitSections(withoutFences(markdown), violations);

  let enforcedSections = 0;
  let rules = 0;

  for (const section of sections) {
    enforcedSections += countRationale(section, violations);

    for (const chunk of splitRules(section, violations)) {
      rules += 1;

      const rule = judge(chunk, section, violations);

      if (rule !== null) judged.push(rule);
    }
  }

  return { enforcedSections, judged, rules, sections: sections.length, violations };
}

/**
 * 規約の文言を、表のセルへ入れられる形にする。
 *
 * @param text - `rules.md` から取った文言。
 * @returns パイプを逃がした文言。
 */
function cell(text: string): string {
  return text.replaceAll("|", String.raw`\|`);
}

/** 集計ブロックを描く言語。`en` は canonical、`ja` はそのミラーへ貼る。 */
export type TallyLanguage = "en" | "ja";

/** 1 つの言語で集計ブロックを描くための文言。 */
interface TallyWording {
  /** 判定の語の表示。 */
  readonly verdicts: Readonly<Record<Verdict, string>>;
  /** 規約の行から節へ張るリンクの指し先。 */
  readonly rulesFile: string;
  /** 節と規約の数を述べる 1 行目。 */
  readonly totals: (tally: RuleTally) => string;
  /** 節頭の手段と判定の数を述べる 2 行目。 */
  readonly breakdown: (tally: RuleTally) => string;
  /** 判定ごとの件数の表の見出し行。 */
  readonly countHeader: string;
  /** 仕事が残っている規約の一覧の見出し。 */
  readonly pendingHeading: (pending: number) => string;
  /** 仕事が残っている規約の表の見出し行。 */
  readonly pendingHeader: string;
}

/**
 * 英語の件数を、数に合わせた形で述べる。
 *
 * @param n - 件数。
 * @param singular - 1 件のときの語（後続の動詞まで含めてよい）。
 * @param plural - それ以外のときの語。
 * @returns 件数と語を空白で繋いだもの。
 */
function quantity(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** 言語ごとの文言。ミラーの側は、canonical の訳でありながら生成器だけが書く。 */
const WORDINGS: Readonly<Record<TallyLanguage, TallyWording>> = {
  en: {
    verdicts: {
      "not mechanizable": "not mechanizable",
      "partly mechanizable": "partly mechanizable",
      mechanizable: "mechanizable",
    },
    rulesFile: "rules.md",
    totals: (tally) =>
      `**${quantity(tally.sections, "section", "sections")}, ` +
      `${quantity(tally.rules, "rule", "rules")}.**`,
    breakdown: (tally) =>
      `Of these, ${quantity(tally.enforcedSections, "section names", "sections name")} ` +
      `a mechanical means in ${tally.enforcedSections === 1 ? "its" : "their"} header, and ` +
      `${quantity(tally.judged.length, "rule states its", "rules state their")} own verdict.`,
    countHeader: "| Verdict | Count |",
    pendingHeading: (pending) => `### ${quantity(pending, "rule", "rules")} with work remaining`,
    pendingHeader: "| Section | Rule | Verdict |",
  },
  ja: {
    verdicts: {
      "not mechanizable": "寄せられない",
      "partly mechanizable": "一部寄せられる",
      mechanizable: "寄せられる",
    },
    rulesFile: "rules.ja.md",
    totals: (tally) => `**セクションが ${tally.sections}、規約が ${tally.rules} 件。**`,
    breakdown: (tally) =>
      `うち ${tally.enforcedSections} セクションがセクション冒頭で機械の手段を名乗り、` +
      `${tally.judged.length} 件の規約が自分で判定を述べる。`,
    countHeader: "| 判定 | 件数 |",
    pendingHeading: (pending) => `### 仕事が残っている ${pending} 件`,
    pendingHeader: "| セクション | 規約 | 判定 |",
  },
};

/**
 * 集計を、トレーサビリティへ貼る Markdown へ組む。
 *
 * @param tally - {@link collectRuleTally} が数えた結果。
 * @param language - 描く言語。canonical へ貼るなら `en`、ミラーへ貼るなら `ja`。
 * @returns 印を含む生成ブロック。
 * @throws 数えられなかったものが在るとき。取りこぼしたまま件数だけ出すと、集計が小さく出る。
 *
 * @remarks
 * 節の見出しと規約の要旨は canonical から取ったまま描く。ミラーの側で訳すのは、生成器が持つ
 * 固定の文言と判定の語だけである。
 */
export function renderRuleTally(tally: RuleTally, language: TallyLanguage): string {
  if (tally.violations.length > 0) {
    throw new Error(`実装規約を数えられません:\n- ${tally.violations.join("\n- ")}`);
  }

  const wording = WORDINGS[language];
  const counts = VERDICTS.map((verdict) => {
    const count = tally.judged.filter((rule) => rule.verdict === verdict).length;

    return `| ${wording.verdicts[verdict]} | ${count} |`;
  });
  const pending = tally.judged.filter((rule) => rule.verdict !== "not mechanizable");
  const rows = pending.map(
    (rule) =>
      `| [${cell(rule.section)}](${wording.rulesFile}#${rule.anchor}) | ${cell(rule.summary)} | ` +
      `${wording.verdicts[rule.verdict]} |`,
  );

  return [
    "<!-- generated: rules-tally -->",
    "",
    wording.totals(tally),
    wording.breakdown(tally),
    "",
    wording.countHeader,
    "| --- | --- |",
    ...counts,
    "",
    wording.pendingHeading(pending.length),
    "",
    wording.pendingHeader,
    "| --- | --- | --- |",
    ...rows,
    "",
    "<!-- /generated: rules-tally -->",
  ].join("\n");
}

/**
 * 生成ブロックを差し替える。
 *
 * @param document - 貼り付け先の中身。
 * @param block - {@link renderRuleTally} が組んだブロック。
 * @returns 差し替えた中身。
 * @throws 貼り付け先が印を持たないとき。黙って何もしないと、生成したつもりで古い本文が残る。
 */
export function replaceGeneratedBlock(document: string, block: string): string {
  if (!BLOCK.test(document)) throw new Error("貼り付け先が rules-tally の印を持ちません。");

  return document.replace(BLOCK, block);
}

/** 集計ブロックの貼り付け先 1 つ。 */
export interface TallyTarget {
  /** リポジトリのルートからのパス。 */
  readonly path: string;
  /** そこへ描く言語。 */
  readonly language: TallyLanguage;
}

/** 集計ブロックの貼り付け先。canonical とそのミラーへ、同じ集計を各言語で書く。 */
export const TALLY_TARGETS: readonly TallyTarget[] = [
  { language: "en", path: "docs/traceability.md" },
  { language: "ja", path: "docs/traceability.ja.md" },
];

/**
 * 欠けている貼り付け先を挙げる。
 *
 * @remarks
 * ミラーも canonical と同じく在るべきもので、片方だけ書き出すと 2 つの集計が黙ってずれる。
 * 呼び出し側は、これが空でなければ何も書かずに落とす。
 *
 * @param targets - 貼り付け先。
 * @param exists - パスが在るかを答える関数。
 * @returns 欠けている貼り付け先のパス。渡した順。
 */
export function missingTargets(
  targets: readonly TallyTarget[],
  exists: (path: string) => boolean,
): string[] {
  return targets.filter(({ path }) => !exists(path)).map(({ path }) => path);
}
