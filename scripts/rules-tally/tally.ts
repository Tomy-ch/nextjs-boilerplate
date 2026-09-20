/**
 * [実装規約](../../docs/rules.md)を読んで、[トレーサビリティ](../../docs/traceability.md)へ載せる
 * 集計を組む。
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
const VERDICTS = ["寄せられない", "一部寄せられる", "寄せられる"] as const;

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

/** 規約が自分で述べる判定。 */
const VERDICT = /(?<=散文 —— \*\*)[^*]+(?=\*\*)/g;

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

/**
 * 集計を、トレーサビリティへ貼る Markdown へ組む。
 *
 * @param tally - {@link collectRuleTally} が数えた結果。
 * @returns 印を含む生成ブロック。
 * @throws 数えられなかったものが在るとき。取りこぼしたまま件数だけ出すと、集計が小さく出る。
 */
export function renderRuleTally(tally: RuleTally): string {
  if (tally.violations.length > 0) {
    throw new Error(`実装規約を数えられません:\n- ${tally.violations.join("\n- ")}`);
  }

  const counts = VERDICTS.map(
    (verdict) => `| ${verdict} | ${tally.judged.filter((r) => r.verdict === verdict).length} |`,
  );
  const pending = tally.judged.filter((rule) => rule.verdict !== "寄せられない");
  const rows = pending.map(
    (rule) =>
      `| [${cell(rule.section)}](rules.md#${rule.anchor}) | ${cell(rule.summary)} | ${rule.verdict} |`,
  );

  return [
    "<!-- generated: rules-tally -->",
    "",
    `**節が ${tally.sections}、規約が ${tally.rules} 件。**`,
    `うち ${tally.enforcedSections} 節が節頭で機械の手段を名乗り、` +
      `${tally.judged.length} 件の規約が自分で判定を述べる。`,
    "",
    "| 判定 | 件数 |",
    "| --- | --- |",
    ...counts,
    "",
    `### 仕事が残っている ${pending.length} 件`,
    "",
    "| 節 | 規約 | 判定 |",
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
